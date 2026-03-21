// Zenoti adapter — REST API integration for booking + CRM

const BaseAdapter = require('./base-adapter');

const ZENOTI_API = 'https://api.zenoti.com/v1';

class ZenotiAdapter extends BaseAdapter {
  static platformName = 'zenoti';
  static displayName = 'Zenoti';
  static authType = 'api_key';
  static capabilities = { booking: true, crm: true };
  static credentialFields = [
    { key: 'api_key', label: 'API Key', type: 'text' }
  ];
  static configFields = [
    { key: 'center_id', label: 'Center ID', type: 'text' },
    { key: 'service_map', label: 'Service Map (JSON)', type: 'textarea' }
  ];

  get headers() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `apikey ${this.credentials.api_key}`
    };
  }

  async createAppointment(data) {
    try {
      const serviceMap = this.config.service_map ? JSON.parse(this.config.service_map) : {};
      const serviceId = serviceMap[data.service] || serviceMap['default'] || null;

      // First create/find guest
      const guestRes = await this._request(`${ZENOTI_API}/guests`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          center_id: this.config.center_id,
          personal_info: {
            first_name: (data.customerName || '').split(' ')[0],
            last_name: (data.customerName || '').split(' ').slice(1).join(' ') || '',
            mobile_phone: { number: data.customerPhone },
            email: data.customerEmail || null
          }
        })
      });

      const guestId = guestRes.body?.id || guestRes.body?.guest_id || null;

      // Book appointment
      const res = await this._request(`${ZENOTI_API}/appointments`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          center_id: this.config.center_id,
          guest_id: guestId,
          service_id: serviceId,
          date: data.preferredDate,
          start_time: data.preferredTime,
          notes: `Booked via VelosLuxe AI — ${data.service || 'General'}`
        })
      });

      if (res.ok) {
        const extId = res.body?.id || res.body?.appointment_id || null;
        return { success: true, confirmed: true, externalId: extId, message: 'Appointment created in Zenoti' };
      }
      return { success: false, confirmed: false, externalId: null, message: `Zenoti API error: ${res.status}` };
    } catch (err) {
      return { success: false, confirmed: false, externalId: null, message: err.message };
    }
  }

  async createContact(data) {
    try {
      const res = await this._request(`${ZENOTI_API}/guests`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          center_id: this.config.center_id,
          personal_info: {
            first_name: (data.name || '').split(' ')[0],
            last_name: (data.name || '').split(' ').slice(1).join(' ') || '',
            mobile_phone: { number: data.phone },
            email: data.email || null
          }
        })
      });

      if (res.ok) {
        return { success: true, externalId: res.body?.id || null, message: 'Guest created in Zenoti' };
      }
      return { success: false, externalId: null, message: `Zenoti API error: ${res.status}` };
    } catch (err) {
      return { success: false, externalId: null, message: err.message };
    }
  }

  async testConnection() {
    try {
      const res = await this._request(`${ZENOTI_API}/centers/${this.config.center_id}`, {
        method: 'GET',
        headers: this.headers
      });
      return { success: res.ok, message: res.ok ? 'Connected to Zenoti' : `Zenoti API error: ${res.status}` };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }
}

module.exports = ZenotiAdapter;
