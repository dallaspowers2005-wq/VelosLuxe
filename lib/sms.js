// Generic SMS sender using Vonage REST API
async function sendSMS(phone, message) {
  if (!process.env.VONAGE_API_KEY || !process.env.VONAGE_API_SECRET) {
    console.log('Vonage not configured — skipping SMS to', phone);
    return false;
  }
  try {
    const res = await fetch('https://rest.nexmo.com/sms/json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.VONAGE_API_KEY,
        api_secret: process.env.VONAGE_API_SECRET,
        from: process.env.VONAGE_PHONE_NUMBER || '12053832837',
        to: phone.replace(/\D/g, ''),
        text: message
      })
    });
    const data = await res.json();
    if (data.messages && data.messages[0].status === '0') {
      console.log('SMS sent to', phone, '— ID:', data.messages[0]['message-id']);
      return true;
    } else {
      console.error('SMS error:', data.messages?.[0]?.['error-text'] || 'Unknown error');
      return false;
    }
  } catch (err) {
    console.error('SMS failed to', phone, ':', err.message);
    return false;
  }
}

// Legacy wrapper for existing follow-up SMS
async function sendFollowUpSMS(phone, name) {
  const message = `Hi${name ? ' ' + name : ''}! Thanks for speaking with Sophia at VelosLuxe. We'd love to help your med spa never miss a lead again. Reply here or call us back anytime at (740) 301-8119.`;
  return sendSMS(phone, message);
}

module.exports = { sendSMS, sendFollowUpSMS };
