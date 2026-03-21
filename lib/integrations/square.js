// Square adapter — OAuth, Bookings API + Customers API

const BaseAdapter = require('./base-adapter');

const SQUARE_API = 'https://connect.squareup.com/v2';

class SquareAdapter extends BaseAdapter {
  static platformName = 'square';
  static displayName = 'Square';
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
    authorizeUrl: 'https://connect.squareup.com/oauth2/authorize',
    tokenUrl: 'https://connect.squareup.com/oauth2/token',
    scopes: 'APPOINTMENTS_WRITE CUSTOMERS_WRITE'
  };

  get headers() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.credentials.access_token}`,
      'Square-Version': '2024-01-18'
    };
  }

  async createAppointment(data) {
    try {
      const serviceMap = this.config.service_map ? JSON.parse(this.config.service_map) : {};
      const serviceVariationId = serviceMap[data.service] || serviceMap['default'] || null;

      // Create or find customer first
      const customerResult = await this.createContact({
        name: data.customerName,
        phone: data.customerPhone,
        email: data.customerEmail
      });

      let startAt = data.appointmentTime;
      if (data.preferredDate && data.preferredTime) {
        startAt = new Date(`${data.preferredDate}T${data.preferredTime}:00`).toISOString();
      }

      const bookingBody = {
        booking: {
          location_id: this.config.location_id,
          customer_id: customerResult.externalId || undefined,
          start_at: startAt,
          appointment_segments: serviceVariationId ? [{
            service_variation_id: serviceVariationId,
            duration_minutes: 60
          }] : [],
          customer_note: `Booked via VelosLuxe AI — ${data.service || 'General'}`
        }
      };

      const res = await this._request(`${SQUARE_API}/bookings`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(bookingBody)
      });

      if (res.ok) {
        const extId = res.body?.booking?.id || null;
        return { success: true, confirmed: true, externalId: extId, message: 'Booking created in Square' };
      }
      const errMsg = res.body?.errors?.map(e => e.detail).join(', ') || `Square API error: ${res.status}`;
      return { success: false, confirmed: false, externalId: null, message: errMsg };
    } catch (err) {
      return { success: false, confirmed: false, externalId: null, message: err.message };
    }
  }

  async createContact(data) {
    try {
      const res = await this._request(`${SQUARE_API}/customers`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          given_name: (data.name || '').split(' ')[0],
          family_name: (data.name || '').split(' ').slice(1).join(' ') || '',
          phone_number: data.phone,
          email_address: data.email || null,
          note: data.notes || 'Added via VelosLuxe AI'
        })
      });

      if (res.ok) {
        return { success: true, externalId: res.body?.customer?.id || null, message: 'Customer created in Square' };
      }
      const errMsg = res.body?.errors?.map(e => e.detail).join(', ') || `Square API error: ${res.status}`;
      return { success: false, externalId: null, message: errMsg };
    } catch (err) {
      return { success: false, externalId: null, message: err.message };
    }
  }

  async testConnection() {
    try {
      const res = await this._request(`${SQUARE_API}/locations/${this.config.location_id}`, {
        method: 'GET',
        headers: this.headers
      });
      return { success: res.ok, message: res.ok ? 'Connected to Square' : `Square API error: ${res.status}` };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }
}

module.exports = SquareAdapter;
