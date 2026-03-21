// Boulevard adapter — GraphQL API integration for booking + CRM

const BaseAdapter = require('./base-adapter');

const BOULEVARD_API = 'https://dashboard.boulevard.io/api/2020-01/';

class BoulevardAdapter extends BaseAdapter {
  static platformName = 'boulevard';
  static displayName = 'Boulevard';
  static authType = 'oauth';
  static capabilities = { booking: true, crm: true };
  static credentialFields = [
    { key: 'access_token', label: 'Access Token', type: 'text', oauth: true },
    { key: 'refresh_token', label: 'Refresh Token', type: 'text', oauth: true }
  ];
  static configFields = [
    { key: 'location_id', label: 'Location ID', type: 'text' },
    { key: 'service_map', label: 'Service Map (JSON)', type: 'textarea' }
  ];
  static oauthConfig = {
    authorizeUrl: 'https://dashboard.boulevard.io/oauth/authorize',
    tokenUrl: 'https://dashboard.boulevard.io/oauth/token',
    scopes: 'appointments:write clients:write'
  };

  get headers() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.credentials.access_token}`
    };
  }

  async _graphql(query, variables = {}) {
    return this._request(BOULEVARD_API, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ query, variables })
    });
  }

  async createAppointment(data) {
    try {
      const serviceMap = this.config.service_map ? JSON.parse(this.config.service_map) : {};
      const serviceId = serviceMap[data.service] || serviceMap['default'] || null;

      const query = `
        mutation CreateAppointment($input: CreateAppointmentInput!) {
          createAppointment(input: $input) {
            appointment { id state }
          }
        }
      `;
      const variables = {
        input: {
          locationId: this.config.location_id,
          serviceId,
          clientName: data.customerName,
          clientPhone: data.customerPhone,
          clientEmail: data.customerEmail || null,
          startAt: data.appointmentTime ? new Date(data.appointmentTime).toISOString() : null,
          notes: `Booked via VelosLuxe AI — ${data.service || 'General'}`
        }
      };

      const res = await this._graphql(query, variables);
      if (res.ok && res.body?.data?.createAppointment) {
        const appt = res.body.data.createAppointment.appointment;
        return { success: true, confirmed: true, externalId: appt.id, message: 'Appointment created in Boulevard' };
      }
      const errors = res.body?.errors?.map(e => e.message).join(', ') || `API error: ${res.status}`;
      return { success: false, confirmed: false, externalId: null, message: errors };
    } catch (err) {
      return { success: false, confirmed: false, externalId: null, message: err.message };
    }
  }

  async createContact(data) {
    try {
      const query = `
        mutation CreateClient($input: CreateClientInput!) {
          createClient(input: $input) {
            client { id }
          }
        }
      `;
      const variables = {
        input: {
          firstName: (data.name || '').split(' ')[0],
          lastName: (data.name || '').split(' ').slice(1).join(' ') || '',
          mobilePhone: data.phone,
          email: data.email || null,
          locationId: this.config.location_id,
          notes: data.notes || 'Added via VelosLuxe AI'
        }
      };

      const res = await this._graphql(query, variables);
      if (res.ok && res.body?.data?.createClient) {
        return { success: true, externalId: res.body.data.createClient.client.id, message: 'Contact created in Boulevard' };
      }
      const errors = res.body?.errors?.map(e => e.message).join(', ') || `API error: ${res.status}`;
      return { success: false, externalId: null, message: errors };
    } catch (err) {
      return { success: false, externalId: null, message: err.message };
    }
  }

  async testConnection() {
    try {
      const query = `{ locations { edges { node { id name } } } }`;
      const res = await this._graphql(query);
      if (res.ok && res.body?.data) {
        return { success: true, message: 'Connected to Boulevard' };
      }
      return { success: false, message: `Boulevard API error: ${res.status}` };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }
}

module.exports = BoulevardAdapter;
