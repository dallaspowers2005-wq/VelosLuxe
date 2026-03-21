// Webhook adapter — wraps the existing generic webhook POST logic

const BaseAdapter = require('./base-adapter');

class WebhookAdapter extends BaseAdapter {
  static platformName = 'webhook';
  static displayName = 'Custom Webhook';
  static authType = 'webhook_url';
  static capabilities = { booking: true, crm: true };
  static credentialFields = [
    { key: 'url', label: 'Webhook URL', type: 'url' }
  ];
  static configFields = [];

  async createAppointment(data) {
    const url = this.credentials.url;
    if (!url) return { success: false, confirmed: false, externalId: null, message: 'No webhook URL configured' };

    try {
      const res = await this._request(url, {
        method: 'POST',
        body: JSON.stringify({
          source: 'velosluxe_ai_call',
          type: 'booking',
          customer_name: data.customerName,
          customer_phone: data.customerPhone,
          service: data.service,
          preferred_date: data.preferredDate,
          preferred_time: data.preferredTime,
          appointment_time: data.appointmentTime,
          timestamp: new Date().toISOString()
        })
      });

      return {
        success: res.ok,
        confirmed: res.ok,
        externalId: null,
        message: res.ok ? 'Webhook delivered' : `Webhook returned ${res.status}`
      };
    } catch (err) {
      return { success: false, confirmed: false, externalId: null, message: err.message };
    }
  }

  async createContact(data) {
    const url = this.credentials.url;
    if (!url) return { success: false, externalId: null, message: 'No webhook URL configured' };

    try {
      const res = await this._request(url, {
        method: 'POST',
        body: JSON.stringify({
          source: 'velosluxe',
          type: 'contact',
          timestamp: new Date().toISOString(),
          ...data
        })
      });

      return {
        success: res.ok,
        externalId: null,
        message: res.ok ? 'Webhook delivered' : `Webhook returned ${res.status}`
      };
    } catch (err) {
      return { success: false, externalId: null, message: err.message };
    }
  }

  async testConnection() {
    const url = this.credentials.url;
    if (!url) return { success: false, message: 'No webhook URL configured' };

    try {
      const res = await this._request(url, {
        method: 'POST',
        body: JSON.stringify({ source: 'velosluxe', type: 'test', timestamp: new Date().toISOString() })
      });
      return { success: res.ok, message: res.ok ? 'Webhook responded OK' : `Webhook returned ${res.status}` };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }
}

module.exports = WebhookAdapter;
