const { sendSMS } = require('./sms');
const sendblue = require('./sendblue');

let _db = null;

function init(dbHelpers) {
  _db = dbHelpers;
}

// Send a message via iMessage (SendBlue) if available, otherwise SMS
async function sendMessage(phone, message) {
  if (sendblue.isConfigured()) {
    return sendblue.sendMessage(phone, message);
  }
  return sendSMS(phone, message);
}

// Collect all phone numbers that should receive booking notifications
function getNotifyPhones() {
  const phones = [];
  if (process.env.REP_PHONE) phones.push(process.env.REP_PHONE);
  if (process.env.NOTIFY_PHONES) {
    for (const p of process.env.NOTIFY_PHONES.split(',')) {
      const trimmed = p.trim();
      if (trimmed && !phones.includes(trimmed)) phones.push(trimmed);
    }
  }
  return phones;
}

// Format time for display in messages
function formatTime(startTime, tz) {
  return new Date(startTime).toLocaleString('en-US', {
    timeZone: tz,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

// Format just the day name (e.g., "Thursday")
function formatDay(startTime, tz) {
  return new Date(startTime).toLocaleString('en-US', {
    timeZone: tz,
    weekday: 'long'
  });
}

// Format just the time (e.g., "2:00 PM")
function formatTimeOnly(startTime, tz) {
  return new Date(startTime).toLocaleString('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

// Build the reschedule URL for a booking
function getRescheduleUrl(bookingId) {
  const baseUrl = process.env.BASE_URL || 'https://velosluxe.com';
  return `${baseUrl}/reschedule/${bookingId}`;
}

// Schedule all reminders for a booking
function scheduleReminders(booking) {
  const startTime = new Date(booking.start_time);
  const tz = booking.timezone || process.env.BOOKING_TIMEZONE || 'America/Phoenix';
  const now = new Date();
  const hoursUntilCall = (startTime.getTime() - now.getTime()) / 3600000;

  const timeOnly = formatTimeOnly(booking.start_time, tz);
  const dayName = formatDay(booking.start_time, tz);
  const timeStr = formatTime(booking.start_time, tz);
  const firstName = booking.name.split(' ')[0];
  const spaName = booking.spa_name || '';
  const rescheduleUrl = getRescheduleUrl(booking.id);
  const notifyPhones = getNotifyPhones();

  // Touch 1 — 24hr before (audit tease)
  if (hoursUntilCall > 24) {
    const touch1Msg = spaName
      ? `Hey ${firstName}, it's Dallas from VelosLuxe! I was just looking at ${spaName}'s site and I've already got some ideas I'm excited to walk you through. See you tomorrow at ${timeOnly}!`
      : `Hey ${firstName}, it's Dallas from VelosLuxe! I've been doing some research ahead of our call and I've got some ideas I'm excited to walk you through. See you tomorrow at ${timeOnly}!`;
    const touch1Time = new Date(startTime.getTime() - 24 * 3600000);
    _db.insertReminder(booking.id, booking.phone, touch1Msg, touch1Time.toISOString());

    // Rep reminder
    for (const phone of notifyPhones) {
      _db.insertReminder(booking.id, phone, `Reminder: Strategy call tomorrow at ${timeStr} with ${booking.name} (${booking.phone}).`, touch1Time.toISOString());
    }
  }

  // Touch 2 — 2hr before (soft confirm + reschedule)
  if (hoursUntilCall > 2) {
    const touch2Msg = spaName
      ? `Hey ${firstName}! Just confirming we're still on for ${timeOnly} today. I put together a custom growth plan for ${spaName}, think you're gonna like what I found. Still good? If something came up you can grab a new time here: ${rescheduleUrl}`
      : `Hey ${firstName}! Just confirming we're still on for ${timeOnly} today. I put together a custom growth plan, think you're gonna like what I found. Still good? If something came up you can grab a new time here: ${rescheduleUrl}`;
    const touch2Time = new Date(startTime.getTime() - 2 * 3600000);
    _db.insertReminder(booking.id, booking.phone, touch2Msg, touch2Time.toISOString());

    // Rep reminder
    for (const phone of notifyPhones) {
      _db.insertReminder(booking.id, phone, `Heads up: Call with ${booking.name} (${booking.phone}) in 2 hours at ${timeStr}.`, touch2Time.toISOString());
    }
  }

  // Touch 3 — 15min before (Zoom link)
  const zoomLink = booking.zoom_link || '[Zoom link will be sent separately]';
  const touch3Msg = `Hey jumping on in 15, here's the link: ${zoomLink}`;
  const touch3Time = new Date(startTime.getTime() - 15 * 60000);
  if (touch3Time > now) {
    _db.insertReminder(booking.id, booking.phone, touch3Msg, touch3Time.toISOString());

    for (const phone of notifyPhones) {
      _db.insertReminder(booking.id, phone, `Starting in 15 min: Call with ${booking.name} at ${booking.phone}.${booking.zoom_link ? ' Zoom: ' + booking.zoom_link : ''}`, touch3Time.toISOString());
    }
  }
}

// Send immediate confirmation (Touch 0)
async function sendConfirmation(booking) {
  const tz = booking.timezone || process.env.BOOKING_TIMEZONE || 'America/Phoenix';
  const timeOnly = formatTimeOnly(booking.start_time, tz);
  const dayName = formatDay(booking.start_time, tz);
  const firstName = booking.name.split(' ')[0];
  const spaName = booking.spa_name || '';

  // Touch 0 — immediate confirmation to prospect
  if (booking.phone) {
    const msg = spaName
      ? `Hey ${firstName}, it's Dallas from VelosLuxe! Thanks for booking with us, I'm already looking forward to it. I'll be checking out ${spaName} before our call and I'll send over a Zoom link before we hop on at ${timeOnly} ${dayName}. Talk soon!`
      : `Hey ${firstName}, it's Dallas from VelosLuxe! Thanks for booking with us, I'm already looking forward to it. I'll send over a Zoom link before we hop on at ${timeOnly} ${dayName}. Talk soon!`;
    await sendMessage(booking.phone, msg);
  }

  // Notify reps
  const timeStr = formatTime(booking.start_time, tz);
  const notifyPhones = getNotifyPhones();
  const repMsg = `New booking: ${booking.name} (${booking.phone}${booking.email ? ', ' + booking.email : ''}${spaName ? ', ' + spaName : ''}) booked a strategy call for ${timeStr}.${booking.zoom_link ? ' Zoom: ' + booking.zoom_link : ''}`;
  for (const phone of notifyPhones) {
    await sendMessage(phone, repMsg);
  }
}

// Polling loop — check for due reminders every 30 seconds
function startReminderLoop() {
  async function processReminders() {
    try {
      const due = _db.getDueReminders();
      for (const reminder of due) {
        const success = await sendMessage(reminder.phone, reminder.message);
        _db.updateReminderStatus(reminder.id, success ? 'sent' : 'failed');
      }
      _db.cleanupOldReminders(7);
    } catch (err) {
      console.error('Reminder loop error:', err.message);
    }
  }

  processReminders();
  setInterval(processReminders, 30000);
  console.log('Reminder scheduler started (polling every 30s, using ' + (sendblue.isConfigured() ? 'iMessage' : 'SMS') + ')');
}

module.exports = { init, scheduleReminders, sendConfirmation, startReminderLoop };
