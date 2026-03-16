// Generic SMS sender using Twilio REST API
// Supports per-client fromNumber override

async function sendSMS(phone, message, opts = {}) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.log('Twilio not configured — skipping SMS to', phone);
    return false;
  }
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = opts.fromNumber || process.env.TWILIO_PHONE_NUMBER;

    const toNumber = '+' + phone.replace(/\D/g, '');
    const params = new URLSearchParams({
      To: toNumber,
      From: fromNumber,
      Body: message
    });

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(accountSid + ':' + authToken).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const data = await res.json();
    if (res.ok && data.sid) {
      console.log('SMS sent to', phone, '— SID:', data.sid);
      return true;
    } else {
      console.error('SMS error:', data.message || data.code || 'Unknown error');
      return false;
    }
  } catch (err) {
    console.error('SMS failed to', phone, ':', err.message);
    return false;
  }
}

// Follow-up SMS for a client's caller
async function sendFollowUpSMS(phone, name, client) {
  if (client) {
    const spaName = client.name || 'our spa';
    const message = `Hi${name ? ' ' + name : ''}! Thanks for speaking with Sophia at ${spaName}. We'd love to help you — reply here or call us back anytime!`;
    return sendSMS(phone, message, { fromNumber: client.sms_phone_number });
  }
  // Legacy fallback for VelosLuxe's own calls
  const message = `Hi${name ? ' ' + name : ''}! Thanks for speaking with Sophia at VelosLuxe. We'd love to help your med spa never miss a lead again. Reply here or call us back anytime at (740) 301-8119.`;
  return sendSMS(phone, message);
}

module.exports = { sendSMS, sendFollowUpSMS };
