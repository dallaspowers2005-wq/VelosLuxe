// Vagaro adapter — REST API integration for booking + CRM

const BaseAdapter = require('./base-adapter');

const VAGARO_API_BASE = 'https://api.vagaro.com/v1';

class VagaroAdapter extends BaseAdapter {
  static platformName = 'vagaro';
  static displayName = 'Vagaro';
  static authType = 'partner_key';
  static capabilities = { booking: true, crm: true };
  static credentialFields = [
    { key: 'partner_key', label: 'Partner Key', type: 'text' },
    { key: 'api_key', label: 'API Key', type: 'text' }
  ];
  static configFields = [
    { key: 'business_id', label: 'Business ID', type: 'text' },
    { key: 'location_id', label: 'Location ID', type: 'text' },
    { key: 'service_map', label: 'Service Map (JSON)', type: 'textarea' }
  ];

  get headers() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.credentials.api_key}`,
      'X-Partner-Key': this.credentials.partner_key
    };
  }

  async createAppointment(data) {
    try {
      const serviceMap = this.config.service_map ? JSON.parse(this.config.service_map) : {};
      const serviceId = serviceMap[data.service] || serviceMap['default'] || null;

      const res = await this._request(`${VAGARO_API_BASE}/businesses/${this.config.business_id}/appointments`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          location_id: this.config.location_id,
          service_id: serviceId,
          customer: {
            first_name: (data.customerName || '').split(' ')[0],
            last_name: (data.customerName || '').split(' ').slice(1).join(' ') || '',
            phone: data.customerPhone,
            email: data.customerEmail || null
          },
          preferred_date: data.preferredDate,
          preferred_time: data.preferredTime,
          notes: `Booked via VelosLuxe AI — ${data.service || 'General'}`
        })
      });

      if (res.ok) {
        const extId = res.body?.id || res.body?.appointment_id || null;
        return { success: true, confirmed: true, externalId: extId, message: 'Appointment created in Vagaro' };
      }
      return { success: false, confirmed: false, externalId: null, message: `Vagaro API error: ${res.status}` };
    } catch (err) {
      return { success: false, confirmed: false, externalId: null, message: err.message };
    }
  }

  async createContact(data) {
    try {
      const res = await this._request(`${VAGARO_API_BASE}/businesses/${this.config.business_id}/customers`, {
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
        return { success: true, externalId: res.body?.id || null, message: 'Contact created in Vagaro' };
      }
      return { success: false, externalId: null, message: `Vagaro API error: ${res.status}` };
    } catch (err) {
      return { success: false, externalId: null, message: err.message };
    }
  }

  async testConnection() {
    try {
      const res = await this._request(`${VAGARO_API_BASE}/businesses/${this.config.business_id}`, {
        method: 'GET',
        headers: this.headers
      });
      return { success: res.ok, message: res.ok ? 'Connected to Vagaro' : `Vagaro API error: ${res.status}` };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }
}

module.exports = VagaroAdapter;
