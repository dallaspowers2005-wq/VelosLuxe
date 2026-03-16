const { google } = require('googleapis');

// DB helpers are injected from server.js
let _db = null;

function init(dbHelpers) {
  _db = dbHelpers;
}

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

function getAuthUrl() {
  const oauth2 = getOAuth2Client();
  return oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly'
    ]
  });
}

async function handleCallback(code) {
  const oauth2 = getOAuth2Client();
  const { tokens } = await oauth2.getToken(code);

  if (tokens.refresh_token) {
    _db.setSetting('google_refresh_token', tokens.refresh_token);
  }
  if (tokens.access_token) {
    _db.setSetting('google_access_token', tokens.access_token);
  }
  if (tokens.expiry_date) {
    _db.setSetting('google_token_expiry', String(tokens.expiry_date));
  }

  return tokens;
}

function getAuthenticatedClient() {
  const refreshToken = _db.getSetting('google_refresh_token');
  if (!refreshToken) return null;

  const oauth2 = getOAuth2Client();
  oauth2.setCredentials({ refresh_token: refreshToken });
  return oauth2;
}

function getCalendar() {
  const auth = getAuthenticatedClient();
  if (!auth) return null;
  return google.calendar({ version: 'v3', auth });
}

function isConnected() {
  return !!_db.getSetting('google_refresh_token');
}

// Get available slots for a given date
async function getAvailableSlots(dateStr) {
  const calendar = getCalendar();
  if (!calendar) throw new Error('Google Calendar not connected');

  const tz = process.env.BOOKING_TIMEZONE || 'America/New_York';
  const startHour = parseInt(process.env.BOOKING_START_HOUR || '9');
  const endHour = parseInt(process.env.BOOKING_END_HOUR || '17');
  const slotMinutes = parseInt(process.env.BOOKING_SLOT_DURATION || '30');
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

  // Build day boundaries in the target timezone
  const dayStart = new Date(`${dateStr}T${String(startHour).padStart(2, '0')}:00:00`);
  const dayEnd = new Date(`${dateStr}T${String(endHour).padStart(2, '0')}:00:00`);

  // Convert to UTC for the API using timezone offset calculation
  const timeMin = toISOInTimezone(dateStr, startHour, 0, tz);
  const timeMax = toISOInTimezone(dateStr, endHour, 0, tz);

  // Query Google Calendar free/busy
  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin,
      timeMax,
      timeZone: tz,
      items: [{ id: calendarId }]
    }
  });

  const busyPeriods = res.data.calendars[calendarId]?.busy || [];

  // Generate candidate slots
  const slots = [];
  let current = new Date(timeMin);
  const end = new Date(timeMax);

  while (current < end) {
    const slotEnd = new Date(current.getTime() + slotMinutes * 60000);
    if (slotEnd > end) break;

    // Check if this slot overlaps any busy period
    const isBusy = busyPeriods.some(busy => {
      const busyStart = new Date(busy.start);
      const busyEnd = new Date(busy.end);
      return current < busyEnd && slotEnd > busyStart;
    });

    if (!isBusy) {
      slots.push({
        start: current.toISOString(),
        end: slotEnd.toISOString()
      });
    }

    current = slotEnd;
  }

  // Also filter out slots already booked locally (race condition guard)
  const booked = _db.getBookingsForDate(dateStr);
  const filteredSlots = slots.filter(slot => {
    const slotStart = new Date(slot.start).getTime();
    const slotEnd = new Date(slot.end).getTime();
    return !booked.some(b => {
      const bStart = new Date(b.start_time).getTime();
      const bEnd = new Date(b.end_time).getTime();
      return slotStart < bEnd && slotEnd > bStart;
    });
  });

  return filteredSlots;
}

// Create a Google Calendar event for a booking
async function createBookingEvent(booking) {
  const calendar = getCalendar();
  if (!calendar) throw new Error('Google Calendar not connected');

  const tz = process.env.BOOKING_TIMEZONE || 'America/New_York';
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

  const event = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: `VelosLuxe Call: ${booking.name}`,
      description: [
        `Strategy call with ${booking.name}`,
        booking.phone ? `Phone: ${booking.phone}` : null,
        booking.email ? `Email: ${booking.email}` : null,
        '',
        'Booked via VelosLuxe website'
      ].filter(Boolean).join('\n'),
      start: { dateTime: booking.start, timeZone: tz },
      end: { dateTime: booking.end, timeZone: tz },
      reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 15 }] }
    }
  });

  return event.data.id;
}

// Helper: create an ISO string for a specific date/hour/minute in a timezone
function toISOInTimezone(dateStr, hour, minute, tz) {
  // Create date string and let JS parse it with timezone context
  const d = new Date(`${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`);
  // Use Intl to get the correct offset
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false, timeZoneName: 'longOffset'
  });
  // For simplicity, just create the ISO string with the timezone
  // The Google API accepts timezone-aware strings
  const pad = n => String(n).padStart(2, '0');
  return `${dateStr}T${pad(hour)}:${pad(minute)}:00`;
}

module.exports = {
  init,
  getAuthUrl,
  handleCallback,
  isConnected,
  getAvailableSlots,
  createBookingEvent,
  getCalendar
};
