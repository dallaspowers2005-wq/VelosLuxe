/**
 * Conversion tracking — Zapier webhook + Facebook Conversion API
 * Fires on key conversion events so the marketer can track volume.
 */

const crypto = require('crypto');

const ZAPIER_WEBHOOK = process.env.ZAPIER_WEBHOOK_URL;
const FB_PIXEL_ID = process.env.FB_PIXEL_ID;
const FB_CAPI_TOKEN = process.env.FB_CONVERSION_API_TOKEN;

function hashSHA256(value) {
  if (!value) return null;
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

/**
 * Fire a conversion event to both Zapier and Facebook CAPI
 * @param {string} eventName - e.g. 'Lead', 'Schedule', 'CompleteRegistration'
 * @param {object} data - { name, email, phone, spa_name, source, value }
 * @param {object} opts - { sourceUrl, userAgent, ip, eventId }
 */
async function trackConversion(eventName, data = {}, opts = {}) {
  const promises = [];

  // 1. Zapier webhook
  if (ZAPIER_WEBHOOK) {
    promises.push(fireZapier(eventName, data).catch(err => {
      console.error('Zapier webhook error:', err.message);
    }));
  }

  // 2. Facebook Conversion API
  if (FB_PIXEL_ID && FB_CAPI_TOKEN) {
    promises.push(fireFacebookCAPI(eventName, data, opts).catch(err => {
      console.error('Facebook CAPI error:', err.message);
    }));
  }

  if (promises.length === 0) {
    console.log('Tracking: no webhooks configured, skipping', eventName);
  }

  await Promise.allSettled(promises);
}

async function fireZapier(eventName, data) {
  const payload = {
    event: eventName,
    timestamp: new Date().toISOString(),
    name: data.name || null,
    email: data.email || null,
    phone: data.phone || null,
    spa_name: data.spa_name || null,
    source: data.source || null,
    value: data.value || null
  };

  const res = await fetch(ZAPIER_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error(`Zapier returned ${res.status}`);
  }
  console.log(`Zapier: fired ${eventName} for ${data.name || 'unknown'}`);
}

async function fireFacebookCAPI(eventName, data, opts) {
  const eventTime = Math.floor(Date.now() / 1000);
  const eventId = opts.eventId || `${eventName}_${eventTime}_${Math.random().toString(36).slice(2, 8)}`;

  const userData = {};
  if (data.email) userData.em = [hashSHA256(data.email)];
  if (data.phone) userData.ph = [hashSHA256(data.phone.replace(/\D/g, ''))];
  if (data.name) {
    const parts = data.name.trim().split(/\s+/);
    userData.fn = [hashSHA256(parts[0])];
    if (parts.length > 1) userData.ln = [hashSHA256(parts[parts.length - 1])];
  }
  if (opts.ip) userData.client_ip_address = opts.ip;
  if (opts.userAgent) userData.client_user_agent = opts.userAgent;

  const eventData = {
    event_name: eventName,
    event_time: eventTime,
    event_id: eventId,
    action_source: 'website',
    event_source_url: opts.sourceUrl || 'https://velosluxe.com',
    user_data: userData
  };

  if (data.value) {
    eventData.custom_data = {
      currency: 'USD',
      value: data.value
    };
  }

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${FB_PIXEL_ID}/events?access_token=${FB_CAPI_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [eventData] })
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Facebook CAPI ${res.status}: ${body}`);
  }
  console.log(`Facebook CAPI: fired ${eventName} (event_id: ${eventId})`);
  return eventId;
}

module.exports = { trackConversion };
