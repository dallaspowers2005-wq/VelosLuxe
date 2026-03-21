// Acuity Scheduling adapter — REST API with HTTP Basic auth, booking only

const BaseAdapter = require('./base-adapter');

const ACUITY_API = 'https://acuityscheduling.com/api/v1';

class AcuityAdapter extends BaseAdapter {
  static platformName = 'acuity';
  static displayName = 'Acuity Scheduling';
  static authType = 'api_key';
  static capabilities = { booking: true, crm: false };
  static credentialFields = [
    { key: 'user_id', label: 'User ID', type: 'text' },
    { key: 'api_key', label: 'API Key', type: 'text' }
  ];
  static configFields = [
    { key: 'calendar_id', label: 'Calendar ID', type: 'text' },
    { key: 'service_map', label: 'Service Map (JSON)', type: 'textarea' }
  ];

  get authHeader() {
    const encoded = Buffer.from(`${this.credentials.user_id}:${this.credentials.api_key}`).toString('base64');
    return `Basic ${encoded}`;
  }

  async createAppointment(data) {
    try {
      const serviceMap = this.config.service_map ? JSON.parse(this.config.service_map) : {};
      const appointmentTypeID = serviceMap[data.service] || serviceMap['default'] || null;

      let datetime = data.appointmentTime;
      if (data.preferredDate && data.preferredTime) {
        datetime = `${data.preferredDate}T${data.preferredTime}:00`;
      }

      const body = {
        datetime,
        appointmentTypeID,
        calendarID: this.config.calendar_id || undefined,
        firstName: (data.customerName || '').split(' ')[0],
        lastName: (data.customerName || '').split(' ').slice(1).join(' ') || '',
        phone: data.customerPhone,
        email: data.customerEmail || '',
        notes: `Booked via VelosLuxe AI — ${data.service || 'General'}`
      };

      const res = await this._request(`${ACUITY_API}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': this.authHeader },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        return { success: true, confirmed: true, externalId: res.body?.id || null, message: 'Appointment created in Acuity' };
      }
      const errMsg = res.body?.message || `Acuity API error: ${res.status}`;
      return { success: false, confirmed: false, externalId: null, message: errMsg };
    } catch (err) {
      return { success: false, confirmed: false, externalId: null, message: err.message };
    }
  }

  async createContact(data) {
    return { success: false, externalId: null, message: 'Acuity does not support standalone contact creation' };
  }

  async testConnection() {
    try {
      const res = await this._request(`${ACUITY_API}/me`, {
        method: 'GET',
        headers: { 'Authorization': this.authHeader }
      });
      return { success: res.ok, message: res.ok ? 'Connected to Acuity Scheduling' : `Acuity API error: ${res.status}` };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }
}

module.exports = AcuityAdapter;
