// Mangomint adapter — REST API integration for booking + CRM

const BaseAdapter = require('./base-adapter');

const MANGOMINT_API = 'https://api.mangomint.com/v1';

class MangomintAdapter extends BaseAdapter {
  static platformName = 'mangomint';
  static displayName = 'Mangomint';
  static authType = 'api_key';
  static capabilities = { booking: true, crm: true };
  static credentialFields = [
    { key: 'api_key', label: 'API Key', type: 'text' }
  ];
  static configFields = [
    { key: 'location_id', label: 'Location ID', type: 'text' },
    { key: 'service_map', label: 'Service Map (JSON)', type: 'textarea' }
  ];

  get headers() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.credentials.api_key}`
    };
  }

  async createAppointment(data) {
    try {
      const serviceMap = this.config.service_map ? JSON.parse(this.config.service_map) : {};
      const serviceId = serviceMap[data.service] || serviceMap['default'] || null;

      const res = await this._request(`${MANGOMINT_API}/appointments`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          location_id: this.config.location_id,
          service_id: serviceId,
          client: {
            first_name: (data.customerName || '').split(' ')[0],
            last_name: (data.customerName || '').split(' ').slice(1).join(' ') || '',
            phone: data.customerPhone,
            email: data.customerEmail || null
          },
          start_at: data.appointmentTime ? new Date(data.appointmentTime).toISOString() : null,
          notes: `Booked via VelosLuxe AI — ${data.service || 'General'}`
        })
      });

      if (res.ok) {
        const extId = res.body?.id || null;
        return { success: true, confirmed: true, externalId: extId, message: 'Appointment created in Mangomint' };
      }
      return { success: false, confirmed: false, externalId: null, message: `Mangomint API error: ${res.status}` };
    } catch (err) {
      return { success: false, confirmed: false, externalId: null, message: err.message };
    }
  }

  async createContact(data) {
    try {
      const res = await this._request(`${MANGOMINT_API}/clients`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          first_name: (data.name || '').split(' ')[0],
          last_name: (data.name || '').split(' ').slice(1).join(' ') || '',
          phone: data.phone,
          email: data.email || null,
          notes: data.notes || 'Added via VelosLuxe AI'
        })
      });

      if (res.ok) {
        return { success: true, externalId: res.body?.id || null, message: 'Contact created in Mangomint' };
      }
      return { success: false, externalId: null, message: `Mangomint API error: ${res.status}` };
    } catch (err) {
      return { success: false, externalId: null, message: err.message };
    }
  }

  async testConnection() {
    try {
      const res = await this._request(`${MANGOMINT_API}/locations`, {
        method: 'GET',
        headers: this.headers
      });
      return { success: res.ok, message: res.ok ? 'Connected to Mangomint' : `Mangomint API error: ${res.status}` };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }
}

module.exports = MangomintAdapter;
