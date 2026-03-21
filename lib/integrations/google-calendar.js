// Google Calendar adapter — OAuth, booking only (creates calendar events)

const BaseAdapter = require('./base-adapter');

const GCAL_API = 'https://www.googleapis.com/calendar/v3';

class GoogleCalendarAdapter extends BaseAdapter {
  static platformName = 'google_calendar';
  static displayName = 'Google Calendar';
  static authType = 'oauth';
  static capabilities = { booking: true, crm: false };
  static credentialFields = [
    { key: 'access_token', label: 'Access Token', type: 'text', oauth: true },
    { key: 'refresh_token', label: 'Refresh Token', type: 'text', oauth: true }
  ];
  static configFields = [
    { key: 'calendar_id', label: 'Calendar ID', type: 'text' }
  ];
  static oauthConfig = {
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: 'https://www.googleapis.com/auth/calendar.events'
  };

  get calendarId() {
    return this.config.calendar_id || 'primary';
  }

  async createAppointment(data) {
    try {
      // Build event start/end times
      let startDateTime = data.appointmentTime;
      if (data.preferredDate && data.preferredTime) {
        startDateTime = `${data.preferredDate}T${data.preferredTime}:00`;
      }

      const start = new Date(startDateTime);
      const end = new Date(start.getTime() + 60 * 60 * 1000); // Default 1 hour

      const res = await this._request(
        `${GCAL_API}/calendars/${encodeURIComponent(this.calendarId)}/events`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.credentials.access_token}` },
          body: JSON.stringify({
            summary: `${data.service || 'Appointment'} — ${data.customerName || 'Client'}`,
            description: [
              `Service: ${data.service || 'N/A'}`,
              `Phone: ${data.customerPhone || 'N/A'}`,
              `Booked via VelosLuxe AI`
            ].join('\n'),
            start: { dateTime: start.toISOString() },
            end: { dateTime: end.toISOString() }
          })
        }
      );

      if (res.ok) {
        return { success: true, confirmed: true, externalId: res.body?.id || null, message: 'Event created in Google Calendar' };
      }
      return { success: false, confirmed: false, externalId: null, message: `Google Calendar API error: ${res.status}` };
    } catch (err) {
      return { success: false, confirmed: false, externalId: null, message: err.message };
    }
  }

  async createContact(data) {
    return { success: false, externalId: null, message: 'Google Calendar does not support contact creation' };
  }

  async testConnection() {
    try {
      const res = await this._request(
        `${GCAL_API}/calendars/${encodeURIComponent(this.calendarId)}`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${this.credentials.access_token}` }
        }
      );
      return { success: res.ok, message: res.ok ? 'Connected to Google Calendar' : `Google Calendar API error: ${res.status}` };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }
}

module.exports = GoogleCalendarAdapter;
