// Zoom API — Server-to-Server OAuth
// Creates unique meeting links for strategy calls

let credentials = null;
let accessToken = null;
let tokenExpiry = 0;

function init() {
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;

  if (accountId && clientId && clientSecret) {
    credentials = { accountId, clientId, clientSecret };
    console.log('Zoom API initialized');
  } else {
    console.log('No Zoom credentials — Zoom disabled');
  }
}

async function getAccessToken() {
  if (!credentials) return null;
  if (accessToken && Date.now() < tokenExpiry - 60000) return accessToken;

  try {
    const auth = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64');
    const res = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${credentials.accountId}`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}` },
    });
    const data = await res.json();
    if (data.access_token) {
      accessToken = data.access_token;
      tokenExpiry = Date.now() + (data.expires_in * 1000);
      return accessToken;
    }
    console.error('Zoom token error:', data);
    return null;
  } catch (err) {
    console.error('Zoom token fetch failed:', err.message);
    return null;
  }
}

async function createMeeting(booking) {
  const token = await getAccessToken();
  if (!token) return null;

  const startTime = new Date(booking.start_time).toISOString();
  const firstName = booking.name.split(' ')[0];

  try {
    const res = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic: `VelosLuxe Strategy Call — ${booking.name}`,
        type: 2, // scheduled
        start_time: startTime,
        duration: 30,
        timezone: 'America/Phoenix',
        agenda: `Strategy call with ${booking.name}${booking.spa_name ? ' from ' + booking.spa_name : ''}. We'll walk through their specific revenue leaks and show them how VelosLuxe can help.`,
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: true,
          waiting_room: false,
          auto_recording: 'none',
        },
      }),
    });

    const data = await res.json();
    if (data.join_url) {
      console.log('Zoom meeting created:', data.join_url);
      return {
        join_url: data.join_url,
        meeting_id: data.id,
        password: data.password || null,
      };
    }
    console.error('Zoom create meeting error:', data);
    return null;
  } catch (err) {
    console.error('Zoom create meeting failed:', err.message);
    return null;
  }
}

module.exports = { init, createMeeting };
