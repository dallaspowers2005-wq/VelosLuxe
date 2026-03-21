// Base adapter class — all platform integrations extend this

class BaseAdapter {
  // Static metadata — subclasses override these
  static platformName = 'base';
  static displayName = 'Base';
  static authType = 'api_key';
  static capabilities = { booking: false, crm: false };
  static credentialFields = [];
  static configFields = [];

  constructor(integrationRow) {
    this.integrationId = integrationRow.id;
    this.clientId = integrationRow.client_id;
    this.status = integrationRow.status;
    this.credentials = {};
    this.config = {};

    try {
      this.credentials = integrationRow.credentials ? JSON.parse(integrationRow.credentials) : {};
    } catch (e) {
      console.error(`Failed to parse credentials for integration ${integrationRow.id}:`, e.message);
    }

    try {
      this.config = integrationRow.config ? JSON.parse(integrationRow.config) : {};
    } catch (e) {
      console.error(`Failed to parse config for integration ${integrationRow.id}:`, e.message);
    }
  }

  async createAppointment(data) {
    return { success: false, confirmed: false, externalId: null, message: 'Not supported by this adapter' };
  }

  async createContact(data) {
    return { success: false, externalId: null, message: 'Not supported by this adapter' };
  }

  async testConnection() {
    return { success: false, message: 'Not implemented' };
  }

  // Helper for HTTP requests with consistent error handling
  async _request(url, opts = {}) {
    const res = await fetch(url, {
      ...opts,
      headers: { 'Content-Type': 'application/json', ...opts.headers }
    });
    const body = await res.text();
    let json;
    try { json = JSON.parse(body); } catch { json = null; }
    return { ok: res.ok, status: res.status, body: json || body };
  }
}

module.exports = BaseAdapter;
