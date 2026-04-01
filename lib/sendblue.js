// SendBlue iMessage API
// Sends iMessages via SendBlue for booking reminders

let configured = false;
let apiKey = null;
let apiSecret = null;
let fromNumber = null;

function init() {
  apiKey = process.env.SENDBLUE_API_KEY;
  apiSecret = process.env.SENDBLUE_API_SECRET;
  fromNumber = process.env.SENDBLUE_FROM_NUMBER;

  if (apiKey && apiSecret) {
    configured = true;
    console.log('SendBlue iMessage initialized');
  } else {
    console.log('No SendBlue credentials — iMessage disabled, falling back to SMS');
  }
}

function isConfigured() {
  return configured;
}

async function sendMessage(phone, content, opts = {}) {
  if (!configured) {
    console.log('SendBlue not configured — skipping iMessage to', phone);
    return false;
  }

  const toNumber = '+' + phone.replace(/\D/g, '');

  try {
    const payload = {
      number: toNumber,
      content,
    };
    if (fromNumber) payload.from_number = fromNumber;
    if (opts.mediaUrl) payload.media_url = opts.mediaUrl;
    if (opts.statusCallback) payload.status_callback = opts.statusCallback;

    const res = await fetch('https://api.sendblue.com/api/send-message', {
      method: 'POST',
      headers: {
        'sb-api-key-id': apiKey,
        'sb-api-secret-key': apiSecret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (res.ok && data.status !== 'ERROR') {
      console.log('iMessage sent to', phone);
      return true;
    } else {
      console.error('SendBlue error:', data.error_message || data.status || 'Unknown error');
      return false;
    }
  } catch (err) {
    console.error('SendBlue failed to', phone, ':', err.message);
    return false;
  }
}

module.exports = { init, isConfigured, sendMessage };
