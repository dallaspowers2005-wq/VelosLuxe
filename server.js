require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const initSqlJs = require('sql.js');

const { createClient } = require('@supabase/supabase-js');
const { sendSMS, sendFollowUpSMS } = require('./lib/sms');
const reminders = require('./lib/reminders');
const emailService = require('./lib/email');
const zoom = require('./lib/zoom');
const { resolveClient, requireInternal } = require('./lib/tenant');
const { pushToCRM } = require('./lib/crm');
const vapiHelper = require('./lib/vapi');
const jobs = require('./lib/jobs');
const { getAdapter, listPlatforms } = require('./lib/integrations');
const { trackConversion } = require('./lib/tracking');

const app = express();
const PORT = process.env.PORT || 3000;

// Team notification via Slack webhook (SMS-free fallback)
async function notifyTeam(message) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('No SLACK_WEBHOOK_URL — skipping team notification:', message);
    return false;
  }
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message })
    });
    if (res.ok) {
      console.log('Slack notification sent:', message.substring(0, 80));
      return true;
    }
    console.error('Slack webhook error:', res.status);
    return false;
  } catch (err) {
    console.error('Slack notification failed:', err.message);
    return false;
  }
}

// Spaceship CRM Supabase client (VelosLuxe's own internal CRM)
const spaceship = createClient(
  process.env.SPACESHIP_SUPABASE_URL,
  process.env.SPACESHIP_SUPABASE_KEY
);

async function pushToSpaceship(lead) {
  // Disabled — Spaceship CRM is for outreach pipeline leads only, not onboarding/inbound
  return;
}

// Middleware
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://velosluxe.com', 'https://www.velosluxe.com']
  : ['http://localhost:3000', 'http://localhost:3001'];
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Slug helper
function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
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

  // ═══ SCHEMA — existing tables ═══
  db.run(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER DEFAULT 0,
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
      client_id INTEGER DEFAULT 0,
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
      client_id INTEGER DEFAULT 0,
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
      client_id INTEGER DEFAULT 0,
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

  // ═══ SCHEMA — multi-tenant tables ═══
  db.run(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      contact_name TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      vapi_assistant_id TEXT,
      vapi_phone_number_id TEXT,
      sms_phone_number TEXT,
      crm_webhook_url TEXT,
      google_review_link TEXT,
      review_delay_minutes INTEGER DEFAULT 60,
      followup_inactive_days INTEGER DEFAULT 60,
      followup_enabled INTEGER DEFAULT 1,
      assistant_name TEXT DEFAULT 'Sophia',
      booking_webhook_url TEXT,
      admin_key TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      name TEXT,
      phone TEXT NOT NULL,
      email TEXT,
      last_appointment_at TEXT,
      last_sms_at TEXT,
      review_requested_at TEXT,
      followup_sent_at TEXT,
      source TEXT DEFAULT 'call',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS sms_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      contact_id INTEGER,
      phone TEXT NOT NULL,
      message TEXT NOT NULL,
      sms_type TEXT,
      status TEXT DEFAULT 'sent',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      contact_phone TEXT NOT NULL,
      contact_name TEXT,
      service TEXT,
      appointment_time TEXT NOT NULL,
      status TEXT DEFAULT 'completed',
      review_sent INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS client_integrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      platform TEXT NOT NULL,
      purpose TEXT NOT NULL,
      auth_type TEXT NOT NULL,
      credentials TEXT,
      config TEXT,
      status TEXT DEFAULT 'active',
      last_error TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS onboarding_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      spa_name TEXT NOT NULL,
      contact_name TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      website TEXT,
      services TEXT,
      current_platform TEXT,
      platform_login_email TEXT,
      platform_login_password TEXT,
      num_locations INTEGER DEFAULT 1,
      referral_source TEXT,
      notes TEXT,
      status TEXT DEFAULT 'new',
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  // ═══ SCHEMA — blog ═══
  db.run(`
    CREATE TABLE IF NOT EXISTS blog_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      meta_description TEXT,
      content TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      tags TEXT DEFAULT '[]',
      published INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ═══ SCHEMA — strategy calls ═══
  db.run(`
    CREATE TABLE IF NOT EXISTS sms_consent (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      marketing_consent INTEGER DEFAULT 0,
      transactional_consent INTEGER DEFAULT 0,
      consented_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS strategy_calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      spa_name TEXT,
      start_time TEXT,
      end_time TEXT,
      services TEXT,
      revenue TEXT,
      challenges TEXT,
      source TEXT,
      qualifying_json TEXT,
      status TEXT DEFAULT 'booked',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ═══ SCHEMA MIGRATIONS — add columns to existing tables ═══
  const migrations = [
    'ALTER TABLE bookings ADD COLUMN client_id INTEGER DEFAULT 0',
    'ALTER TABLE leads ADD COLUMN client_id INTEGER DEFAULT 0',
    'ALTER TABLE calls ADD COLUMN client_id INTEGER DEFAULT 0',
    'ALTER TABLE sms_log ADD COLUMN client_id INTEGER DEFAULT 0',
    'ALTER TABLE contacts ADD COLUMN client_id INTEGER DEFAULT 0',
    'ALTER TABLE appointments ADD COLUMN client_id INTEGER DEFAULT 0',
    'ALTER TABLE reminders ADD COLUMN client_id INTEGER DEFAULT 0',
    'ALTER TABLE strategy_calls ADD COLUMN zoom_link TEXT',
    'ALTER TABLE strategy_calls ADD COLUMN timezone TEXT',
  ];
  for (const m of migrations) { try { db.run(m); } catch(e) { /* column exists */ } }

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
        'INSERT INTO bookings (client_id, name, email, phone, start_time, end_time, google_event_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [booking.client_id || 0, booking.name, booking.email || null, booking.phone, booking.start_time, booking.end_time, booking.google_event_id || null]
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

  // Local availability function
  function getAvailableSlots(dateStr, overrideIncrement) {
    const startHour = parseInt(process.env.BOOKING_START_HOUR || '9');
    const endHour = parseInt(process.env.BOOKING_END_HOUR || '17');
    const slotMinutes = overrideIncrement || parseInt(process.env.BOOKING_SLOT_DURATION || '30');

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

    const bookings = dbHelpers.getBookingsForDate(dateStr);
    const blockedTimes = dbHelpers.getBlockedTimesForDate(dateStr);
    const busyPeriods = [
      ...bookings.map(b => ({ start: b.start_time, end: b.end_time })),
      ...blockedTimes.map(b => ({ start: b.start_time, end: b.end_time }))
    ];

    const available = slots.filter(slot => {
      return !busyPeriods.some(busy => slot.start < busy.end && slot.end > busy.start);
    });

    // Filter out slots less than 4 hours from now
    const now = new Date();
    const tz = process.env.BOOKING_TIMEZONE || 'America/New_York';
    const nowInTz = new Date(now.toLocaleString('en-US', { timeZone: tz }));
    const minBookTime = new Date(nowInTz.getTime() + 4 * 3600000);
    const minTimeStr = `${String(minBookTime.getHours()).padStart(2, '0')}:${String(minBookTime.getMinutes()).padStart(2, '0')}`;
    const todayStr = nowInTz.toISOString().slice(0, 10);
    const tomorrowStr = new Date(nowInTz.getTime() + 86400000).toISOString().slice(0, 10);

    if (dateStr === todayStr) {
      return available.filter(slot => slot.start.slice(11, 16) > minTimeStr);
    }
    if (dateStr === tomorrowStr && nowInTz.getHours() >= 17) {
      // If it's after 5pm, block tomorrow's slots before 9am only (no 4hr carryover)
      return available;
    }

    return available;
  }

  // Initialize modules with DB access
  reminders.init(dbHelpers);
  emailService.init();
  zoom.init();
  jobs.init({ getAll, runQuery, getOne });

  // Create tenant middleware with our getOne function
  const tenantMiddleware = resolveClient(getOne);

  // ═══ ADMIN ROUTES (multi-tenant — scoped by client) ═══
  app.use('/api/admin', tenantMiddleware);

  // ═══ INTERNAL ROUTES (team-only) ═══
  app.use('/api/internal', requireInternal);

  // ═══════════════════════════════════════════════════════
  //  PUBLIC API ROUTES
  // ═══════════════════════════════════════════════════════

  // POST /api/onboarding — public onboarding form submission
  app.post('/api/onboarding', async (req, res) => {
    const { spa_name, contact_name, contact_email, contact_phone, website,
            services, current_platform, num_locations, referral_source, notes } = req.body;

    if (!spa_name || !contact_name) {
      return res.status(400).json({ error: 'Spa name and contact name are required' });
    }

    const id = insertAndGetId(
      `INSERT INTO onboarding_submissions (spa_name, contact_name, contact_email, contact_phone,
        website, services, current_platform, num_locations, referral_source, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [spa_name, contact_name, contact_email || null, contact_phone || null,
       website || null, services || null, current_platform || null,
       parseInt(num_locations) || 1, referral_source || null, notes || null]
    );

    // Notify team via SMS + Discord
    const notifyPhone = process.env.TEAM_NOTIFY_PHONE;
    if (notifyPhone) {
      try {
        await sendSMS(notifyPhone, `New VelosLuxe onboarding: ${spa_name} — ${contact_name} (${contact_email || contact_phone || 'no contact'}). Check the dashboard.`);
      } catch (err) {
        console.error('Onboarding notification SMS error:', err.message);
      }
    }
    notifyTeam(`🚀 **New Onboarding:** ${spa_name} — ${contact_name} (${contact_email || contact_phone || 'no contact'}). Check the dashboard.`);

    // Also push to Spaceship CRM
    pushToSpaceship({ name: contact_name, email: contact_email, phone: contact_phone, spa_name, source: 'onboarding_form' });

    // Concierge platforms — set concierge status and send appropriate SMS
    const conciergePlatforms = ['vagaro', 'mangomint', 'aestheticspro'];
    const platformSlug = (current_platform || '').toLowerCase().replace(/\s+/g, '_');

    if (conciergePlatforms.includes(platformSlug)) {
      const timelines = { vagaro: '3-5 days', mangomint: '1-3 days', aestheticspro: '1-3 days' };
      const timeline = timelines[platformSlug] || '1-5 days';

      runQuery(
        `UPDATE onboarding_submissions SET concierge_status = 'pending', concierge_requested_at = datetime('now') WHERE id = ?`,
        [id]
      );

      if (contact_phone) {
        try {
          await sendSMS(contact_phone, `Thanks for signing up with VelosLuxe! To connect ${current_platform}, there's one quick step from your account — check your email or book a setup call and we'll walk you through it live. Typically takes ${timeline}.`);
        } catch (err) {
          console.error('Concierge SMS error:', err.message);
        }
      }
    } else {
      // Auto-send connection link for self-service API key platforms
      const apiKeyPlatforms = ['zenoti', 'acuity'];
      if (apiKeyPlatforms.includes(platformSlug)) {
        const connectUrl = `${req.protocol}://${req.get('host')}/api/onboarding/${id}/connect`;

        if (contact_phone) {
          try {
            await sendSMS(contact_phone, `Thanks for signing up with VelosLuxe! Connect your ${current_platform} account here: ${connectUrl} — takes 2 minutes.`);
          } catch (err) {
            console.error('Connection link SMS error:', err.message);
          }
        }
      }
    }

    res.json({ success: true, id });
  });

  // POST /api/leads — capture demo form lead (VelosLuxe's own marketing site)
  app.post('/api/leads', (req, res) => {
    const { name, email, spa_name, source } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const id = insertAndGetId(
      'INSERT INTO leads (client_id, name, email, spa_name, source) VALUES (?, ?, ?, ?, ?)',
      [0, name, email || null, spa_name || null, source || 'demo_form']
    );

    pushToSpaceship({ name, email, spa_name, source });

    trackConversion('Lead', { name, email, spa_name, source: source || 'demo_form' }, {
      sourceUrl: req.headers.referer || 'https://velosluxe.com',
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });

    res.json({ success: true, id });
  });

  // Quiz lead capture — fires when user submits the gate form on quiz results
  app.post('/api/quiz-lead', (req, res) => {
    const { name, email, phone, score, revenue_loss } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email required' });

    const id = insertAndGetId(
      'INSERT INTO leads (client_id, name, email, spa_name, source) VALUES (?, ?, ?, ?, ?)',
      [0, name, email, null, 'quiz']
    );

    trackConversion('CompleteRegistration', {
      name, email, phone,
      source: 'quiz',
      value: revenue_loss || null
    }, {
      sourceUrl: req.headers.referer || 'https://velosluxe.com/quiz',
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });

    res.json({ success: true, id });
  });

  // ═══════════════════════════════════════════════════════
  //  PUBLIC OAUTH ENDPOINTS (onboarding flow)
  // ═══════════════════════════════════════════════════════

  // GET /api/onboarding/oauth/:platform/authorize — redirect to platform OAuth
  app.get('/api/onboarding/oauth/:platform/authorize', (req, res) => {
    const { platform } = req.params;
    const submissionId = req.query.submission_id;
    if (!submissionId) return res.status(400).json({ error: 'submission_id required' });

    const sub = getOne('SELECT id FROM onboarding_submissions WHERE id = ?', [parseInt(submissionId)]);
    if (!sub) return res.status(404).json({ error: 'Submission not found' });

    const platforms = listPlatforms();
    const platformMeta = platforms.find(p => p.platformName === platform);
    if (!platformMeta || !platformMeta.oauthConfig) {
      return res.status(400).json({ error: `Platform ${platform} does not support OAuth` });
    }

    const oauthClientId = process.env[`${platform.toUpperCase()}_CLIENT_ID`];
    const oauthClientSecret = process.env[`${platform.toUpperCase()}_CLIENT_SECRET`];

    if (!oauthClientId || !oauthClientSecret) {
      // OAuth not configured for this platform — show a friendly error page
      return res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Setup Required — VelosLuxe</title></head>
      <body style="font-family:system-ui,-apple-system,sans-serif;background:#12121f;color:#d8d6e8;margin:0;padding:2rem;min-height:100vh;display:flex;align-items:center;justify-content:center">
        <div style="max-width:440px;width:100%;background:#1e1e34;border:1px solid rgba(255,255,255,.1);border-radius:1.25rem;padding:2rem;text-align:center">
          <div style="font-size:2.5rem;margin-bottom:1rem">&#128268;</div>
          <h2 style="color:#f5f4f8;margin:0 0 0.5rem;font-size:1.25rem">OAuth Not Configured Yet</h2>
          <p style="color:#a09dba;font-size:0.9rem;margin:0 0 1.5rem;line-height:1.6">
            The one-click ${platformMeta.displayName || platform} connection isn't set up yet on our end. Don't worry — our team will handle this for you!
          </p>
          <p style="color:#a09dba;font-size:0.85rem;margin:0">You can close this window. We'll reach out to finish the connection.</p>
        </div>
      </body></html>`);
    }

    const redirectUri = `${req.protocol}://${req.get('host')}/api/onboarding/oauth/callback`;
    const state = Buffer.from(JSON.stringify({ platform, submission_id: submissionId })).toString('base64');

    const params = new URLSearchParams({
      client_id: oauthClientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: platformMeta.oauthConfig.scopes,
      state,
      access_type: 'offline',
      prompt: 'consent'
    });

    res.redirect(`${platformMeta.oauthConfig.authorizeUrl}?${params.toString()}`);
  });

  // GET /api/onboarding/oauth/callback — exchange code for tokens, store on submission
  app.get('/api/onboarding/oauth/callback', async (req, res) => {
    const { code, state } = req.query;
    if (!code || !state) return res.status(400).send('Missing code or state');

    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch {
      return res.status(400).send('Invalid state');
    }

    const { platform, submission_id: submissionId } = stateData;
    const platforms = listPlatforms();
    const platformMeta = platforms.find(p => p.platformName === platform);
    if (!platformMeta) return res.status(400).send('Unknown platform');

    const adapterModule = require(`./lib/integrations/${platform === 'google_calendar' ? 'google-calendar' : platform}`);
    const tokenUrl = adapterModule.oauthConfig?.tokenUrl;
    if (!tokenUrl) return res.status(400).send('No token URL for platform');

    const oauthClientId = process.env[`${platform.toUpperCase()}_CLIENT_ID`];
    const oauthClientSecret = process.env[`${platform.toUpperCase()}_CLIENT_SECRET`];
    const redirectUri = `${req.protocol}://${req.get('host')}/api/onboarding/oauth/callback`;

    try {
      const tokenRes = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: oauthClientId,
          client_secret: oauthClientSecret,
          redirect_uri: redirectUri
        }).toString()
      });

      const tokens = await tokenRes.json();
      if (!tokenRes.ok) {
        return res.status(400).send(`Token exchange failed: ${JSON.stringify(tokens)}`);
      }

      const oauthTokens = JSON.stringify({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : null
      });

      runQuery(
        `UPDATE onboarding_submissions SET oauth_platform = ?, oauth_tokens = ?, oauth_status = 'connected' WHERE id = ?`,
        [platform, oauthTokens, parseInt(submissionId)]
      );

      res.send(`<!DOCTYPE html><html><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8faff">
        <div style="text-align:center;padding:2rem">
          <div style="font-size:3rem;margin-bottom:1rem">&#10003;</div>
          <h2 style="color:#059669;margin:0 0 0.5rem">Connected!</h2>
          <p style="color:#64748b">You can close this window and finish the form.</p>
        </div>
        <script>
          if (window.opener) { window.opener.postMessage({ type: 'oauth_connected', platform: '${platform}' }, '*'); }
        </script>
      </body></html>`);
    } catch (err) {
      res.status(500).send(`OAuth error: ${err.message}`);
    }
  });

  // ═══════════════════════════════════════════════════════
  //  PUBLIC API KEY SUBMISSION ENDPOINTS (onboarding flow)
  // ═══════════════════════════════════════════════════════

  const apiKeyInstructions = {
    vagaro: {
      name: 'Vagaro',
      prereq: 'Requires a paid Vagaro plan with Vagaro credit card processing. API access is $10/month.',
      steps: [
        'Log into Vagaro on the <strong>web</strong> (not the mobile app)',
        'Go to <strong>Settings → Developers → APIs & Webhooks</strong>',
        'If you see a request form, fill it out — Vagaro approves within ~5 business days',
        'Once approved, return to <strong>Settings → Developers → APIs & Webhooks</strong>',
        'Copy your <strong>Client ID</strong> and <strong>Client Secret Key</strong>'
      ],
      fields: [
        { key: 'client_id', label: 'Client ID', required: true },
        { key: 'client_secret', label: 'Client Secret Key', required: true }
      ],
      note: 'Don\'t have API access yet? Contact us and we\'ll walk you through the request process.'
    },
    mangomint: {
      name: 'Mangomint',
      prereq: 'Webhooks require the Standard ($245/mo) or Unlimited ($375/mo) plan. Custom API requires Unlimited.',
      steps: [
        'Log into Mangomint as an <strong>Admin</strong> user',
        'Open the <strong>in-app chat support</strong> (bottom-right corner)',
        'Tell them: "We\'re connecting with VelosLuxe for AI receptionist integration. Can you enable webhooks and/or API access?"',
        'Mangomint\'s team will configure the integration and provide credentials',
        'Paste the credentials they give you below'
      ],
      fields: [
        { key: 'api_key', label: 'API Key or Webhook Token', required: true }
      ],
      note: 'Mangomint sets up API access through their support team. Contact us if you\'d like us to coordinate with Mangomint directly.'
    },
    aestheticspro: {
      name: 'AestheticsPro',
      prereq: 'API access requires the Enterprise plan ($350/mo).',
      steps: [
        'Log into AestheticsPro',
        'Go to <strong>Support → Ask the Support Team</strong>',
        'Submit a ticket requesting API access, mentioning you\'re integrating with VelosLuxe',
        'Alternatively, email <strong>partnerships@aestheticspro.com</strong>',
        'Once they provide your API credentials, paste them below'
      ],
      fields: [
        { key: 'api_key', label: 'API Key', required: true }
      ],
      note: 'AestheticsPro provisions API access manually. Contact us and we can handle the request on your behalf.'
    },
    zenoti: {
      name: 'Zenoti',
      prereq: 'You need organization-level admin access with "Manage API Keys" permission.',
      steps: [
        'Log into Zenoti at the <strong>organization level</strong> (not a specific center)',
        'Click the <strong>Configuration (gear) icon</strong> in the top navigation',
        'Go to <strong>Integrations → Apps</strong> (or search for "Apps")',
        'Click <strong>Add</strong> to create a new app',
        'Select the data permissions needed (appointments, guests, invoices)',
        'Under <strong>APIKEY GROUPS</strong>, check the boxes for the API groups you need',
        'Click <strong>Generate API Key</strong> and copy it immediately',
        'Also copy the <strong>Application ID</strong> shown on the same page'
      ],
      fields: [
        { key: 'application_id', label: 'Application ID', required: true },
        { key: 'api_key', label: 'API Key', required: true }
      ],
      note: 'Can\'t find the Apps page? Your role may need "Manage API Keys" and "Manage Apps" permissions under Organization → Security Roles.'
    },
    acuity: {
      name: 'Acuity',
      prereq: 'API access requires Acuity\'s Premium plan ($49+/mo).',
      steps: [
        'Log into <strong>Acuity Scheduling</strong> (acuityscheduling.com)',
        'In the left sidebar, scroll down to <strong>Business Settings</strong>',
        'Click <strong>Integrations</strong>',
        'Scroll down to the <strong>API</strong> section',
        'Click <strong>View Credentials</strong>',
        'Copy your <strong>User ID</strong> and <strong>API Key</strong> from the popup'
      ],
      fields: [
        { key: 'user_id', label: 'User ID', required: true },
        { key: 'api_key', label: 'API Key', required: true }
      ],
      note: 'Don\'t see the API section? You may need to upgrade to the Premium plan.'
    }
  };

  // GET /api/onboarding/:id/connect — show API key submission page
  app.get('/api/onboarding/:id/connect', (req, res) => {
    const sub = getOne('SELECT * FROM onboarding_submissions WHERE id = ?', [parseInt(req.params.id)]);
    if (!sub) return res.status(404).send('Submission not found');

    const platformSlug = (sub.current_platform || '').toLowerCase().replace(/\s+/g, '_');
    const instructions = apiKeyInstructions[platformSlug];
    if (!instructions) return res.status(400).send('No API key instructions for this platform');

    const alreadySubmitted = !!sub.api_key_submitted_at;

    const fieldsHtml = instructions.fields.map(f =>
      `<div style="margin-bottom:1rem">
        <label style="display:block;font-size:0.75rem;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.375rem">${f.label}${f.required ? ' *' : ''}</label>
        <input name="${f.key}" ${f.required ? 'required' : ''} style="width:100%;height:3rem;border:2px solid #e2e8f0;border-radius:1rem;padding:0 1rem;font-size:0.875rem;outline:none;font-family:monospace;box-sizing:border-box" />
      </div>`
    ).join('');

    res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Connect ${instructions.name} — VelosLuxe</title></head>
    <body style="font-family:system-ui,-apple-system,sans-serif;background:#f8faff;margin:0;padding:2rem;min-height:100vh;display:flex;align-items:center;justify-content:center">
      <div style="max-width:480px;width:100%;background:white;border-radius:1.5rem;padding:2rem;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
        <div style="text-align:center;margin-bottom:1.5rem">
          <h1 style="font-size:1.25rem;font-weight:800;color:#0f172a;margin:0 0 0.25rem">Connect ${instructions.name}</h1>
          <p style="color:#64748b;font-size:0.875rem;margin:0">${sub.spa_name}</p>
        </div>
        ${alreadySubmitted ? `
          <div style="text-align:center;padding:2rem 0">
            <div style="font-size:3rem;margin-bottom:0.5rem">&#10003;</div>
            <p style="color:#059669;font-weight:600">API key already submitted!</p>
            <p style="color:#64748b;font-size:0.875rem">Our team is setting up your integration.</p>
          </div>
        ` : `
          ${instructions.prereq ? `
            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:0.75rem;padding:1rem;margin-bottom:1rem">
              <p style="font-size:0.7rem;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 0.25rem">Before you start</p>
              <p style="font-size:0.825rem;color:#92400e;margin:0;line-height:1.5">${instructions.prereq}</p>
            </div>
          ` : ''}
          <div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:0.75rem;padding:1rem;margin-bottom:1rem">
            <p style="font-size:0.7rem;font-weight:700;color:#4338ca;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 0.75rem">Step-by-step instructions</p>
            <ol style="margin:0;padding-left:1.25rem;list-style:none;counter-reset:step">
              ${instructions.steps.map((s, i) => `<li style="margin-bottom:0.625rem;font-size:0.825rem;color:#3730a3;line-height:1.5;display:flex;gap:0.5rem;align-items:flex-start"><span style="flex-shrink:0;width:1.375rem;height:1.375rem;border-radius:50%;background:#c7d2fe;color:#3730a3;font-size:0.7rem;font-weight:700;display:flex;align-items:center;justify-content:center;margin-top:0.1rem">${i + 1}</span><span>${s}</span></li>`).join('')}
            </ol>
          </div>
          ${instructions.note ? `
            <p style="font-size:0.775rem;color:#64748b;background:#f8fafc;border:1px solid #e2e8f0;border-radius:0.75rem;padding:0.75rem;margin-bottom:1rem;line-height:1.5">${instructions.note}</p>
          ` : ''}
          <form method="POST" action="/api/onboarding/${sub.id}/connect">
            <p style="font-size:0.7rem;font-weight:700;color:#334155;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 0.75rem">Paste your credentials</p>
            ${fieldsHtml}
            <button type="submit" style="width:100%;height:3.5rem;border:none;border-radius:1rem;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;font-weight:700;font-size:0.875rem;cursor:pointer">Submit & Connect</button>
          </form>
        `}
      </div>
    </body></html>`);
  });

  // POST /api/onboarding/:id/connect — receive API key
  app.post('/api/onboarding/:id/connect', async (req, res) => {
    const sub = getOne('SELECT * FROM onboarding_submissions WHERE id = ?', [parseInt(req.params.id)]);
    if (!sub) return res.status(404).send('Submission not found');

    const apiKeyData = JSON.stringify(req.body);

    runQuery(
      `UPDATE onboarding_submissions SET api_key_token = ?, api_key_submitted_at = datetime('now') WHERE id = ?`,
      [apiKeyData, sub.id]
    );

    // Notify team via SMS + Discord
    const notifyPhone = process.env.TEAM_NOTIFY_PHONE;
    if (notifyPhone) {
      try {
        await sendSMS(notifyPhone, `API key received for ${sub.spa_name}! Check the onboarding queue.`);
      } catch (err) {
        console.error('API key notification SMS error:', err.message);
      }
    }
    notifyTeam(`🔑 **API Key Received:** ${sub.spa_name} — check the onboarding queue.`);

    res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Connected — VelosLuxe</title></head>
    <body style="font-family:system-ui,-apple-system,sans-serif;background:#f8faff;margin:0;padding:2rem;min-height:100vh;display:flex;align-items:center;justify-content:center">
      <div style="max-width:480px;width:100%;background:white;border-radius:1.5rem;padding:2rem;box-shadow:0 1px 3px rgba(0,0,0,0.1);text-align:center">
        <div style="font-size:3rem;margin-bottom:1rem">&#10003;</div>
        <h2 style="color:#059669;margin:0 0 0.5rem">All Set!</h2>
        <p style="color:#64748b;font-size:0.875rem;margin:0">Your API key has been submitted. Our team will finish setting up your integration shortly.</p>
      </div>
    </body></html>`);
  });

  // POST /api/onboarding/:id/help — client needs help connecting their platform
  app.post('/api/onboarding/:id/help', async (req, res) => {
    const sub = getOne('SELECT * FROM onboarding_submissions WHERE id = ?', [parseInt(req.params.id)]);
    if (!sub) return res.status(404).json({ error: 'Not found' });

    const notifyPhone = process.env.TEAM_NOTIFY_PHONE;
    if (notifyPhone) {
      try {
        await sendSMS(notifyPhone, `${sub.spa_name} needs help connecting ${sub.current_platform}. Contact: ${sub.contact_name} (${sub.contact_phone || sub.contact_email || 'no contact'})`);
      } catch (err) {
        console.error('Help request SMS error:', err.message);
      }
    }
    notifyTeam(`🆘 **Help Requested:** ${sub.spa_name} needs help connecting ${sub.current_platform}. Contact: ${sub.contact_name} (${sub.contact_phone || sub.contact_email || 'no contact'})`);

    res.json({ success: true });
  });

  // POST /api/onboarding/:id/resend-link — internal: resend connection link SMS
  app.post('/api/internal/onboarding/:id/resend-link', async (req, res) => {
    const sub = getOne('SELECT * FROM onboarding_submissions WHERE id = ?', [parseInt(req.params.id)]);
    if (!sub) return res.status(404).json({ error: 'Not found' });

    if (!sub.contact_phone) return res.status(400).json({ error: 'No phone number on file' });

    const connectUrl = `${req.protocol}://${req.get('host')}/api/onboarding/${sub.id}/connect`;
    try {
      await sendSMS(sub.contact_phone, `Connect your ${sub.current_platform} account to VelosLuxe here: ${connectUrl} — takes 2 minutes.`);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ═══════════════════════════════════════════════════════
  //  CONCIERGE MANAGEMENT ENDPOINTS
  // ═══════════════════════════════════════════════════════

  // PUT /api/internal/onboarding/:id/concierge — update concierge status and notes
  app.put('/api/internal/onboarding/:id/concierge', (req, res) => {
    const id = parseInt(req.params.id);
    const sub = getOne('SELECT * FROM onboarding_submissions WHERE id = ?', [id]);
    if (!sub) return res.status(404).json({ error: 'Not found' });

    const { concierge_status, concierge_notes } = req.body;
    const updates = [];
    const params = [];

    if (concierge_status) {
      updates.push('concierge_status = ?');
      params.push(concierge_status);
    }
    if (concierge_notes !== undefined) {
      updates.push('concierge_notes = ?');
      params.push(concierge_notes);
    }

    if (updates.length > 0) {
      params.push(id);
      runQuery(`UPDATE onboarding_submissions SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    res.json({ success: true });
  });

  // POST /api/internal/onboarding/:id/activate — enter credentials and activate integration
  app.post('/api/internal/onboarding/:id/activate', async (req, res) => {
    const id = parseInt(req.params.id);
    const sub = getOne('SELECT * FROM onboarding_submissions WHERE id = ?', [id]);
    if (!sub) return res.status(404).json({ error: 'Not found' });

    const { credentials } = req.body;
    if (!credentials) return res.status(400).json({ error: 'Credentials are required' });

    // Store credentials on the submission
    const credStr = typeof credentials === 'string' ? credentials : JSON.stringify(credentials);
    runQuery(
      `UPDATE onboarding_submissions SET api_key_token = ?, api_key_submitted_at = datetime('now'), concierge_status = 'connected' WHERE id = ?`,
      [credStr, id]
    );

    // Create integration if a client already exists for this submission
    // Look for a client with matching name
    const client = getOne('SELECT * FROM clients WHERE name = ? OR contact_email = ?', [sub.spa_name, sub.contact_email]);
    let integrationId = null;

    if (client) {
      try {
        const allPlatforms = listPlatforms();
        const platformSlug = (sub.current_platform || '').toLowerCase().replace(/\s+/g, '_');
        const platformMeta = allPlatforms.find(p => p.platformName === platformSlug);
        const purpose = platformMeta?.capabilities?.booking && platformMeta?.capabilities?.crm ? 'both'
          : platformMeta?.capabilities?.booking ? 'booking' : 'crm';

        integrationId = insertAndGetId(
          'INSERT INTO client_integrations (client_id, platform, purpose, auth_type, credentials, status) VALUES (?, ?, ?, ?, ?, ?)',
          [client.id, platformSlug, purpose, platformMeta?.authType || 'api_key', credStr, 'active']
        );
      } catch (err) {
        console.error('Integration creation error:', err.message);
      }
    }

    // Send "you're live" SMS to client
    if (sub.contact_phone) {
      try {
        await sendSMS(sub.contact_phone, `Great news — your ${sub.current_platform} account is connected to VelosLuxe and your AI receptionist is ready to go!`);
      } catch (err) {
        console.error('Activation SMS error:', err.message);
      }
    }

    // Notify team via SMS + Discord
    const notifyPhone = process.env.TEAM_NOTIFY_PHONE;
    if (notifyPhone) {
      try {
        await sendSMS(notifyPhone, `${sub.spa_name} activated! ${sub.current_platform} integration is live.`);
      } catch (err) {
        console.error('Activation team notification error:', err.message);
      }
    }
    notifyTeam(`✅ **Client Activated:** ${sub.spa_name} — ${sub.current_platform} integration is live!`);

    res.json({ success: true, integration_id: integrationId });
  });

  // POST /api/call — trigger Vapi outbound call
  app.post('/api/call', async (req, res) => {
    const { name, phone } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'Name and phone are required' });

    const callId = insertAndGetId(
      'INSERT INTO calls (client_id, name, phone, source) VALUES (?, ?, ?, ?)',
      [0, name, phone, 'call_receptionist']
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

        trackConversion('Lead', { name, phone, source: 'demo_call' }, {
          sourceUrl: req.headers.referer || 'https://velosluxe.com',
          userAgent: req.headers['user-agent'],
          ip: req.ip
        });

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

  // ═══════════════════════════════════════════════════════
  //  MULTI-TENANT VAPI WEBHOOK — PER-CLIENT ROUTING
  // ═══════════════════════════════════════════════════════

  app.post('/api/vapi/webhook/:slug', async (req, res) => {
    const { slug } = req.params;
    const client = getOne("SELECT * FROM clients WHERE slug = ? AND status = 'active'", [slug]);

    if (!client) {
      console.warn(`Vapi webhook for unknown slug: ${slug}`);
      return res.json({ ok: true });
    }

    const payload = req.body;
    const msgType = payload.message?.type;
    const botName = client.assistant_name || 'Sophia';
    console.log(`Vapi webhook [${slug}]:`, msgType);

    // ── FUNCTION CALLS (mid-call) ──
    // Vapi sends these when the assistant invokes a tool during the conversation
    if (msgType === 'function-call') {
      const fnCall = payload.message;
      const fnName = fnCall.functionCall?.name;
      const fnArgs = fnCall.functionCall?.parameters || {};

      console.log(`[${slug}] Function call: ${fnName}`, fnArgs);

      if (fnName === 'bookAppointment') {
        return await handleBookAppointment(client, fnArgs, res);
      }

      if (fnName === 'captureLeadInfo') {
        return await handleCaptureLead(client, fnArgs, res);
      }

      // Unknown function — return generic success so call continues
      return res.json({ result: 'Function not recognized, but continuing.' });
    }

    // ── END OF CALL REPORT ──
    if (msgType === 'end-of-call-report') {
      const call = payload.message;
      const phone = call.customer?.number || null;
      const name = call.customer?.name || null;
      const duration = call.durationSeconds || null;
      const callId = call.call?.id || null;
      const summary = call.summary || null;
      const transcript = call.transcript || '';

      let callerName = name;
      if (!callerName && transcript) {
        const nameMatch = transcript.match(/(?:my name is|this is|I'm|i am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
        if (nameMatch) callerName = nameMatch[1];
      }

      console.log(`[${slug}] Call ended — Phone: ${phone}, Name: ${callerName}, Duration: ${duration}s`);

      if (phone) {
        // Log call
        insertAndGetId(
          'INSERT INTO calls (client_id, name, phone, source, status, vapi_call_id) VALUES (?, ?, ?, ?, ?, ?)',
          [client.id, callerName || 'Inbound Caller', phone, 'vapi_webhook', 'completed', callId]
        );

        // Upsert contact
        const existingContact = getOne(
          'SELECT id FROM contacts WHERE client_id = ? AND phone = ?',
          [client.id, phone]
        );
        if (existingContact) {
          runQuery("UPDATE contacts SET name = COALESCE(?, name), last_sms_at = datetime('now') WHERE id = ?",
            [callerName, existingContact.id]);
        } else {
          insertAndGetId(
            'INSERT INTO contacts (client_id, name, phone, source) VALUES (?, ?, ?, ?)',
            [client.id, callerName || null, phone, 'call']
          );
        }

        // Push to client's CRM
        const noteParts = [
          `Spoke with AI receptionist ${botName}`,
          callerName ? `Caller: ${callerName}` : null,
          `Duration: ${duration ? duration + 's' : 'unknown'}`,
          summary ? `Summary: ${summary}` : null,
        ].filter(Boolean);

        await pushToCRM(client, getOne, {
          name: callerName || 'Inbound Caller',
          phone,
          type: 'inbound_call',
          notes: noteParts.join('\n')
        });

        // Also sync to Spaceship (VelosLuxe's own tracking)
        await pushToSpaceship({
          name: callerName || 'Website Caller',
          phone,
          spa_name: client.name,
          source: 'client_inbound_call',
          notes: `Client: ${client.name}\n${noteParts.join('\n')}`
        });

        // Send follow-up SMS from client's number
        await sendFollowUpSMS(phone, callerName, client);

        // Log SMS
        insertAndGetId(
          'INSERT INTO sms_log (client_id, phone, message, sms_type) VALUES (?, ?, ?, ?)',
          [client.id, phone, 'Follow-up SMS after call', 'followup_call']
        );
      }
    }

    res.json({ ok: true });
  });

  // ── Function call handlers (used by Vapi mid-call tools) ──

  async function handleBookAppointment(client, args, res) {
    const { customerName, customerPhone, service, preferredDate, preferredTime } = args;

    // Build an appointment time string
    let appointmentTime = preferredDate || new Date().toISOString().slice(0, 10);
    if (preferredTime) appointmentTime += ` ${preferredTime}`;

    // Store locally
    const apptId = insertAndGetId(
      'INSERT INTO appointments (client_id, contact_phone, contact_name, service, appointment_time, status) VALUES (?, ?, ?, ?, ?, ?)',
      [client.id, customerPhone || '', customerName || '', service || '', appointmentTime, 'requested']
    );

    // Upsert contact
    if (customerPhone) {
      const existing = getOne('SELECT id FROM contacts WHERE client_id = ? AND phone = ?', [client.id, customerPhone]);
      if (existing) {
        runQuery("UPDATE contacts SET name = COALESCE(?, name), last_appointment_at = ? WHERE id = ?",
          [customerName, appointmentTime, existing.id]);
      } else {
        insertAndGetId(
          'INSERT INTO contacts (client_id, name, phone, last_appointment_at, source) VALUES (?, ?, ?, ?, ?)',
          [client.id, customerName || null, customerPhone, appointmentTime, 'booking_call']
        );
      }
    }

    // Forward to client's booking system via platform adapter
    let bookingConfirmed = false;
    const bookingIntegration = getOne(
      "SELECT * FROM client_integrations WHERE client_id = ? AND purpose IN ('booking', 'both') AND status = 'active' LIMIT 1",
      [client.id]
    );

    if (bookingIntegration) {
      try {
        const adapter = getAdapter(bookingIntegration.platform, bookingIntegration);
        const result = await adapter.createAppointment({
          customerName, customerPhone, service,
          preferredDate, preferredTime, appointmentTime,
          customerEmail: args.customerEmail || null
        });
        bookingConfirmed = result.confirmed;
        if (bookingConfirmed) {
          runQuery('UPDATE appointments SET status = ? WHERE id = ?', ['confirmed', apptId]);
        }
        console.log(`[${client.slug}] Booking via ${bookingIntegration.platform}: ${result.message}`);
      } catch (err) {
        console.error(`[${client.slug}] Booking adapter error:`, err.message);
      }
    } else if (client.booking_webhook_url) {
      // Legacy fallback
      try {
        const bookingRes = await fetch(client.booking_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: 'velosluxe_ai_call',
            client_name: client.name,
            customer_name: customerName,
            customer_phone: customerPhone,
            service,
            preferred_date: preferredDate,
            preferred_time: preferredTime,
            appointment_time: appointmentTime,
            timestamp: new Date().toISOString()
          })
        });
        bookingConfirmed = bookingRes.ok;
        if (bookingConfirmed) {
          runQuery('UPDATE appointments SET status = ? WHERE id = ?', ['confirmed', apptId]);
          console.log(`[${client.slug}] Booking forwarded to ${client.booking_webhook_url}`);
        }
      } catch (err) {
        console.error(`[${client.slug}] Booking webhook error:`, err.message);
      }
    }

    // Also push to CRM
    await pushToCRM(client, getOne, {
      name: customerName || 'Caller',
      phone: customerPhone,
      type: 'booking_request',
      service,
      preferred_date: preferredDate,
      preferred_time: preferredTime
    });

    // Return result to Vapi — the assistant reads this and tells the caller
    const resultMsg = bookingConfirmed
      ? `Appointment booked successfully for ${customerName} — ${service} on ${preferredDate || 'the requested date'}${preferredTime ? ' at ' + preferredTime : ''}. The spa will confirm the exact time.`
      : `Booking request received for ${customerName} — ${service}${preferredDate ? ' on ' + preferredDate : ''}${preferredTime ? ' at ' + preferredTime : ''}. The team will confirm the appointment shortly.`;

    return res.json({ result: resultMsg });
  }

  async function handleCaptureLead(client, args, res) {
    const { name, phone, email, interest, notes } = args;

    // Store as lead
    if (name) {
      insertAndGetId(
        'INSERT INTO leads (client_id, name, email, spa_name, source) VALUES (?, ?, ?, ?, ?)',
        [client.id, name, email || null, interest || null, 'ai_call_capture']
      );
    }

    // Upsert contact
    if (phone) {
      const existing = getOne('SELECT id FROM contacts WHERE client_id = ? AND phone = ?', [client.id, phone]);
      if (existing) {
        runQuery("UPDATE contacts SET name = COALESCE(?, name), email = COALESCE(?, email) WHERE id = ?",
          [name, email, existing.id]);
      } else {
        insertAndGetId(
          'INSERT INTO contacts (client_id, name, phone, email, source) VALUES (?, ?, ?, ?, ?)',
          [client.id, name || null, phone, email || null, 'ai_call_capture']
        );
      }
    }

    // Push to CRM
    const notesParts = [
      interest ? `Interest: ${interest}` : null,
      notes || null
    ].filter(Boolean);

    await pushToCRM(client, getOne, {
      name: name || 'Caller',
      phone: phone || null,
      email: email || null,
      type: 'lead_capture',
      interest,
      notes: notesParts.join('\n')
    });

    return res.json({ result: `Got it — saved ${name || 'the caller'}'s info. The team will follow up.` });
  }

  // Legacy single-tenant Vapi webhook (for VelosLuxe's own calls)
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

      let callerName = name;
      if (!callerName && transcript) {
        const nameMatch = transcript.match(/(?:my name is|this is|I'm|i am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
        if (nameMatch) callerName = nameMatch[1];
      }

      console.log(`Call ended — Phone: ${phone}, Name: ${callerName}, Duration: ${duration}s`);

      const noteParts = [
        `Spoke with AI receptionist Sophia via VelosLuxe website`,
        callerName ? `Caller: ${callerName}` : null,
        `Duration: ${duration ? duration + 's' : 'unknown'}`,
        summary ? `AI Summary: ${summary}` : null,
      ].filter(Boolean);
      const notes = noteParts.join('\n');

      if (phone) {
        insertAndGetId(
          'INSERT INTO calls (client_id, name, phone, source, status, vapi_call_id) VALUES (?, ?, ?, ?, ?, ?)',
          [0, callerName || 'Inbound Caller', phone, 'vapi_webhook', 'completed', callId]
        );
      }

      if (phone) {
        const { data: existing } = await spaceship.from('leads')
          .select('id')
          .eq('phone', phone)
          .eq('source', 'VelosLuxe')
          .limit(1)
          .maybeSingle();

        if (!existing) {
          await pushToSpaceship({ name: callerName || 'Website Caller', phone, source: 'inbound_call', notes });
          await sendFollowUpSMS(phone, callerName);
        }
      }
    }

    res.json({ ok: true });
  });

  // ═══════════════════════════════════════════════════════
  //  APPOINTMENT WEBHOOK — PER-CLIENT
  // ═══════════════════════════════════════════════════════

  app.post('/api/webhook/appointment/:slug', (req, res) => {
    const { slug } = req.params;
    const client = getOne("SELECT * FROM clients WHERE slug = ? AND status = 'active'", [slug]);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const { phone, name, service, appointment_time } = req.body;
    if (!phone || !appointment_time) {
      return res.status(400).json({ error: 'phone and appointment_time are required' });
    }

    // Insert appointment
    const apptId = insertAndGetId(
      'INSERT INTO appointments (client_id, contact_phone, contact_name, service, appointment_time) VALUES (?, ?, ?, ?, ?)',
      [client.id, phone, name || null, service || null, appointment_time]
    );

    // Upsert contact
    const existingContact = getOne(
      'SELECT id FROM contacts WHERE client_id = ? AND phone = ?',
      [client.id, phone]
    );
    if (existingContact) {
      runQuery(
        "UPDATE contacts SET name = COALESCE(?, name), last_appointment_at = ? WHERE id = ?",
        [name || null, appointment_time, existingContact.id]
      );
    } else {
      insertAndGetId(
        'INSERT INTO contacts (client_id, name, phone, last_appointment_at, source) VALUES (?, ?, ?, ?, ?)',
        [client.id, name || null, phone, appointment_time, 'appointment']
      );
    }

    res.json({ success: true, appointmentId: apptId });
  });

  // ═══════════════════════════════════════════════════════
  //  BOOKING API ROUTES (legacy — VelosLuxe's own)
  // ═══════════════════════════════════════════════════════

  app.get('/api/booking/slots', async (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Date parameter required (YYYY-MM-DD)' });

    const maxDays = parseInt(process.env.BOOKING_DAYS_AHEAD || '14');
    const requestedDate = new Date(date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today.getTime() + maxDays * 86400000);

    if (requestedDate < today) return res.json({ slots: [] });
    if (requestedDate > maxDate) return res.json({ slots: [] });

    const day = requestedDate.getDay();
    if (day === 0) return res.json({ slots: [] }); // Sunday only

    const increment = req.query.increment ? parseInt(req.query.increment) : null;
    const slots = getAvailableSlots(date, increment);
    res.json({ slots });
  });

  app.post('/api/booking', async (req, res) => {
    const { name, phone, email, start, end } = req.body;
    if (!name || !phone || !start || !end) {
      return res.status(400).json({ error: 'Name, phone, start, and end are required' });
    }

    try {
      const bookingId = dbHelpers.insertBooking({
        name, email, phone,
        start_time: start,
        end_time: end
      });

      const booking = { id: bookingId, name, email, phone, start_time: start, end_time: end };
      await reminders.sendConfirmation(booking);
      reminders.scheduleReminders(booking);
      pushToSpaceship({ name, email, phone, source: 'booking', notes: `Booked strategy call for ${start}` });

      res.json({ success: true, bookingId });
    } catch (err) {
      console.error('Booking error:', err.message);
      res.status(500).json({ error: 'Booking failed' });
    }
  });

  // ═══════════════════════════════════════════════════════
  //  STRATEGY CALL BOOKING (prospect-facing)
  // ═══════════════════════════════════════════════════════

  app.post('/api/strategy-call', async (req, res) => {
    const { name, email, phone, spa_name, start, end, timezone, qualifying } = req.body;
    if (!name || !phone || !start || !end) {
      return res.status(400).json({ error: 'Name, phone, start, and end are required' });
    }

    try {
      // Save to strategy_calls table with qualifying data
      const scId = insertAndGetId(
        'INSERT INTO strategy_calls (name, email, phone, spa_name, start_time, end_time, services, revenue, challenges, source, qualifying_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [name, email || null, phone, spa_name || null, start, end,
         qualifying?.services?.join(', ') || null,
         qualifying?.revenue || null,
         qualifying?.challenges?.join(', ') || null,
         qualifying?.source || null,
         JSON.stringify(qualifying || {})]
      );

      // Also create a lead for tracking
      runQuery(
        'INSERT INTO leads (client_id, name, email, spa_name, source) VALUES (0, ?, ?, ?, ?)',
        [name, email || null, spa_name || null, 'strategy_call']
      );

      // Book the time slot
      const bookingId = dbHelpers.insertBooking({
        name, email, phone,
        start_time: start,
        end_time: end
      });

      // Update strategy_call with booking_id
      runQuery('UPDATE strategy_calls SET booking_id = ? WHERE id = ?', [bookingId, scId]);

      // Create Zoom meeting
      const zoomMeeting = await zoom.createMeeting({ name, spa_name, start_time: start, end_time: end });
      const zoomLink = zoomMeeting?.join_url || null;
      if (zoomLink) {
        runQuery('UPDATE strategy_calls SET zoom_link = ?, timezone = ? WHERE id = ?', [zoomLink, timezone || 'America/Phoenix', scId]);
      }

      const prospectTz = timezone || 'America/Phoenix';
      const booking = { id: bookingId, name, email, phone, start_time: start, end_time: end, zoom_link: zoomLink, timezone: prospectTz };
      await reminders.sendConfirmation(booking);
      reminders.scheduleReminders(booking);

      const qualStr = qualifying ? `\nServices: ${qualifying.services?.join(', ') || 'N/A'}\nRevenue: ${qualifying.revenue || 'N/A'}\nChallenges: ${qualifying.challenges?.join(', ') || 'N/A'}\nSource: ${qualifying.source || 'N/A'}` : '';
      const timeStr = new Date(start).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

      notifyTeam(`📞 **New Strategy Call Booked!**\n${name}${spa_name ? ' — ' + spa_name : ''}\n📧 ${email || 'no email'} | 📱 ${phone}\n🕐 ${timeStr}${zoomLink ? '\n🔗 ' + zoomLink : ''}${qualStr}`);

      trackConversion('Schedule', {
        name, email, phone, spa_name,
        source: 'strategy_call',
        value: qualifying?.revenue || null
      }, {
        sourceUrl: req.headers.referer || 'https://velosluxe.com/strategy-call',
        userAgent: req.headers['user-agent'],
        ip: req.ip
      });

      // Send confirmation email + schedule email reminders
      if (email) {
        emailService.sendBookingConfirmation(booking, qualifying);
        const callTime = new Date(start).getTime();
        const now = Date.now();
        const ms24h = callTime - 24 * 3600000;
        const ms1h = callTime - 3600000;
        const ms10m = callTime - 600000;
        if (ms24h > now) setTimeout(() => emailService.sendReminder24h(booking), ms24h - now);
        if (ms1h > now) setTimeout(() => emailService.sendReminder1h(booking), ms1h - now);
        if (ms10m > now) setTimeout(() => emailService.sendReminder10m(booking), ms10m - now);
      }

      res.json({ success: true, bookingId, strategyCallId: scId });
    } catch (err) {
      console.error('Strategy call booking error:', err.message);
      res.status(500).json({ error: 'Booking failed' });
    }
  });

  // List strategy calls (for internal dashboard)
  app.get('/api/internal/strategy-calls', (req, res) => {
    const calls = getAll('SELECT * FROM strategy_calls ORDER BY created_at DESC');
    res.json(calls);
  });

  // Update strategy call status + trigger emails
  app.post('/api/internal/strategy-calls/:id/action', async (req, res) => {
    const { id } = req.params;
    const { action } = req.body;
    const sc = getOne('SELECT * FROM strategy_calls WHERE id = ?', [parseInt(id)]);
    if (!sc) return res.status(404).json({ error: 'Not found' });

    if (action === 'no_show') {
      runQuery('UPDATE strategy_calls SET status = ? WHERE id = ?', ['no_show', parseInt(id)]);
      if (sc.email) await emailService.sendNoShowFollowup(sc);
      notifyTeam(`❌ No-show: ${sc.name}${sc.spa_name ? ' — ' + sc.spa_name : ''}. Reschedule email sent.`);
      res.json({ success: true, status: 'no_show' });
    } else if (action === 'completed') {
      runQuery('UPDATE strategy_calls SET status = ? WHERE id = ?', ['completed', parseInt(id)]);
      if (sc.email) await emailService.sendPostCallFollowup(sc, sc.spa_name);
      notifyTeam(`✅ Call completed: ${sc.name}${sc.spa_name ? ' — ' + sc.spa_name : ''}. Follow-up email sent.`);
      res.json({ success: true, status: 'completed' });
    } else if (action === 'cancelled') {
      runQuery('UPDATE strategy_calls SET status = ? WHERE id = ?', ['cancelled', parseInt(id)]);
      res.json({ success: true, status: 'cancelled' });
    } else {
      res.status(400).json({ error: 'Invalid action. Use: no_show, completed, cancelled' });
    }
  });

  // ═══════════════════════════════════════════════════════
  //  CLIENT ADMIN ROUTES (scoped by tenant middleware)
  // ═══════════════════════════════════════════════════════

  // Dashboard — aggregated value metrics
  app.get('/api/admin/dashboard', (req, res) => {
    const clientId = req.client.id;
    const daysParam = req.query.days ? parseInt(req.query.days) : 0;
    const dateFilter = daysParam > 0
      ? `AND created_at >= datetime('now', '-${daysParam} days')`
      : '';

    const calls = getOne(`SELECT COUNT(*) as count FROM calls WHERE client_id = ? ${dateFilter}`, [clientId]).count;
    const leads = getOne(`SELECT COUNT(*) as count FROM leads WHERE client_id = ? ${dateFilter}`, [clientId]).count;
    const smsSent = getOne(`SELECT COUNT(*) as count FROM sms_log WHERE client_id = ? ${dateFilter}`, [clientId]).count;
    const reviewRequests = getOne(`SELECT COUNT(*) as count FROM sms_log WHERE client_id = ? AND sms_type = 'review_request' ${dateFilter}`, [clientId]).count;
    const appointments = getOne(`SELECT COUNT(*) as count FROM appointments WHERE client_id = ? ${dateFilter}`, [clientId]).count;

    const callsThisMonth = getOne("SELECT COUNT(*) as count FROM calls WHERE client_id = ? AND created_at >= datetime('now', 'start of month')", [clientId]).count;
    const leadsThisMonth = getOne("SELECT COUNT(*) as count FROM leads WHERE client_id = ? AND created_at >= datetime('now', 'start of month')", [clientId]).count;
    const smsThisMonth = getOne("SELECT COUNT(*) as count FROM sms_log WHERE client_id = ? AND created_at >= datetime('now', 'start of month')", [clientId]).count;

    // Recent activity feed (last 10 events)
    const recentCalls = getAll(
      "SELECT 'call' as type, name || ' called' as description, created_at FROM calls WHERE client_id = ? ORDER BY created_at DESC LIMIT 5",
      [clientId]
    );
    const recentSms = getAll(
      "SELECT sms_type as type, 'SMS to ' || phone as description, created_at FROM sms_log WHERE client_id = ? ORDER BY created_at DESC LIMIT 5",
      [clientId]
    );
    const recentActivity = [...recentCalls, ...recentSms]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 10);

    res.json({
      clientName: req.client.name,
      calls, leads, smsSent, reviewRequests, appointments,
      callsThisMonth, leadsThisMonth, smsThisMonth,
      recentActivity,
      settings: {
        google_review_link: req.client.google_review_link,
        review_delay_minutes: req.client.review_delay_minutes,
        followup_inactive_days: req.client.followup_inactive_days,
        followup_enabled: req.client.followup_enabled
      }
    });
  });

  // SMS log
  app.get('/api/admin/sms-log', (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const logs = getAll(
      'SELECT * FROM sms_log WHERE client_id = ? ORDER BY created_at DESC LIMIT ?',
      [req.client.id, limit]
    );
    res.json(logs);
  });

  // Contacts
  app.get('/api/admin/contacts', (req, res) => {
    const limit = parseInt(req.query.limit) || 100;
    const contacts = getAll(
      'SELECT * FROM contacts WHERE client_id = ? ORDER BY created_at DESC LIMIT ?',
      [req.client.id, limit]
    );
    res.json(contacts);
  });

  // Update own settings
  app.put('/api/admin/settings', (req, res) => {
    const { google_review_link, review_delay_minutes, followup_inactive_days, followup_enabled } = req.body;
    const updates = [];
    const params = [];

    if (google_review_link !== undefined) { updates.push('google_review_link = ?'); params.push(google_review_link); }
    if (review_delay_minutes !== undefined) { updates.push('review_delay_minutes = ?'); params.push(review_delay_minutes); }
    if (followup_inactive_days !== undefined) { updates.push('followup_inactive_days = ?'); params.push(followup_inactive_days); }
    if (followup_enabled !== undefined) { updates.push('followup_enabled = ?'); params.push(followup_enabled); }

    if (updates.length > 0) {
      params.push(req.client.id);
      runQuery(`UPDATE clients SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    res.json({ success: true });
  });

  // Stats (legacy compat)
  app.get('/api/admin/stats', (req, res) => {
    const clientId = req.client.id;
    const totalLeads = getOne('SELECT COUNT(*) as count FROM leads WHERE client_id = ?', [clientId]).count;
    const totalCalls = getOne('SELECT COUNT(*) as count FROM calls WHERE client_id = ?', [clientId]).count;
    const leadsToday = getOne("SELECT COUNT(*) as count FROM leads WHERE client_id = ? AND date(created_at) = date('now')", [clientId]).count;
    const callsToday = getOne("SELECT COUNT(*) as count FROM calls WHERE client_id = ? AND date(created_at) = date('now')", [clientId]).count;
    res.json({ totalLeads, totalCalls, leadsToday, callsToday });
  });

  // Leads (scoped)
  app.get('/api/admin/leads', (req, res) => {
    const { source, limit } = req.query;
    let query = 'SELECT * FROM leads WHERE client_id = ?';
    const params = [req.client.id];
    if (source) { query += ' AND source = ?'; params.push(source); }
    query += ' ORDER BY created_at DESC';
    if (limit) { query += ' LIMIT ?'; params.push(parseInt(limit)); }
    res.json(getAll(query, params));
  });

  // Calls (scoped)
  app.get('/api/admin/calls', (req, res) => {
    let query = 'SELECT * FROM calls WHERE client_id = ? ORDER BY created_at DESC';
    const params = [req.client.id];
    if (req.query.limit) { query += ' LIMIT ?'; params.push(parseInt(req.query.limit)); }
    res.json(getAll(query, params));
  });

  // Delete lead (scoped)
  app.delete('/api/admin/leads/:id', (req, res) => {
    runQuery('DELETE FROM leads WHERE id = ? AND client_id = ?', [parseInt(req.params.id), req.client.id]);
    res.json({ success: true });
  });

  // Bookings (scoped)
  app.get('/api/admin/bookings', (req, res) => {
    let query = 'SELECT * FROM bookings WHERE client_id = ? ORDER BY start_time DESC';
    const params = [req.client.id];
    if (req.query.limit) { query += ' LIMIT ?'; params.push(parseInt(req.query.limit)); }
    res.json(getAll(query, params));
  });

  // Block time (legacy)
  app.post('/api/admin/block-time', (req, res) => {
    const { start, end, reason } = req.body;
    if (!start || !end) return res.status(400).json({ error: 'start and end are required' });
    const id = dbHelpers.insertBlockedTime(start, end, reason);
    res.json({ success: true, id });
  });

  // Test call (scoped)
  app.post('/api/admin/test-call', async (req, res) => {
    const { name, phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number is required' });

    const client = req.client;
    const assistantId = client.vapi_assistant_id || process.env.VAPI_ASSISTANT_ID;
    const phoneNumberId = client.vapi_phone_number_id || process.env.VAPI_PHONE_NUMBER_ID;

    try {
      const vapiRes = await fetch('https://api.vapi.ai/call/phone', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          assistantId,
          phoneNumberId,
          customer: { number: phone, name: name || 'Test User' }
        })
      });

      const vapiData = await vapiRes.json();
      if (vapiRes.ok) {
        insertAndGetId(
          'INSERT INTO calls (client_id, name, phone, source, status, vapi_call_id) VALUES (?, ?, ?, ?, ?, ?)',
          [client.id, name || 'Test User', phone, 'admin_test', 'initiated', vapiData.id || null]
        );
        res.json({ success: true, vapiCallId: vapiData.id });
      } else {
        res.json({ success: false, error: vapiData.message || 'Vapi call failed' });
      }
    } catch (err) {
      res.json({ success: false, error: err.message });
    }
  });

  // Vapi calls from API (scoped)
  app.get('/api/admin/vapi-calls', async (req, res) => {
    try {
      const client = req.client;
      const assistantId = client.vapi_assistant_id;
      if (!assistantId) return res.json([]);

      const limit = req.query.limit || 50;
      const vapiRes = await fetch(`https://api.vapi.ai/call?limit=${limit}&assistantId=${assistantId}`, {
        headers: { 'Authorization': `Bearer ${process.env.VAPI_API_KEY}` }
      });
      const calls = await vapiRes.json();
      if (!Array.isArray(calls)) return res.json([]);

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

      res.json(formatted);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ═══════════════════════════════════════════════════════
  //  INTERNAL ROUTES (team setup tool)
  // ═══════════════════════════════════════════════════════

  // Overview stats across all clients
  app.get('/api/internal/overview', (req, res) => {
    const activeClients = getOne("SELECT COUNT(*) as count FROM clients WHERE status = 'active'").count;
    const totalLeads = getOne('SELECT COUNT(*) as count FROM leads').count;
    const totalCalls = getOne('SELECT COUNT(*) as count FROM calls').count;
    const totalSms = getOne('SELECT COUNT(*) as count FROM sms_log').count;
    res.json({ activeClients, totalLeads, totalCalls, totalSms });
  });

  // List all clients
  app.get('/api/internal/clients', (req, res) => {
    const clients = getAll('SELECT * FROM clients ORDER BY created_at DESC');
    res.json(clients);
  });

  // Get single client
  app.get('/api/internal/clients/:id', (req, res) => {
    const client = getOne('SELECT * FROM clients WHERE id = ?', [parseInt(req.params.id)]);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  });

  // Provision new client
  app.post('/api/internal/clients', async (req, res) => {
    const { name, contact_name, contact_email, contact_phone, services, hours,
            crm_webhook_url, google_review_link, review_delay_minutes,
            assistant_name, booking_webhook_url,
            integration_platform, integration_credentials, integration_config,
            onboarding_submission_id } = req.body;

    if (!name) return res.status(400).json({ error: 'Spa name is required' });

    const slug = slugify(name);
    const adminKey = crypto.randomBytes(16).toString('hex');

    // Check slug uniqueness
    const existing = getOne('SELECT id FROM clients WHERE slug = ?', [slug]);
    if (existing) return res.status(400).json({ error: `Slug "${slug}" already exists` });

    let vapiAssistantId = null;
    let vapiPhoneNumberId = null;
    let phoneNumber = null;

    // Try to create Vapi assistant
    try {
      vapiAssistantId = await vapiHelper.createAssistant({
        spaName: name,
        assistantName: assistant_name || 'Sophia',
        services: services || 'Various med spa treatments',
        hours: hours || 'Monday-Friday 9am-5pm',
        webhookSlug: slug
      });
      console.log(`Vapi assistant created for ${name}: ${vapiAssistantId}`);

      // Try to assign a phone number
      try {
        const available = await vapiHelper.listAvailableNumbers();
        if (available.length > 0) {
          const num = available[0];
          await vapiHelper.assignPhoneNumber(num.id, vapiAssistantId);
          vapiPhoneNumberId = num.id;
          phoneNumber = num.number || num.phoneNumber || null;
          console.log(`Phone number assigned to ${name}: ${phoneNumber}`);
        } else {
          console.warn(`No available phone numbers for ${name}`);
        }
      } catch (phoneErr) {
        console.error(`Phone assignment error for ${name}:`, phoneErr.message);
      }
    } catch (vapiErr) {
      console.error(`Vapi assistant creation error for ${name}:`, vapiErr.message);
    }

    // Insert client
    const clientId = insertAndGetId(
      `INSERT INTO clients (name, slug, contact_name, contact_email, contact_phone,
        vapi_assistant_id, vapi_phone_number_id, sms_phone_number,
        crm_webhook_url, google_review_link, review_delay_minutes,
        assistant_name, booking_webhook_url, admin_key)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, slug, contact_name || null, contact_email || null, contact_phone || null,
       vapiAssistantId, vapiPhoneNumberId, phoneNumber,
       crm_webhook_url || null, google_review_link || null,
       review_delay_minutes || 60, assistant_name || 'Sophia',
       booking_webhook_url || null, adminKey]
    );

    // Create platform integration if specified
    let integrationStatus = null;
    if (integration_platform) {
      try {
        const allPlatforms = listPlatforms();
        const platformMeta = allPlatforms.find(p => p.platformName === integration_platform);
        const credStr = typeof integration_credentials === 'string' ? integration_credentials : JSON.stringify(integration_credentials || {});
        const configStr = typeof integration_config === 'string' ? integration_config : JSON.stringify(integration_config || {});
        const purpose = platformMeta?.capabilities?.booking && platformMeta?.capabilities?.crm ? 'both'
          : platformMeta?.capabilities?.booking ? 'booking' : 'crm';

        insertAndGetId(
          'INSERT INTO client_integrations (client_id, platform, purpose, auth_type, credentials, config, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [clientId, integration_platform, purpose, platformMeta?.authType || 'api_key', credStr, configStr, 'active']
        );
        integrationStatus = 'created';
      } catch (err) {
        integrationStatus = `error: ${err.message}`;
      }
    } else if (!integration_platform && (crm_webhook_url || booking_webhook_url)) {
      // Auto-create webhook adapter rows for legacy webhook URLs
      if (crm_webhook_url) {
        insertAndGetId(
          "INSERT INTO client_integrations (client_id, platform, purpose, auth_type, credentials, status) VALUES (?, 'webhook', 'crm', 'webhook_url', ?, 'active')",
          [clientId, JSON.stringify({ url: crm_webhook_url })]
        );
      }
      if (booking_webhook_url) {
        insertAndGetId(
          "INSERT INTO client_integrations (client_id, platform, purpose, auth_type, credentials, status) VALUES (?, 'webhook', 'booking', 'webhook_url', ?, 'active')",
          [clientId, JSON.stringify({ url: booking_webhook_url })]
        );
      }
      integrationStatus = 'webhook_migrated';
    }

    // Auto-create integration from onboarding submission tokens/keys
    if (!integrationStatus && onboarding_submission_id) {
      const onbSub = getOne('SELECT * FROM onboarding_submissions WHERE id = ?', [parseInt(onboarding_submission_id)]);
      if (onbSub) {
        try {
          const allPlatforms = listPlatforms();

          if (onbSub.oauth_tokens && onbSub.oauth_status === 'connected') {
            // OAuth flow — use stored tokens
            const platform = onbSub.oauth_platform;
            const platformMeta = allPlatforms.find(p => p.platformName === platform);
            const purpose = platformMeta?.capabilities?.booking && platformMeta?.capabilities?.crm ? 'both'
              : platformMeta?.capabilities?.booking ? 'booking' : 'crm';

            insertAndGetId(
              'INSERT INTO client_integrations (client_id, platform, purpose, auth_type, credentials, status) VALUES (?, ?, ?, ?, ?, ?)',
              [clientId, platform, purpose, 'oauth', onbSub.oauth_tokens, 'active']
            );
            integrationStatus = 'created_from_onboarding_oauth';
          } else if (onbSub.api_key_token) {
            // API key flow — use stored key
            const platformSlug = (onbSub.current_platform || '').toLowerCase().replace(/\s+/g, '_');
            const platformMeta = allPlatforms.find(p => p.platformName === platformSlug);
            const purpose = platformMeta?.capabilities?.booking && platformMeta?.capabilities?.crm ? 'both'
              : platformMeta?.capabilities?.booking ? 'booking' : 'crm';

            insertAndGetId(
              'INSERT INTO client_integrations (client_id, platform, purpose, auth_type, credentials, status) VALUES (?, ?, ?, ?, ?, ?)',
              [clientId, platformSlug, purpose, 'api_key', onbSub.api_key_token, 'active']
            );
            integrationStatus = 'created_from_onboarding_api_key';
          }
        } catch (err) {
          integrationStatus = `onboarding_error: ${err.message}`;
        }
      }
    }

    res.json({
      success: true,
      id: clientId,
      slug,
      admin_key: adminKey,
      vapi_assistant_id: vapiAssistantId,
      phone_number: phoneNumber,
      dashboard_url: `/admin/?key=${adminKey}`,
      appointment_webhook: `/api/webhook/appointment/${slug}`,
      vapi_webhook: `/api/vapi/webhook/${slug}`,
      integration_status: integrationStatus
    });
  });

  // Update client
  app.put('/api/internal/clients/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const client = getOne('SELECT id FROM clients WHERE id = ?', [id]);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const fields = ['name', 'contact_name', 'contact_email', 'contact_phone',
                    'crm_webhook_url', 'google_review_link', 'review_delay_minutes',
                    'followup_inactive_days', 'followup_enabled', 'status',
                    'sms_phone_number', 'vapi_assistant_id', 'vapi_phone_number_id',
                    'assistant_name', 'booking_webhook_url'];

    const updates = [];
    const params = [];

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(req.body[field]);
      }
    }

    if (updates.length > 0) {
      params.push(id);
      runQuery(`UPDATE clients SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    res.json({ success: true });
  });

  // ═══════════════════════════════════════════════════════
  //  ONBOARDING MANAGEMENT ENDPOINTS
  // ═══════════════════════════════════════════════════════

  // List onboarding submissions
  app.get('/api/internal/onboarding', (req, res) => {
    const status = req.query.status;
    let sql = 'SELECT * FROM onboarding_submissions';
    const params = [];
    if (status) { sql += ' WHERE status = ?'; params.push(status); }
    sql += ' ORDER BY created_at DESC';
    res.json(getAll(sql, params));
  });

  // Get unread count
  app.get('/api/internal/onboarding/unread', (req, res) => {
    const result = getOne('SELECT COUNT(*) as count FROM onboarding_submissions WHERE read = 0');
    res.json({ count: result.count });
  });

  // Get single submission
  app.get('/api/internal/onboarding/:id', (req, res) => {
    const sub = getOne('SELECT * FROM onboarding_submissions WHERE id = ?', [parseInt(req.params.id)]);
    if (!sub) return res.status(404).json({ error: 'Not found' });
    // Mark as read
    if (!sub.read) {
      runQuery('UPDATE onboarding_submissions SET read = 1 WHERE id = ?', [sub.id]);
    }
    res.json(sub);
  });

  // Update submission status
  app.put('/api/internal/onboarding/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const sub = getOne('SELECT id FROM onboarding_submissions WHERE id = ?', [id]);
    if (!sub) return res.status(404).json({ error: 'Not found' });

    const { status, notes } = req.body;
    const updates = [];
    const params = [];
    if (status) { updates.push('status = ?'); params.push(status); }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }

    if (updates.length > 0) {
      params.push(id);
      runQuery(`UPDATE onboarding_submissions SET ${updates.join(', ')} WHERE id = ?`, params);
    }
    res.json({ success: true });
  });

  // Delete submission
  app.delete('/api/internal/onboarding/:id', (req, res) => {
    const id = parseInt(req.params.id);
    runQuery('DELETE FROM onboarding_submissions WHERE id = ?', [id]);
    res.json({ success: true });
  });

  // ═══════════════════════════════════════════════════════
  //  INTEGRATION MANAGEMENT ENDPOINTS
  // ═══════════════════════════════════════════════════════

  // List all available platforms
  app.get('/api/internal/platforms', (req, res) => {
    res.json(listPlatforms());
  });

  // List integrations for a client
  app.get('/api/internal/clients/:id/integrations', (req, res) => {
    const clientId = parseInt(req.params.id);
    const integrations = getAll('SELECT * FROM client_integrations WHERE client_id = ? ORDER BY created_at DESC', [clientId]);
    res.json(integrations);
  });

  // Create integration for a client
  app.post('/api/internal/clients/:id/integrations', async (req, res) => {
    const clientId = parseInt(req.params.id);
    const client = getOne('SELECT id FROM clients WHERE id = ?', [clientId]);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const { platform, purpose, auth_type, credentials, config } = req.body;
    if (!platform) return res.status(400).json({ error: 'Platform is required' });

    const credStr = typeof credentials === 'string' ? credentials : JSON.stringify(credentials || {});
    const configStr = typeof config === 'string' ? config : JSON.stringify(config || {});

    // Test connection first
    try {
      const row = { id: 0, client_id: clientId, credentials: credStr, config: configStr, status: 'active' };
      const adapter = getAdapter(platform, row);
      const testResult = await adapter.testConnection();

      if (!testResult.success) {
        return res.json({ success: false, error: `Connection test failed: ${testResult.message}` });
      }
    } catch (err) {
      return res.json({ success: false, error: `Test error: ${err.message}` });
    }

    const id = insertAndGetId(
      'INSERT INTO client_integrations (client_id, platform, purpose, auth_type, credentials, config, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [clientId, platform, purpose || 'both', auth_type || 'api_key', credStr, configStr, 'active']
    );

    res.json({ success: true, id, message: 'Integration created and connection verified' });
  });

  // Update integration
  app.put('/api/internal/clients/:id/integrations/:intId', (req, res) => {
    const intId = parseInt(req.params.intId);
    const integration = getOne('SELECT id FROM client_integrations WHERE id = ? AND client_id = ?', [intId, parseInt(req.params.id)]);
    if (!integration) return res.status(404).json({ error: 'Integration not found' });

    const { credentials, config, status } = req.body;
    const updates = [];
    const params = [];

    if (credentials !== undefined) {
      updates.push('credentials = ?');
      params.push(typeof credentials === 'string' ? credentials : JSON.stringify(credentials));
    }
    if (config !== undefined) {
      updates.push('config = ?');
      params.push(typeof config === 'string' ? config : JSON.stringify(config));
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }

    if (updates.length > 0) {
      params.push(intId);
      runQuery(`UPDATE client_integrations SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    res.json({ success: true });
  });

  // Delete integration
  app.delete('/api/internal/clients/:id/integrations/:intId', (req, res) => {
    const intId = parseInt(req.params.intId);
    const integration = getOne('SELECT id FROM client_integrations WHERE id = ? AND client_id = ?', [intId, parseInt(req.params.id)]);
    if (!integration) return res.status(404).json({ error: 'Integration not found' });

    runQuery('DELETE FROM client_integrations WHERE id = ?', [intId]);
    res.json({ success: true });
  });

  // Test integration connection
  app.post('/api/internal/clients/:id/integrations/:intId/test', async (req, res) => {
    const intId = parseInt(req.params.intId);
    const integration = getOne('SELECT * FROM client_integrations WHERE id = ? AND client_id = ?', [intId, parseInt(req.params.id)]);
    if (!integration) return res.status(404).json({ error: 'Integration not found' });

    try {
      const adapter = getAdapter(integration.platform, integration);
      const result = await adapter.testConnection();

      if (!result.success) {
        runQuery('UPDATE client_integrations SET status = ?, last_error = ? WHERE id = ?', ['error', result.message, intId]);
      } else {
        runQuery("UPDATE client_integrations SET status = 'active', last_error = NULL WHERE id = ?", [intId]);
      }

      res.json(result);
    } catch (err) {
      res.json({ success: false, message: err.message });
    }
  });

  // OAuth: Generate authorize URL and redirect
  app.get('/api/internal/oauth/:platform/authorize', (req, res) => {
    const { platform } = req.params;
    const clientId = req.query.client_id;
    if (!clientId) return res.status(400).json({ error: 'client_id required' });

    const platforms = listPlatforms();
    const platformMeta = platforms.find(p => p.platformName === platform);
    if (!platformMeta || !platformMeta.oauthConfig) {
      return res.status(400).json({ error: `Platform ${platform} does not support OAuth` });
    }

    const oauthClientId = process.env[`${platform.toUpperCase()}_CLIENT_ID`];
    const redirectUri = `${req.protocol}://${req.get('host')}/api/internal/oauth/callback`;
    const state = Buffer.from(JSON.stringify({ platform, client_id: clientId })).toString('base64');

    const params = new URLSearchParams({
      client_id: oauthClientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: platformMeta.oauthConfig.scopes,
      state,
      access_type: 'offline',
      prompt: 'consent'
    });

    res.redirect(`${platformMeta.oauthConfig.authorizeUrl}?${params.toString()}`);
  });

  // OAuth: Callback — exchange code for tokens
  app.get('/api/internal/oauth/callback', async (req, res) => {
    const { code, state } = req.query;
    if (!code || !state) return res.status(400).send('Missing code or state');

    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch {
      return res.status(400).send('Invalid state');
    }

    const { platform, client_id: clientId } = stateData;
    const platforms = listPlatforms();
    const platformMeta = platforms.find(p => p.platformName === platform);
    if (!platformMeta) return res.status(400).send('Unknown platform');

    // Find full oauthConfig (need tokenUrl which we don't expose in listPlatforms)
    const adapterModule = require(`./lib/integrations/${platform === 'google_calendar' ? 'google-calendar' : platform}`);
    const tokenUrl = adapterModule.oauthConfig?.tokenUrl;
    if (!tokenUrl) return res.status(400).send('No token URL for platform');

    const oauthClientId = process.env[`${platform.toUpperCase()}_CLIENT_ID`];
    const oauthClientSecret = process.env[`${platform.toUpperCase()}_CLIENT_SECRET`];
    const redirectUri = `${req.protocol}://${req.get('host')}/api/internal/oauth/callback`;

    try {
      const tokenRes = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: oauthClientId,
          client_secret: oauthClientSecret,
          redirect_uri: redirectUri
        }).toString()
      });

      const tokens = await tokenRes.json();
      if (!tokenRes.ok) {
        return res.status(400).send(`Token exchange failed: ${JSON.stringify(tokens)}`);
      }

      const credentials = JSON.stringify({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : null
      });

      // Check for existing integration
      const existing = getOne(
        "SELECT id FROM client_integrations WHERE client_id = ? AND platform = ?",
        [parseInt(clientId), platform]
      );

      if (existing) {
        runQuery("UPDATE client_integrations SET credentials = ?, status = 'active', last_error = NULL WHERE id = ?",
          [credentials, existing.id]);
      } else {
        const capability = platformMeta.capabilities;
        const purpose = capability.booking && capability.crm ? 'both' : capability.booking ? 'booking' : 'crm';
        insertAndGetId(
          'INSERT INTO client_integrations (client_id, platform, purpose, auth_type, credentials, status) VALUES (?, ?, ?, ?, ?, ?)',
          [parseInt(clientId), platform, purpose, 'oauth', credentials, 'active']
        );
      }

      res.send('<html><body><h2>Connected!</h2><p>You can close this window and return to the setup tool.</p><script>window.close();</script></body></html>');
    } catch (err) {
      res.status(500).send(`OAuth error: ${err.message}`);
    }
  });

  // ═══ CONTRACTS ═══
  const { setupContractRoutes } = require('./lib/contracts');
  setupContractRoutes(app, getAll, getOne, runQuery, insertAndGetId, saveDb, notifyTeam);

  // ═══ PITCH PAGES ═══
  const { setupPitchRoutes } = require('./lib/pitch');
  setupPitchRoutes(app);

  // ═══ BLOG ═══
  const { setupBlogRoutes } = require('./lib/blog');
  setupBlogRoutes(app, getAll, getOne, runQuery, insertAndGetId, saveDb);

  // Blog routes loaded from lib/blog.js above
  /* OLD INLINE BLOG CODE REMOVED */
  // ═══ SERVE STATIC FILES ═══
  app.use('/internal', express.static(path.join(__dirname, 'internal')));
  app.use('/admin', express.static(path.join(__dirname, 'admin')));
  app.use(express.static(path.join(__dirname, 'public')));

  // Extensionless routes for compliance pages
  app.get('/book', (req, res) => res.sendFile(path.join(__dirname, 'public', 'book.html')));
  app.get('/privacy', (req, res) => res.sendFile(path.join(__dirname, 'public', 'privacy.html')));
  app.get('/terms', (req, res) => res.sendFile(path.join(__dirname, 'public', 'terms.html')));
  app.get('/sms-consent', (req, res) => res.sendFile(path.join(__dirname, 'public', 'sms-consent.html')));

  // SMS consent form submission
  app.post('/api/sms-consent', (req, res) => {
    const { name, phone, email, marketing_consent, transactional_consent } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }
    if (!marketing_consent && !transactional_consent) {
      return res.status(400).json({ error: 'At least one consent type is required' });
    }
    try {
      const stmt = db.prepare(`INSERT INTO sms_consent (name, phone, email, marketing_consent, transactional_consent, consented_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`);
      stmt.run(name, phone, email || null, marketing_consent ? 1 : 0, transactional_consent ? 1 : 0);
      res.json({ success: true });
    } catch (err) {
      console.error('SMS consent error:', err);
      res.json({ success: true }); // Still show success to user — don't expose DB errors
    }
  });
  app.get('/strategy-call', (req, res) => res.sendFile(path.join(__dirname, 'public', 'strategy-call.html')));
  app.get('/meeting', (req, res) => res.sendFile(path.join(__dirname, 'public', 'meeting.html')));
  app.get('/demo-dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'demo-dashboard.html')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  // ═══ AUTO-SYNC: POLL VAPI FOR NEW CALLS (across all clients) ═══
  const syncedCallIds = new Set();

  async function pollVapiCalls() {
    try {
      const calls = await vapiHelper.fetchCalls(20);

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

        let callerName = name;
        if (!callerName && transcript) {
          const nameMatch = transcript.match(/(?:my name is|this is|I'm|i am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
          if (nameMatch) callerName = nameMatch[1];
        }

        if (!phone) { syncedCallIds.add(c.id); continue; }

        // Determine which client this call belongs to
        let client = null;
        if (c.assistantId) {
          client = getOne("SELECT * FROM clients WHERE vapi_assistant_id = ? AND status = 'active'", [c.assistantId]);
        }
        const clientId = client ? client.id : 0;

        // Log locally if not already there
        const localExisting = getOne('SELECT id FROM calls WHERE vapi_call_id = ?', [c.id]);
        if (!localExisting) {
          insertAndGetId(
            'INSERT INTO calls (client_id, name, phone, source, status, vapi_call_id) VALUES (?, ?, ?, ?, ?, ?)',
            [clientId, callerName || 'Inbound Caller', phone, 'vapi_poll', 'completed', c.id]
          );
          console.log(`Call logged: ${c.id} — ${phone} — ${duration}s — client_id: ${clientId}`);
        }

        // If this is a client call, push to their CRM and upsert contact
        if (client) {
          // Upsert contact
          const existingContact = getOne('SELECT id FROM contacts WHERE client_id = ? AND phone = ?', [client.id, phone]);
          if (!existingContact) {
            insertAndGetId(
              'INSERT INTO contacts (client_id, name, phone, source) VALUES (?, ?, ?, ?)',
              [client.id, callerName || null, phone, 'call']
            );
          }

          await pushToCRM(client, getOne, {
            name: callerName || 'Inbound Caller',
            phone,
            type: 'inbound_call'
          });

          await sendFollowUpSMS(phone, callerName, client);
        } else {
          // VelosLuxe's own call — sync to Spaceship
          const { data: existing } = await spaceship.from('leads')
            .select('id')
            .eq('phone', phone)
            .eq('source', 'VelosLuxe')
            .limit(1)
            .maybeSingle();

          if (!existing) {
            await pushToSpaceship({ name: callerName || 'Website Caller', phone, source: 'inbound_call' });
            await sendFollowUpSMS(phone, callerName);
          }
        }

        syncedCallIds.add(c.id);
      }
    } catch (err) {
      console.error('Vapi poll error:', err.message);
    }
  }

  // Poll every 60 seconds
  pollVapiCalls();
  setInterval(pollVapiCalls, 60000);

  // Start SMS reminder scheduler
  reminders.startReminderLoop();

  // Start background jobs (review requests + inactive follow-ups)
  jobs.startJobs();

  // ═══ START SERVER ═══
  app.listen(PORT, () => {
    console.log(`VelosLuxe server running at http://localhost:${PORT}`);
    console.log(`Admin dashboard at http://localhost:${PORT}/admin`);
    console.log(`Internal setup at http://localhost:${PORT}/internal`);
    console.log('Auto-syncing Vapi calls every 60s');
    console.log('Review requests every 5min, Inactive follow-ups every 60min');
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
