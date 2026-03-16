const { sendSMS } = require('./sms');

let _db = null;

function init(dbHelpers) {
  _db = dbHelpers;
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

// Schedule all reminders for a booking (both prospect and rep)
function scheduleReminders(booking) {
  const startTime = new Date(booking.start_time);
  const tz = process.env.BOOKING_TIMEZONE || 'America/New_York';

  // Format time for messages
  const timeStr = startTime.toLocaleString('en-US', {
    timeZone: tz,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const notifyPhones = getNotifyPhones();
  const prospectPhone = booking.phone;
  const name = booking.name;

  // Reminder schedule: [minutesBefore, prospectMessage, repMessage]
  const schedule = [
    [
      24 * 60, // 24 hours before
      `Reminder: Your VelosLuxe strategy call is tomorrow at ${timeStr}. We'll show you exactly how to recover your lost revenue. See you then!`,
      `Reminder: You have a VelosLuxe strategy call tomorrow at ${timeStr} with ${name} (${prospectPhone}).`
    ],
    [
      60, // 1 hour before
      `Your VelosLuxe strategy call starts in 1 hour (${timeStr}). We're looking forward to it!`,
      `Heads up: Your call with ${name} (${prospectPhone}) starts in 1 hour at ${timeStr}.`
    ],
    [
      15, // 15 minutes before
      `Your VelosLuxe call starts in 15 minutes! We'll be calling you at ${prospectPhone}.`,
      `Starting in 15 min: Call with ${name} at ${prospectPhone}.`
    ]
  ];

  for (const [minutesBefore, prospectMsg, repMsg] of schedule) {
    const sendAt = new Date(startTime.getTime() - minutesBefore * 60000);

    // Only schedule if the reminder time is in the future
    if (sendAt > new Date()) {
      // Prospect reminder
      if (prospectPhone) {
        _db.insertReminder(booking.id, prospectPhone, prospectMsg, sendAt.toISOString());
      }
      // Notify all rep/owner phones
      for (const phone of notifyPhones) {
        _db.insertReminder(booking.id, phone, repMsg, sendAt.toISOString());
      }
    }
  }
}

// Send immediate confirmation SMS to both parties
async function sendConfirmation(booking) {
  const startTime = new Date(booking.start_time);
  const tz = process.env.BOOKING_TIMEZONE || 'America/New_York';
  const timeStr = startTime.toLocaleString('en-US', {
    timeZone: tz,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const notifyPhones = getNotifyPhones();

  // Confirmation to prospect
  if (booking.phone) {
    await sendSMS(
      booking.phone,
      `Hi ${booking.name}! Your VelosLuxe strategy call is confirmed for ${timeStr}. We'll walk through your specific revenue leaks and show you exactly how to fix them. Talk soon!`
    );
  }

  // Confirmation to all rep/owner phones
  const repMsg = `New booking: ${booking.name} (${booking.phone}${booking.email ? ', ' + booking.email : ''}) booked a strategy call for ${timeStr}.`;
  for (const phone of notifyPhones) {
    await sendSMS(phone, repMsg);
  }
}

// Polling loop — check for due reminders every 30 seconds
function startReminderLoop() {
  async function processReminders() {
    try {
      const due = _db.getDueReminders();
      for (const reminder of due) {
        const success = await sendSMS(reminder.phone, reminder.message);
        _db.updateReminderStatus(reminder.id, success ? 'sent' : 'failed');
      }

      // Cleanup old sent/failed reminders (older than 7 days)
      _db.cleanupOldReminders(7);
    } catch (err) {
      console.error('Reminder loop error:', err.message);
    }
  }

  // Run immediately, then every 30 seconds
  processReminders();
  setInterval(processReminders, 30000);
  console.log('SMS reminder scheduler started (polling every 30s)');
}

module.exports = { init, scheduleReminders, sendConfirmation, startReminderLoop };
