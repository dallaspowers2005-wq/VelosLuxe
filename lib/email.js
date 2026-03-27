// Email sending via Resend
const { Resend } = require('resend');

let resend;
const FROM = 'VelosLuxe <hello@velosluxe.com>';

function init() {
  if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
    console.log('Resend email initialized');
  } else {
    console.log('No RESEND_API_KEY — email disabled');
  }
}

async function send(to, subject, html) {
  if (!resend) {
    console.log('Email skipped (no Resend key):', subject);
    return false;
  }
  try {
    const { data, error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) {
      console.error('Email error:', error.message);
      return false;
    }
    console.log('Email sent:', subject, '→', to);
    return true;
  } catch (err) {
    console.error('Email failed:', err.message);
    return false;
  }
}

// ═══ STRATEGY CALL EMAILS ═══

async function sendBookingConfirmation(booking, qualifying) {
  const date = new Date(booking.start_time);
  const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Phoenix' });

  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a2e;">
      <div style="padding: 40px 32px; background: #ffffff; border-radius: 16px; border: 1px solid #e8e8f0;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 14px; letter-spacing: 3px; color: #c9a46c; margin: 0; font-weight: 700;">VELOSLUXE</h1>
        </div>

        <h2 style="font-size: 24px; margin: 0 0 8px; color: #1a1a2e; font-weight: 700;">You're confirmed!</h2>
        <p style="color: #6b6b80; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
          We're looking forward to speaking with you. Our team will review your information beforehand so we can make every minute count.
        </p>

        <div style="background: #f8f7fc; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b6b80; font-size: 14px;">Date</td>
              <td style="padding: 8px 0; color: #1a1a2e; font-size: 14px; font-weight: 600; text-align: right;">${dateStr}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b6b80; font-size: 14px;">Time</td>
              <td style="padding: 8px 0; color: #1a1a2e; font-size: 14px; font-weight: 600; text-align: right;">${timeStr} MST</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b6b80; font-size: 14px;">Duration</td>
              <td style="padding: 8px 0; color: #1a1a2e; font-size: 14px; font-weight: 600; text-align: right;">30 minutes</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b6b80; font-size: 14px;">Type</td>
              <td style="padding: 8px 0; color: #1a1a2e; font-size: 14px; font-weight: 600; text-align: right;">Phone Call</td>
            </tr>
          </table>
        </div>

        <h3 style="font-size: 16px; margin: 0 0 12px; color: #1a1a2e;">What to expect</h3>
        <ul style="color: #6b6b80; font-size: 14px; line-height: 1.8; padding-left: 20px; margin: 0 0 24px;">
          <li>We'll analyze where your med spa is losing revenue right now</li>
          <li>You'll see exactly how AI-powered response works (live demo)</li>
          <li>We'll map out a recovery plan specific to your practice</li>
          <li>Zero pressure — walk away with actionable insights either way</li>
        </ul>

        <div style="text-align: center; padding: 24px 0 8px; border-top: 1px solid #f0f0f5;">
          <p style="color: #a0a0b0; font-size: 12px; margin: 0;">
            Questions? Reply to this email or call us at (740) 301-8119
          </p>
        </div>
      </div>
    </div>
  `;

  return send(booking.email, `You're booked — ${dateStr} at ${timeStr}`, html);
}

async function sendReminder24h(booking) {
  const date = new Date(booking.start_time);
  const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Phoenix' });

  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a2e;">
      <div style="padding: 40px 32px; background: #ffffff; border-radius: 16px; border: 1px solid #e8e8f0;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 14px; letter-spacing: 3px; color: #c9a46c; margin: 0; font-weight: 700;">VELOSLUXE</h1>
        </div>

        <h2 style="font-size: 24px; margin: 0 0 8px; color: #1a1a2e; font-weight: 700;">Your call is tomorrow</h2>
        <p style="color: #6b6b80; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
          Just a quick reminder — we're speaking <strong>${dateStr} at ${timeStr} MST</strong>.
        </p>

        <div style="background: linear-gradient(135deg, #f0fdf4, #f8f7fc); border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #d1fae5;">
          <h3 style="font-size: 14px; color: #059669; margin: 0 0 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">Did you know?</h3>
          <p style="color: #1a1a2e; font-size: 15px; line-height: 1.7; margin: 0;">
            The average med spa takes <strong>42 hours</strong> to respond to a new lead.
            78% of patients choose the business that responds first.
            That gap is where most revenue disappears — and it's exactly what we'll walk through on your call.
          </p>
        </div>

        <p style="color: #6b6b80; font-size: 14px; line-height: 1.6; margin: 0;">
          We'll call you at the number you provided. No prep needed — just show up and we'll handle the rest.
        </p>

        <div style="text-align: center; padding: 24px 0 8px; border-top: 1px solid #f0f0f5; margin-top: 24px;">
          <p style="color: #a0a0b0; font-size: 12px; margin: 0;">
            Need to reschedule? Reply to this email.
          </p>
        </div>
      </div>
    </div>
  `;

  return send(booking.email, `Reminder: Your strategy call is tomorrow`, html);
}

async function sendReminder1h(booking) {
  const timeStr = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Phoenix' });

  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a2e;">
      <div style="padding: 40px 32px; background: #ffffff; border-radius: 16px; border: 1px solid #e8e8f0;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 14px; letter-spacing: 3px; color: #c9a46c; margin: 0; font-weight: 700;">VELOSLUXE</h1>
        </div>

        <h2 style="font-size: 24px; margin: 0 0 8px; color: #1a1a2e; font-weight: 700;">We're calling in 1 hour</h2>
        <p style="color: #6b6b80; font-size: 15px; line-height: 1.6; margin: 0;">
          Your strategy call is at <strong>${timeStr} MST</strong>. We'll call the number you provided.
        </p>

        <div style="text-align: center; padding: 24px 0 8px; border-top: 1px solid #f0f0f5; margin-top: 24px;">
          <p style="color: #a0a0b0; font-size: 12px; margin: 0;">VelosLuxe — AI-Powered Lead Response for Med Spas</p>
        </div>
      </div>
    </div>
  `;

  return send(booking.email, `Starting in 1 hour — your VelosLuxe strategy call`, html);
}

async function sendNoShowFollowup(booking) {
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a2e;">
      <div style="padding: 40px 32px; background: #ffffff; border-radius: 16px; border: 1px solid #e8e8f0;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 14px; letter-spacing: 3px; color: #c9a46c; margin: 0; font-weight: 700;">VELOSLUXE</h1>
        </div>

        <h2 style="font-size: 24px; margin: 0 0 8px; color: #1a1a2e; font-weight: 700;">We missed you!</h2>
        <p style="color: #6b6b80; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
          No worries — we know things come up. Your strategy call spot is still available.
        </p>
        <p style="color: #6b6b80; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
          If you'd like to reschedule, just pick a new time:
        </p>

        <div style="text-align: center; margin-bottom: 24px;">
          <a href="https://velosluxe.com/strategy-call" style="display: inline-block; padding: 14px 40px; background: #c9a46c; color: #ffffff; border-radius: 100px; text-decoration: none; font-weight: 600; font-size: 15px;">
            Reschedule My Call
          </a>
        </div>

        <p style="color: #a0a0b0; font-size: 13px; line-height: 1.6; margin: 0; text-align: center;">
          Still not sure? Reply to this email with any questions — we're happy to help.
        </p>
      </div>
    </div>
  `;

  return send(booking.email, `We missed you — want to reschedule?`, html);
}

async function sendPostCallFollowup(booking, spaName) {
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a2e;">
      <div style="padding: 40px 32px; background: #ffffff; border-radius: 16px; border: 1px solid #e8e8f0;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 14px; letter-spacing: 3px; color: #c9a46c; margin: 0; font-weight: 700;">VELOSLUXE</h1>
        </div>

        <h2 style="font-size: 24px; margin: 0 0 8px; color: #1a1a2e; font-weight: 700;">Great speaking with you!</h2>
        <p style="color: #6b6b80; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
          Thanks for taking the time today${spaName ? `, ${spaName}` : ''}. Here's a quick recap of what we covered:
        </p>

        <div style="background: #f8f7fc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <h3 style="font-size: 15px; margin: 0 0 12px; color: #1a1a2e; font-weight: 700;">What VelosLuxe does for you:</h3>
          <ul style="color: #6b6b80; font-size: 14px; line-height: 1.8; padding-left: 20px; margin: 0;">
            <li><strong>Every call answered</strong> — Sophia picks up in 0.8 seconds, 24/7</li>
            <li><strong>Every lead followed up</strong> — under 60 seconds, every time</li>
            <li><strong>No-shows cut by 60%</strong> — smart multi-channel reminders</li>
            <li><strong>Reviews on autopilot</strong> — 5-star requests sent post-visit</li>
          </ul>
        </div>

        <h3 style="font-size: 15px; margin: 0 0 8px; color: #1a1a2e; font-weight: 700;">Next steps</h3>
        <p style="color: #6b6b80; font-size: 14px; line-height: 1.7; margin: 0 0 24px;">
          If you're ready to stop losing revenue to missed calls and slow follow-up, we can have you live in 48 hours.
          Just reply to this email and we'll get started.
        </p>

        <div style="text-align: center; margin-bottom: 24px;">
          <a href="https://velosluxe.com/onboarding" style="display: inline-block; padding: 14px 40px; background: #c9a46c; color: #ffffff; border-radius: 100px; text-decoration: none; font-weight: 600; font-size: 15px;">
            Get Started
          </a>
        </div>

        <div style="text-align: center; padding: 16px 0 0; border-top: 1px solid #f0f0f5;">
          <p style="color: #a0a0b0; font-size: 12px; margin: 0;">
            Dallas Powers — VelosLuxe | (740) 301-8119
          </p>
        </div>
      </div>
    </div>
  `;

  return send(booking.email, `Here's what we discussed — next steps inside`, html);
}

module.exports = {
  init,
  send,
  sendBookingConfirmation,
  sendReminder24h,
  sendReminder1h,
  sendNoShowFollowup,
  sendPostCallFollowup,
};
