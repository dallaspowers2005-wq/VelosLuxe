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

function generateICS(booking) {
  const start = new Date(booking.start_time);
  const end = new Date(booking.end_time);
  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//VelosLuxe//Strategy Call//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:VelosLuxe Strategy Call`,
    `DESCRIPTION:30-minute strategy call with VelosLuxe. We'll walk through your specific revenue leaks and show you how to fix them.\\n\\nQuestions? Call (740) 301-8119`,
    `ORGANIZER;CN=VelosLuxe:mailto:hello@velosluxe.com`,
    `ATTENDEE;CN=${booking.name}:mailto:${booking.email}`,
    'STATUS:CONFIRMED',
    `UID:velosluxe-${booking.id}@velosluxe.com`,
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:VelosLuxe Strategy Call in 15 minutes',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

async function send(to, subject, html, attachments) {
  if (!resend) {
    console.log('Email skipped (no Resend key):', subject);
    return false;
  }
  try {
    const opts = { from: FROM, to, subject, html };
    if (attachments) opts.attachments = attachments;
    const { data, error } = await resend.emails.send(opts);
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
  const firstName = booking.name.split(' ')[0];

  const icsContent = generateICS(booking);

  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a2e;">
      <div style="padding: 40px 32px; background: #ffffff; border-radius: 16px; border: 1px solid #e8e8f0;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 14px; letter-spacing: 3px; color: #c9a46c; margin: 0; font-weight: 700;">VELOSLUXE</h1>
        </div>

        <h2 style="font-size: 24px; margin: 0 0 8px; color: #1a1a2e; font-weight: 700;">You're confirmed, ${firstName}!</h2>
        <p style="color: #6b6b80; font-size: 15px; line-height: 1.6; margin: 0 0 8px;">
          Most med spa owners just talk about fixing their lead response — you actually took the step to do something about it. That already puts you ahead.
        </p>
        <p style="color: #6b6b80; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
          Our team will review your information beforehand so we can make every minute count.
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
              <td style="padding: 8px 0; color: #6b6b80; font-size: 14px;">With</td>
              <td style="padding: 8px 0; color: #1a1a2e; font-size: 14px; font-weight: 600; text-align: right;">Dallas Powers, Founder</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin-bottom: 24px;">
          <a href="mailto:hello@velosluxe.com?subject=Confirmed%20-%20Strategy%20Call&body=Confirmed!%20Looking%20forward%20to%20it." style="display: inline-block; padding: 14px 40px; background: #c9a46c; color: #ffffff; border-radius: 100px; text-decoration: none; font-weight: 600; font-size: 15px;">
            Reply "Confirmed" to lock in your spot
          </a>
        </div>

        <h3 style="font-size: 16px; margin: 0 0 12px; color: #1a1a2e;">What to expect</h3>
        <ul style="color: #6b6b80; font-size: 14px; line-height: 1.8; padding-left: 20px; margin: 0 0 24px;">
          <li>We'll analyze exactly where your med spa is losing revenue right now</li>
          <li>You'll see how AI-powered response works in real time (live demo of Sophia)</li>
          <li>We'll map out a recovery plan specific to your practice</li>
          <li>Zero pressure — walk away with actionable insights either way</li>
        </ul>

        <div style="background: #fffbf0; border: 1px solid #fde68a; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px;">
          <h3 style="font-size: 14px; margin: 0 0 8px; color: #92400e; font-weight: 700;">Before your call, think about:</h3>
          <ul style="color: #78716c; font-size: 14px; line-height: 1.8; padding-left: 20px; margin: 0;">
            <li>How many calls/leads does your spa get per week? (rough estimate)</li>
            <li>What's your biggest frustration with follow-up right now?</li>
            <li>How do you currently handle after-hours calls?</li>
          </ul>
        </div>

        <p style="color: #a0a0b0; font-size: 12px; text-align: center; margin: 0 0 8px;">
          A calendar invite is attached — add it so you don't forget.
        </p>

        <div style="text-align: center; padding: 16px 0 0; border-top: 1px solid #f0f0f5;">
          <p style="color: #a0a0b0; font-size: 12px; margin: 0;">
            Need to move your time? Reply to this email and we'll find a new slot.
          </p>
        </div>
      </div>
    </div>
  `;

  return send(
    booking.email,
    `You're booked, ${firstName} — ${dateStr} at ${timeStr}`,
    html,
    [{ filename: 'velosluxe-strategy-call.ics', content: Buffer.from(icsContent).toString('base64') }]
  );
}

async function sendReminder24h(booking) {
  const date = new Date(booking.start_time);
  const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Phoenix' });
  const firstName = booking.name.split(' ')[0];

  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a2e;">
      <div style="padding: 40px 32px; background: #ffffff; border-radius: 16px; border: 1px solid #e8e8f0;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 14px; letter-spacing: 3px; color: #c9a46c; margin: 0; font-weight: 700;">VELOSLUXE</h1>
        </div>

        <h2 style="font-size: 24px; margin: 0 0 8px; color: #1a1a2e; font-weight: 700;">Looking forward to tomorrow, ${firstName}</h2>
        <p style="color: #6b6b80; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
          Quick reminder — your reserved strategy session is <strong>${dateStr} at ${timeStr} MST</strong>.
        </p>

        <div style="background: linear-gradient(135deg, #f0fdf4, #f8f7fc); border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #d1fae5;">
          <h3 style="font-size: 14px; color: #059669; margin: 0 0 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">Did you know?</h3>
          <p style="color: #1a1a2e; font-size: 15px; line-height: 1.7; margin: 0;">
            The average med spa takes <strong>42 hours</strong> to respond to a new lead.
            But 78% of patients choose the business that responds first.
            That gap is where most revenue disappears — and it's exactly what we'll walk through on your call.
          </p>
        </div>

        <p style="color: #6b6b80; font-size: 14px; line-height: 1.6; margin: 0;">
          We'll call you at the number you provided. No prep needed — just show up and we'll handle the rest.
        </p>

        <div style="text-align: center; padding: 24px 0 8px; border-top: 1px solid #f0f0f5; margin-top: 24px;">
          <p style="color: #a0a0b0; font-size: 12px; margin: 0;">
            Need to move your time? Reply to this email.
          </p>
        </div>
      </div>
    </div>
  `;

  return send(booking.email, `Looking forward to tomorrow, ${firstName}`, html);
}

async function sendReminder1h(booking) {
  const timeStr = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Phoenix' });
  const firstName = booking.name.split(' ')[0];

  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a2e;">
      <div style="padding: 40px 32px; background: #ffffff; border-radius: 16px; border: 1px solid #e8e8f0;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 14px; letter-spacing: 3px; color: #c9a46c; margin: 0; font-weight: 700;">VELOSLUXE</h1>
        </div>

        <h2 style="font-size: 24px; margin: 0 0 8px; color: #1a1a2e; font-weight: 700;">See you in 1 hour, ${firstName}</h2>
        <p style="color: #6b6b80; font-size: 15px; line-height: 1.6; margin: 0;">
          Your strategy session starts at <strong>${timeStr} MST</strong>. We'll call the number you provided.
        </p>

        <div style="text-align: center; padding: 24px 0 8px; border-top: 1px solid #f0f0f5; margin-top: 24px;">
          <p style="color: #a0a0b0; font-size: 12px; margin: 0;">Dallas Powers — VelosLuxe | (740) 301-8119</p>
        </div>
      </div>
    </div>
  `;

  return send(booking.email, `Starting in 1 hour — see you soon, ${firstName}`, html);
}

async function sendNoShowFollowup(booking) {
  const firstName = booking.name.split(' ')[0];

  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a2e;">
      <div style="padding: 40px 32px; background: #ffffff; border-radius: 16px; border: 1px solid #e8e8f0;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 14px; letter-spacing: 3px; color: #c9a46c; margin: 0; font-weight: 700;">VELOSLUXE</h1>
        </div>

        <h2 style="font-size: 24px; margin: 0 0 8px; color: #1a1a2e; font-weight: 700;">We missed you, ${firstName}!</h2>
        <p style="color: #6b6b80; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
          No worries — things come up. Your strategy session spot is still available, and we'd still love to walk through your revenue leaks.
        </p>

        <div style="text-align: center; margin-bottom: 24px;">
          <a href="https://velosluxe.com/strategy-call" style="display: inline-block; padding: 14px 40px; background: #c9a46c; color: #ffffff; border-radius: 100px; text-decoration: none; font-weight: 600; font-size: 15px;">
            Reschedule My Call
          </a>
        </div>

        <p style="color: #a0a0b0; font-size: 13px; line-height: 1.6; margin: 0; text-align: center;">
          Not interested anymore? No hard feelings — just reply and let us know.
        </p>
      </div>
    </div>
  `;

  return send(booking.email, `We missed you — want to reschedule, ${firstName}?`, html);
}

async function sendPostCallFollowup(booking, spaName) {
  const firstName = booking.name.split(' ')[0];

  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a2e;">
      <div style="padding: 40px 32px; background: #ffffff; border-radius: 16px; border: 1px solid #e8e8f0;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 14px; letter-spacing: 3px; color: #c9a46c; margin: 0; font-weight: 700;">VELOSLUXE</h1>
        </div>

        <h2 style="font-size: 24px; margin: 0 0 8px; color: #1a1a2e; font-weight: 700;">Great speaking with you, ${firstName}!</h2>
        <p style="color: #6b6b80; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
          Thanks for taking the time today. Here's a quick recap of what VelosLuxe does for med spas like${spaName ? ' ' + spaName : ' yours'}:
        </p>

        <div style="background: #f8f7fc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <ul style="color: #6b6b80; font-size: 14px; line-height: 2; padding-left: 20px; margin: 0;">
            <li><strong>Every call answered</strong> — Sophia picks up in 0.8 seconds, 24/7</li>
            <li><strong>Every lead followed up</strong> — under 60 seconds, every time</li>
            <li><strong>No-shows cut by 60%</strong> — smart multi-channel reminders</li>
            <li><strong>Reviews on autopilot</strong> — 5-star requests sent post-visit</li>
            <li><strong>Average recovery: $12,400/mo</strong> per client</li>
          </ul>
        </div>

        <h3 style="font-size: 15px; margin: 0 0 8px; color: #1a1a2e; font-weight: 700;">Ready to stop the leak?</h3>
        <p style="color: #6b6b80; font-size: 14px; line-height: 1.7; margin: 0 0 24px;">
          We can have you live in 48 hours. No contracts, no setup fees, no risk. If you don't see the value, it's free forever.
        </p>

        <div style="text-align: center; margin-bottom: 24px;">
          <a href="https://velosluxe.com/onboarding" style="display: inline-block; padding: 14px 40px; background: #c9a46c; color: #ffffff; border-radius: 100px; text-decoration: none; font-weight: 600; font-size: 15px;">
            Get Started — 48hr Setup
          </a>
        </div>

        <div style="text-align: center; padding: 16px 0 0; border-top: 1px solid #f0f0f5;">
          <p style="color: #a0a0b0; font-size: 12px; margin: 0;">
            Dallas Powers, Founder — VelosLuxe | (740) 301-8119
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
  generateICS,
  sendBookingConfirmation,
  sendReminder24h,
  sendReminder1h,
  sendNoShowFollowup,
  sendPostCallFollowup,
};
