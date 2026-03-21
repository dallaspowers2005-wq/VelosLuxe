// Background Jobs — Review Requests + Inactive Follow-ups

const { sendSMS } = require('./sms');

let _getAll, _runQuery, _getOne;

function init({ getAll, runQuery, getOne }) {
  _getAll = getAll;
  _runQuery = runQuery;
  _getOne = getOne;
}

// ═══ AUTO REVIEW REQUESTS ═══
// Runs every 5 minutes. Finds completed appointments past the review delay,
// sends a review request SMS, marks review_sent = 1.
async function processReviewRequests() {
  try {
    // Find appointments eligible for review request
    const appointments = _getAll(`
      SELECT a.*, c.name as client_name, c.slug, c.google_review_link,
             c.review_delay_minutes, c.sms_phone_number
      FROM appointments a
      JOIN clients c ON c.id = a.client_id
      WHERE a.review_sent = 0
        AND c.google_review_link IS NOT NULL
        AND c.status = 'active'
        AND datetime(a.appointment_time, '+' || c.review_delay_minutes || ' minutes') <= datetime('now')
    `);

    for (const appt of appointments) {
      const contactName = appt.contact_name || '';
      const message = `Thanks for visiting ${appt.client_name}${contactName ? ', ' + contactName : ''}! Loved your experience? A quick review means the world to us: ${appt.google_review_link}`;

      const fromNumber = appt.sms_phone_number || undefined;
      const sent = await sendSMS(appt.contact_phone, message, { fromNumber });

      // Mark review sent regardless of SMS success (don't retry spam)
      _runQuery('UPDATE appointments SET review_sent = 1 WHERE id = ?', [appt.id]);

      // Log to sms_log
      _runQuery(
        'INSERT INTO sms_log (client_id, phone, message, sms_type, status) VALUES (?, ?, ?, ?, ?)',
        [appt.client_id, appt.contact_phone, message, 'review_request', sent ? 'sent' : 'failed']
      );

      // Update contact's review_requested_at
      _runQuery(
        "UPDATE contacts SET review_requested_at = datetime('now') WHERE client_id = ? AND phone = ?",
        [appt.client_id, appt.contact_phone]
      );

      console.log(`Review request ${sent ? 'sent' : 'failed'}: ${appt.contact_phone} for ${appt.client_name}`);
    }
  } catch (err) {
    console.error('Review request job error:', err.message);
  }
}

// ═══ INACTIVE CONTACT FOLLOW-UPS ═══
// Runs every hour. Finds contacts who haven't visited in followup_inactive_days,
// sends a reactivation SMS.
async function processInactiveFollowups() {
  try {
    const contacts = _getAll(`
      SELECT ct.*, c.name as client_name, c.slug, c.sms_phone_number,
             c.followup_inactive_days
      FROM contacts ct
      JOIN clients c ON c.id = ct.client_id
      WHERE c.followup_enabled = 1
        AND c.status = 'active'
        AND ct.last_appointment_at IS NOT NULL
        AND datetime(ct.last_appointment_at, '+' || c.followup_inactive_days || ' days') <= datetime('now')
        AND (ct.followup_sent_at IS NULL OR datetime(ct.followup_sent_at, '+30 days') <= datetime('now'))
    `);

    for (const contact of contacts) {
      const name = contact.name || '';
      const message = `Hey${name ? ' ' + name : ''}, we miss you at ${contact.client_name}! It's been a while — ready to book your next visit?`;

      const fromNumber = contact.sms_phone_number || undefined;
      const sent = await sendSMS(contact.phone, message, { fromNumber });

      // Update followup_sent_at
      _runQuery(
        "UPDATE contacts SET followup_sent_at = datetime('now') WHERE id = ?",
        [contact.id]
      );

      // Log to sms_log
      _runQuery(
        'INSERT INTO sms_log (client_id, contact_id, phone, message, sms_type, status) VALUES (?, ?, ?, ?, ?, ?)',
        [contact.client_id, contact.id, contact.phone, message, 'reactivation', sent ? 'sent' : 'failed']
      );

      console.log(`Reactivation ${sent ? 'sent' : 'failed'}: ${contact.phone} for ${contact.client_name}`);
    }
  } catch (err) {
    console.error('Inactive followup job error:', err.message);
  }
}

// Start all background jobs
function startJobs() {
  // Review requests — every 5 minutes
  processReviewRequests();
  setInterval(processReviewRequests, 5 * 60 * 1000);
  console.log('Review request job started (every 5 min)');

  // Inactive followups — every hour
  processInactiveFollowups();
  setInterval(processInactiveFollowups, 60 * 60 * 1000);
  console.log('Inactive followup job started (every 60 min)');
}

module.exports = { init, startJobs };
