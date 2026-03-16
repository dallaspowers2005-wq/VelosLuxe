require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const { createClient } = require('@supabase/supabase-js');
const { sendSMS, sendFollowUpSMS } = require('./lib/sms');
const reminders = require('./lib/reminders');

const app = express();
const PORT = process.env.PORT || 3000;

// Spaceship CRM Supabase client
const spaceship = createClient(
  process.env.SPACESHIP_SUPABASE_URL,
  process.env.SPACESHIP_SUPABASE_KEY
);

async function pushToSpaceship(lead) {
  try {
    const { data, error } = await spaceship.from('leads').insert({
      business_name: lead.spa_name || 'VelosLuxe Lead',
      contact_name: lead.name,
      email: lead.email || null,
      phone: lead.phone || null,
      source: 'VelosLuxe',
      industry: 'Medical Spa',
      status: 'new',
      notes: lead.notes || null,
      metadata: { origin: 'velosluxe', original_source: lead.source || 'demo_form' }
    }).select().single();

    if (error) {
      console.error('Spaceship CRM sync error:', error.message);
    } else {
      console.log('Lead synced to Spaceship CRM:', data.id);
    }
  } catch (err) {
    console.error('Spaceship CRM sync failed:', err.message);
  }
}

// Middleware
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://velosluxe.com', 'https://www.velosluxe.com']
  : ['http://localhost:3000'];
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Admin auth middleware
function requireAdminKey(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (!process.env.ADMIN_KEY) return next(); // skip if not configured
  if (key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
app.use('/api/admin', requireAdminKey);

// ═══ DATABASE SETUP ═══
const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir);
const DB_PATH = path.join(dbDir, 'velosluxe.db');

let db;

function saveDb() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function runQuery(sql, params = []) {
  db.run(sql, params);
  saveDb();
}

function getAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function getOne(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row;
}

function insertAndGetId(sql, params = []) {
  db.run(sql, params);
  const id = db.exec("SELECT last_insert_rowid() as id")[0].values[0][0];
  saveDb();
  return id;
}

async function startServer() {
  const SQL = await initSqlJs();

  // Load existing DB or create new
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      spa_name TEXT,
      source TEXT DEFAULT 'demo_form',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      source TEXT DEFAULT 'call_receptionist',
      status TEXT DEFAULT 'requested',
      vapi_call_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      google_event_id TEXT,
      status TEXT DEFAULT 'confirmed',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER,
      phone TEXT NOT NULL,
      message TEXT NOT NULL,
      send_at TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS blocked_times (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      reason TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  saveDb();

  // DB helpers for modules
  const dbHelpers = {
    getBookingsForDate(dateStr) {
      return getAll(
        "SELECT * FROM bookings WHERE status = 'confirmed' AND start_time LIKE ?",
        [dateStr + '%']
      );
    },
    insertBooking(booking) {
      return insertAndGetId(
        'INSERT INTO bookings (name, email, phone, start_time, end_time, google_event_id) VALUES (?, ?, ?, ?, ?, ?)',
        [booking.name, booking.email || null, booking.phone, booking.start_time, booking.end_time, booking.google_event_id || null]
      );
    },
    insertReminder(bookingId, phone, message, sendAt) {
      runQuery(
        'INSERT INTO reminders (booking_id, phone, message, send_at) VALUES (?, ?, ?, ?)',
        [bookingId, phone, message, sendAt]
      );
    },
    getDueReminders() {
      return getAll(
        "SELECT * FROM reminders WHERE status = 'pending' AND send_at <= datetime('now')"
      );
    },
    updateReminderStatus(id, status) {
      runQuery('UPDATE reminders SET status = ? WHERE id = ?', [status, id]);
    },
    cleanupOldReminders(days) {
      runQuery(
        "DELETE FROM reminders WHERE status IN ('sent', 'failed') AND created_at < datetime('now', ?)",
        ['-' + days + ' days']
      );
    },
    getAllBookings(limit) {
      let q = "SELECT * FROM bookings ORDER BY start_time DESC";
      const p = [];
      if (limit) { q += ' LIMIT ?'; p.push(parseInt(limit)); }
      return getAll(q, p);
    },
    getBlockedTimesForDate(dateStr) {
      return getAll(
        "SELECT * FROM blocked_times WHERE start_time LIKE ? OR end_time LIKE ?",
        [dateStr + '%', dateStr + '%']
      );
    },
    insertBlockedTime(startTime, endTime, reason) {
      return insertAndGetId(
        'INSERT INTO blocked_times (start_time, end_time, reason) VALUES (?, ?, ?)',
        [startTime, endTime, reason || null]
      );
    }
  };

  // Local availability function (replaces Google Calendar)
  function getAvailableSlots(dateStr) {
    const startHour = parseInt(process.env.BOOKING_START_HOUR || '9');
    const endHour = parseInt(process.env.BOOKING_END_HOUR || '17');
    const slotMinutes = parseInt(process.env.BOOKING_SLOT_DURATION || '30');

    // Generate candidate slots
    const slots = [];
    for (let h = startHour; h < endHour; h++) {
      for (let m = 0; m < 60; m += slotMinutes) {
        const endM = m + slotMinutes;
        const endSlotH = h + Math.floor(endM / 60);
        const endSlotM = endM % 60;
        if (endSlotH > endHour || (endSlotH === endHour && endSlotM > 0)) break;

        const start = `${dateStr}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
        const end = `${dateStr}T${String(endSlotH).padStart(2, '0')}:${String(endSlotM).padStart(2, '0')}:00`;
        slots.push({ start, end });
      }
    }

    // Get confirmed bookings and blocked times for this date
    const bookings = dbHelpers.getBookingsForDate(dateStr);
    const blockedTimes = dbHelpers.getBlockedTimesForDate(dateStr);

    // Combine all busy periods
    const busyPeriods = [
      ...bookings.map(b => ({ start: b.start_time, end: b.end_time })),
      ...blockedTimes.map(b => ({ start: b.start_time, end: b.end_time }))
    ];

    // Filter out overlapping slots
    const available = slots.filter(slot => {
      return !busyPeriods.some(busy => slot.start < busy.end && slot.end > busy.start);
    });

    // If today, filter out past slots
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    if (dateStr === todayStr) {
      const tz = process.env.BOOKING_TIMEZONE || 'America/New_York';
      const nowInTz = new Date(now.toLocaleString('en-US', { timeZone: tz }));
      const nowTime = `${String(nowInTz.getHours()).padStart(2, '0')}:${String(nowInTz.getMinutes()).padStart(2, '0')}`;
      return available.filter(slot => slot.start.slice(11, 16) > nowTime);
    }

    return available;
  }

  // Initialize modules with DB access
  reminders.init(dbHelpers);

  // ═══ PUBLIC API ROUTES ═══

  // POST /api/leads — capture demo form lead
  app.post('/api/leads', (req, res) => {
    const { name, email, spa_name, source } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const id = insertAndGetId(
      'INSERT INTO leads (name, email, spa_name, source) VALUES (?, ?, ?, ?)',
      [name, email || null, spa_name || null, source || 'demo_form']
    );

    // Sync to Spaceship CRM
    pushToSpaceship({ name, email, spa_name, source });

    res.json({ success: true, id });
  });

  // POST /api/call — trigger Vapi outbound call
  app.post('/api/call', async (req, res) => {
    const { name, phone } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'Name and phone are required' });

    const callId = insertAndGetId(
      'INSERT INTO calls (name, phone, source) VALUES (?, ?, ?)',
      [name, phone, 'call_receptionist']
    );

    try {
      const vapiRes = await fetch('https://api.vapi.ai/call/phone', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          assistantId: process.env.VAPI_ASSISTANT_ID,
          phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
          customer: { number: phone, name }
        })
      });

      const vapiData = await vapiRes.json();
      if (vapiRes.ok) {
        runQuery('UPDATE calls SET status = ?, vapi_call_id = ? WHERE id = ?',
          ['initiated', vapiData.id || null, callId]);
        res.json({ success: true, callId, vapiCallId: vapiData.id });
      } else {
        runQuery('UPDATE calls SET status = ? WHERE id = ?', ['failed', callId]);
        res.json({ success: false, error: vapiData.message || 'Vapi call failed' });
      }
    } catch (err) {
      runQuery('UPDATE calls SET status = ? WHERE id = ?', ['error', callId]);
      res.json({ success: false, error: err.message });
    }
  });

  // GET /api/vapi-token — return assistant config for web SDK
  app.get('/api/vapi-token', (req, res) => {
    res.json({
      apiKey: process.env.VAPI_API_KEY,
      assistantId: process.env.VAPI_ASSISTANT_ID
    });
  });

  // ═══ VAPI WEBHOOK — AUTO-CAPTURE CALLS ═══
  app.post('/api/vapi/webhook', async (req, res) => {
    const payload = req.body;
    const msgType = payload.message?.type;
    console.log('Vapi webhook received:', msgType);

    if (msgType === 'end-of-call-report') {
      const call = payload.message;
      const phone = call.customer?.number || null;
      const name = call.customer?.name || null;
      const duration = call.durationSeconds || null;
      const callId = call.call?.id || null;
      const summary = call.summary || null;
      const transcript = call.transcript || '';

      // Try to extract caller's name from transcript
      let callerName = name;
      if (!callerName && transcript) {
        const nameMatch = transcript.match(/(?:my name is|this is|I'm|i am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
        if (nameMatch) callerName = nameMatch[1];
      }

      console.log(`Call ended — Phone: ${phone}, Name: ${callerName}, Duration: ${duration}s`);

      // Build rich notes
      const noteParts = [
        `Spoke with AI receptionist Sophia via VelosLuxe website`,
        callerName ? `Caller: ${callerName}` : null,
        `Duration: ${duration ? duration + 's' : 'unknown'}`,
        summary ? `AI Summary: ${summary}` : null,
      ].filter(Boolean);
      const notes = noteParts.join('\n');

      // Log to local DB
      if (phone) {
        insertAndGetId(
          'INSERT INTO calls (name, phone, source, status, vapi_call_id) VALUES (?, ?, ?, ?, ?)',
          [callerName || 'Inbound Caller', phone, 'vapi_webhook', 'completed', callId]
        );
      }

      // Sync to Spaceship CRM (deduplicate by phone)
      if (phone) {
        const { data: existing } = await spaceship.from('leads')
          .select('id')
          .eq('phone', phone)
          .eq('source', 'VelosLuxe')
          .limit(1)
          .maybeSingle();

        if (!existing) {
          await pushToSpaceship({
            name: callerName || 'Website Caller',
            phone,
            source: 'inbound_call',
            notes
          });

          // Send SMS follow-up to new callers
          await sendFollowUpSMS(phone, callerName);
        }
      }
    }

    // Vapi expects a 200 response
    res.json({ ok: true });
  });

  // ═══ BOOKING API ROUTES ═══

  // GET available slots for a date
  app.get('/api/booking/slots', async (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Date parameter required (YYYY-MM-DD)' });

    // Validate date is within allowed range
    const maxDays = parseInt(process.env.BOOKING_DAYS_AHEAD || '14');
    const requestedDate = new Date(date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today.getTime() + maxDays * 86400000);

    if (requestedDate < today) return res.json({ slots: [] });
    if (requestedDate > maxDate) return res.json({ slots: [] });

    // Skip weekends
    const day = requestedDate.getDay();
    if (day === 0 || day === 6) return res.json({ slots: [] });

    const slots = getAvailableSlots(date);
    res.json({ slots });
  });

  // POST create a booking
  app.post('/api/booking', async (req, res) => {
    const { name, phone, email, start, end } = req.body;
    if (!name || !phone || !start || !end) {
      return res.status(400).json({ error: 'Name, phone, start, and end are required' });
    }

    try {
      // Insert booking
      const bookingId = dbHelpers.insertBooking({
        name, email, phone,
        start_time: start,
        end_time: end
      });

      const booking = { id: bookingId, name, email, phone, start_time: start, end_time: end };

      // Send immediate confirmation SMS
      await reminders.sendConfirmation(booking);

      // Schedule future reminders (24h, 1h, 15min)
      reminders.scheduleReminders(booking);

      // Sync to Spaceship CRM
      pushToSpaceship({
        name,
        email,
        phone,
        source: 'booking',
        notes: `Booked strategy call for ${start}`
      });

      res.json({ success: true, bookingId });
    } catch (err) {
      console.error('Booking error:', err.message);
      res.status(500).json({ error: 'Booking failed' });
    }
  });

  // ═══ ADMIN API ROUTES ═══

  app.get('/api/admin/stats', (req, res) => {
    const totalLeads = getOne('SELECT COUNT(*) as count FROM leads').count;
    const totalCalls = getOne('SELECT COUNT(*) as count FROM calls').count;
    const leadsToday = getOne("SELECT COUNT(*) as count FROM leads WHERE date(created_at) = date('now')").count;
    const callsToday = getOne("SELECT COUNT(*) as count FROM calls WHERE date(created_at) = date('now')").count;
    res.json({ totalLeads, totalCalls, leadsToday, callsToday });
  });

  app.get('/api/admin/leads', (req, res) => {
    const { source, limit } = req.query;
    let query = 'SELECT * FROM leads';
    const params = [];
    if (source) {
      query += ' WHERE source = ?';
      params.push(source);
    }
    query += ' ORDER BY created_at DESC';
    if (limit) {
      query += ' LIMIT ?';
      params.push(parseInt(limit));
    }
    res.json(getAll(query, params));
  });

  app.get('/api/admin/calls', (req, res) => {
    const { limit } = req.query;
    let query = 'SELECT * FROM calls ORDER BY created_at DESC';
    const params = [];
    if (limit) {
      query += ' LIMIT ?';
      params.push(parseInt(limit));
    }
    res.json(getAll(query, params));
  });

  app.delete('/api/admin/leads/:id', (req, res) => {
    runQuery('DELETE FROM leads WHERE id = ?', [parseInt(req.params.id)]);
    res.json({ success: true });
  });

  app.get('/api/admin/bookings', (req, res) => {
    res.json(dbHelpers.getAllBookings(req.query.limit));
  });

  app.post('/api/admin/block-time', (req, res) => {
    const { start, end, reason } = req.body;
    if (!start || !end) return res.status(400).json({ error: 'start and end are required' });
    const id = dbHelpers.insertBlockedTime(start, end, reason);
    res.json({ success: true, id });
  });

  app.post('/api/admin/test-call', async (req, res) => {
    const { name, phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number is required' });

    try {
      const vapiRes = await fetch('https://api.vapi.ai/call/phone', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          assistantId: process.env.VAPI_ASSISTANT_ID,
          phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
          customer: { number: phone, name: name || 'Test User' }
        })
      });

      const vapiData = await vapiRes.json();
      if (vapiRes.ok) {
        insertAndGetId(
          'INSERT INTO calls (name, phone, source, status, vapi_call_id) VALUES (?, ?, ?, ?, ?)',
          [name || 'Test User', phone, 'admin_test', 'initiated', vapiData.id || null]
        );
        res.json({ success: true, vapiCallId: vapiData.id });
      } else {
        res.json({ success: false, error: vapiData.message || 'Vapi call failed' });
      }
    } catch (err) {
      res.json({ success: false, error: err.message });
    }
  });

  // ═══ VAPI CALL LOG — PULL FROM VAPI API ═══
  app.get('/api/admin/vapi-calls', async (req, res) => {
    try {
      const limit = req.query.limit || 50;
      const vapiRes = await fetch(`https://api.vapi.ai/call?limit=${limit}`, {
        headers: { 'Authorization': `Bearer ${process.env.VAPI_API_KEY}` }
      });
      const calls = await vapiRes.json();

      const formatted = calls.map(c => ({
        id: c.id,
        phone: c.customer?.number || null,
        name: c.customer?.name || null,
        type: c.type,
        status: c.status,
        startedAt: c.startedAt,
        endedAt: c.endedAt,
        duration: c.startedAt && c.endedAt
          ? Math.round((new Date(c.endedAt) - new Date(c.startedAt)) / 1000)
          : null
      }));

      // Sync callers with phone numbers to Spaceship CRM
      for (const call of formatted) {
        if (call.phone) {
          // Check if this phone already exists in Spaceship
          const { data: existing } = await spaceship.from('leads')
            .select('id')
            .eq('phone', call.phone)
            .eq('source', 'VelosLuxe')
            .limit(1)
            .maybeSingle();

          if (!existing) {
            pushToSpaceship({
              name: call.name || 'Website Caller',
              phone: call.phone,
              source: 'inbound_call'
            });
          }
        }
      }

      res.json(formatted);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ═══ SERVE STATIC FILES ═══
  app.use('/admin', express.static(path.join(__dirname, 'admin')));
  app.use(express.static(path.join(__dirname, 'public')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  // ═══ AUTO-SYNC: POLL VAPI FOR NEW CALLS ═══
  const syncedCallIds = new Set();

  async function pollVapiCalls() {
    try {
      const vapiRes = await fetch('https://api.vapi.ai/call?limit=20', {
        headers: { 'Authorization': `Bearer ${process.env.VAPI_API_KEY}` }
      });
      const calls = await vapiRes.json();
      if (!Array.isArray(calls)) return;

      for (const c of calls) {
        if (syncedCallIds.has(c.id)) continue;
        if (c.status !== 'ended') continue;

        const phone = c.customer?.number || null;
        const name = c.customer?.name || null;
        const summary = c.summary || '';
        const transcript = c.transcript || '';
        const duration = c.startedAt && c.endedAt
          ? Math.round((new Date(c.endedAt) - new Date(c.startedAt)) / 1000)
          : null;
        const callType = c.type === 'inboundPhoneCall' ? 'Inbound call' : c.type === 'webCall' ? 'Browser call' : 'Call';

        // Try to extract caller's name from transcript if not in customer data
        let callerName = name;
        if (!callerName && transcript) {
          const nameMatch = transcript.match(/(?:my name is|this is|I'm|i am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
          if (nameMatch) callerName = nameMatch[1];
        }

        if (!phone) { syncedCallIds.add(c.id); continue; }

        // Build rich notes for Spaceship
        const noteParts = [
          `Spoke with AI receptionist Sophia via VelosLuxe website`,
          callerName ? `Caller: ${callerName}` : null,
          `${callType} — ${duration ? duration + 's' : 'unknown duration'}`,
          summary ? `AI Summary: ${summary}` : null,
        ].filter(Boolean);
        const notes = noteParts.join('\n');

        // Check if already in Spaceship
        const { data: existing } = await spaceship.from('leads')
          .select('id')
          .eq('phone', phone)
          .eq('source', 'VelosLuxe')
          .limit(1)
          .maybeSingle();

        if (!existing) {
          console.log(`New caller detected: ${phone} (${callerName || 'unknown'})`);
          await pushToSpaceship({
            name: callerName || 'Website Caller',
            phone,
            source: 'inbound_call',
            notes
          });

          // Send SMS follow-up
          await sendFollowUpSMS(phone, callerName);
        }

        // Log locally if not already there
        const localExisting = getOne('SELECT id FROM calls WHERE vapi_call_id = ?', [c.id]);
        if (!localExisting) {
          const duration = c.startedAt && c.endedAt
            ? Math.round((new Date(c.endedAt) - new Date(c.startedAt)) / 1000)
            : null;
          insertAndGetId(
            'INSERT INTO calls (name, phone, source, status, vapi_call_id) VALUES (?, ?, ?, ?, ?)',
            [name || 'Inbound Caller', phone, 'vapi_poll', 'completed', c.id]
          );
          console.log(`Call logged: ${c.id} — ${phone} — ${duration}s`);
        }

        syncedCallIds.add(c.id);
      }
    } catch (err) {
      console.error('Vapi poll error:', err.message);
    }
  }

  // Poll every 60 seconds
  pollVapiCalls(); // Initial sync on startup
  setInterval(pollVapiCalls, 60000);

  // Start SMS reminder scheduler
  reminders.startReminderLoop();

  // ═══ START SERVER ═══
  app.listen(PORT, () => {
    console.log(`VelosLuxe server running at http://localhost:${PORT}`);
    console.log(`Admin dashboard at http://localhost:${PORT}/admin`);
    console.log('Auto-syncing Vapi calls every 60s → Spaceship CRM + SMS');
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
