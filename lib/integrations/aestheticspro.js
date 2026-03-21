// AestheticsPro adapter — limited API, CRM only (booking returns manual confirmation)

const BaseAdapter = require('./base-adapter');

const AESTHETICSPRO_API = 'https://api.aestheticspro.com/v1';

class AestheticsProAdapter extends BaseAdapter {
  static platformName = 'aestheticspro';
  static displayName = 'AestheticsPro';
  static authType = 'api_key';
  static capabilities = { booking: false, crm: true };
  static credentialFields = [
    { key: 'api_key', label: 'API Key', type: 'text' }
  ];
  static configFields = [
    { key: 'practice_id', label: 'Practice ID', type: 'text' }
  ];

  get headers() {
    return {
      'Content-Type': 'application/json',
      'X-API-Key': this.credentials.api_key
    };
  }

  async createAppointment(data) {
    // AestheticsPro has limited booking API — send as lead/request for manual confirmation
    try {
      const res = await this._request(`${AESTHETICSPRO_API}/practices/${this.config.practice_id}/leads`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          first_name: (data.customerName || '').split(' ')[0],
          last_name: (data.customerName || '').split(' ').slice(1).join(' ') || '',
          phone: data.customerPhone,
          email: data.customerEmail || null,
          type: 'appointment_request',
          notes: `Appointment request via VelosLuxe AI: ${data.service || 'General'} on ${data.preferredDate || 'TBD'} at ${data.preferredTime || 'TBD'}`
        })
      });

      return {
        success: res.ok,
        confirmed: false,
        externalId: res.body?.id || null,
        message: res.ok ? 'Appointment request sent to AestheticsPro for manual confirmation' : `AestheticsPro API error: ${res.status}`
      };
    } catch (err) {
      return { success: false, confirmed: false, externalId: null, message: err.message };
    }
  }

  async createContact(data) {
    try {
      const res = await this._request(`${AESTHETICSPRO_API}/practices/${this.config.practice_id}/patients`, {
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
        return { success: true, externalId: res.body?.id || null, message: 'Patient created in AestheticsPro' };
      }
      return { success: false, externalId: null, message: `AestheticsPro API error: ${res.status}` };
    } catch (err) {
      return { success: false, externalId: null, message: err.message };
    }
  }

  async testConnection() {
    try {
      const res = await this._request(`${AESTHETICSPRO_API}/practices/${this.config.practice_id}`, {
        method: 'GET',
        headers: this.headers
      });
      return { success: res.ok, message: res.ok ? 'Connected to AestheticsPro' : `AestheticsPro API error: ${res.status}` };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }
}

module.exports = AestheticsProAdapter;
