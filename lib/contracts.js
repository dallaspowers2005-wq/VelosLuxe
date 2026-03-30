/**
 * Contract routes — service agreements with e-signature for VelosLuxe clients
 * Routes: GET /contract/:id, POST /api/contracts, POST /api/contracts/:id/sign, GET /api/contracts
 */

const crypto = require('crypto');

function escHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const CONTRACT_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; background: #f8f7f4; color: #1a1a1a; line-height: 1.7; }
  .contract-wrapper { max-width: 800px; margin: 0 auto; padding: 40px 20px; }

  /* Header */
  .contract-header { text-align: center; margin-bottom: 48px; padding-bottom: 32px; border-bottom: 2px solid #c9a46c; }
  .contract-header .logo { font-family: 'Playfair Display', serif; font-size: 28px; letter-spacing: 3px; color: #1a1a1a; text-decoration: none; }
  .contract-header .logo span { color: #c9a46c; }
  .contract-header h1 { font-family: 'Playfair Display', serif; font-size: 32px; font-weight: 500; margin-top: 24px; color: #1a1a1a; }
  .contract-header .subtitle { color: #666; font-size: 15px; margin-top: 8px; }

  /* Contract body */
  .contract-body { background: #fff; border-radius: 12px; padding: 48px; box-shadow: 0 2px 20px rgba(0,0,0,0.06); margin-bottom: 32px; }
  .contract-body h2 { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 500; margin: 32px 0 16px; color: #1a1a1a; }
  .contract-body h2:first-child { margin-top: 0; }
  .contract-body p { margin-bottom: 12px; font-size: 15px; color: #333; }
  .contract-body ul { margin: 8px 0 16px 24px; }
  .contract-body li { margin-bottom: 6px; font-size: 15px; color: #333; }
  .contract-body .highlight { background: #fdf8f0; border-left: 3px solid #c9a46c; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 16px 0; }
  .contract-body .highlight strong { color: #1a1a1a; }

  /* Parties */
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
  .party { background: #fdf8f0; padding: 20px; border-radius: 8px; }
  .party-label { font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #c9a46c; font-weight: 600; margin-bottom: 8px; }
  .party-name { font-family: 'Playfair Display', serif; font-size: 18px; font-weight: 500; }
  .party-detail { font-size: 14px; color: #666; margin-top: 4px; }

  /* Payment summary */
  .payment-summary { background: #1a1a1a; color: #fff; border-radius: 12px; padding: 32px; margin: 24px 0; }
  .payment-summary h3 { font-family: 'Playfair Display', serif; color: #c9a46c; font-size: 20px; margin-bottom: 16px; }
  .payment-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); }
  .payment-row:last-child { border-bottom: none; }
  .payment-label { font-size: 15px; color: #ccc; }
  .payment-amount { font-size: 18px; font-weight: 600; color: #fff; }
  .payment-note { font-size: 13px; color: #999; margin-top: 4px; }

  /* Signature section */
  .signature-section { background: #fff; border-radius: 12px; padding: 48px; box-shadow: 0 2px 20px rgba(0,0,0,0.06); }
  .signature-section h2 { font-family: 'Playfair Display', serif; font-size: 22px; margin-bottom: 24px; text-align: center; }
  .sig-field { margin-bottom: 20px; }
  .sig-field label { display: block; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #888; font-weight: 600; margin-bottom: 6px; }
  .sig-field input { width: 100%; padding: 14px 16px; border: 1px solid #ddd; border-radius: 8px; font-size: 16px; font-family: 'Inter', sans-serif; transition: border-color 0.2s; }
  .sig-field input:focus { outline: none; border-color: #c9a46c; box-shadow: 0 0 0 3px rgba(201,164,108,0.15); }
  .sig-preview { font-family: 'Dancing Script', cursive; font-size: 36px; color: #1a1a1a; min-height: 60px; display: flex; align-items: center; justify-content: center; border-bottom: 2px solid #1a1a1a; margin: 24px 0; padding: 8px; }
  .consent-check { display: flex; align-items: flex-start; gap: 12px; margin: 20px 0; }
  .consent-check input[type="checkbox"] { width: 20px; height: 20px; margin-top: 2px; accent-color: #c9a46c; cursor: pointer; flex-shrink: 0; }
  .consent-check label { font-size: 14px; color: #555; cursor: pointer; line-height: 1.5; }
  .sign-btn { display: block; width: 100%; padding: 18px; background: #c9a46c; color: #fff; border: none; border-radius: 8px; font-size: 17px; font-weight: 600; cursor: pointer; transition: all 0.3s; letter-spacing: 0.5px; margin-top: 24px; }
  .sign-btn:hover { background: #b8934f; transform: translateY(-1px); box-shadow: 0 4px 15px rgba(201,164,108,0.4); }
  .sign-btn:disabled { background: #ccc; cursor: not-allowed; transform: none; box-shadow: none; }

  /* Signed state */
  .signed-banner { background: #f0fdf4; border: 2px solid #22c55e; border-radius: 12px; padding: 32px; text-align: center; margin-bottom: 32px; }
  .signed-banner .check { font-size: 48px; margin-bottom: 12px; }
  .signed-banner h2 { color: #16a34a; font-family: 'Playfair Display', serif; margin-bottom: 8px; }
  .signed-banner p { color: #555; font-size: 15px; }
  .payment-cta { display: block; width: 100%; max-width: 400px; margin: 24px auto 0; padding: 18px 32px; background: #c9a46c; color: #fff; text-decoration: none; border-radius: 8px; font-size: 17px; font-weight: 600; text-align: center; transition: all 0.3s; }
  .payment-cta:hover { background: #b8934f; transform: translateY(-1px); }

  /* Error/status messages */
  .msg { padding: 14px 20px; border-radius: 8px; margin-bottom: 16px; font-size: 14px; display: none; }
  .msg.error { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; display: block; }
  .msg.success { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; display: block; }

  /* Responsive */
  @media (max-width: 640px) {
    .contract-wrapper { padding: 20px 16px; }
    .contract-body, .signature-section { padding: 24px 20px; }
    .parties { grid-template-columns: 1fr; }
    .contract-header h1 { font-size: 24px; }
    .payment-row { flex-direction: column; align-items: flex-start; gap: 4px; }
  }
`;

function buildContractPage(contract) {
  const isSigned = contract.status === 'signed';
  const clientName = escHtml(contract.client_name || '');
  const businessName = escHtml(contract.business_name || '');
  const contactEmail = escHtml(contract.client_email || '');
  const contactPhone = escHtml(contract.client_phone || '');
  const packageName = escHtml(contract.package_name || 'Professional');
  const monthlyRate = contract.monthly_rate || 3200;
  const depositAmount = contract.deposit_amount || Math.round(monthlyRate / 2);
  const remainderAmount = monthlyRate - depositAmount;
  const termMonths = contract.term_months || 3;
  const stripeLink = contract.stripe_payment_link || '';
  const customTerms = contract.custom_terms || '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Service Agreement — VelosLuxe</title>
  <meta name="robots" content="noindex, nofollow">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet">
  <style>${CONTRACT_CSS}</style>
</head>
<body>
  <div class="contract-wrapper">
    <div class="contract-header">
      <a href="https://velosluxe.com" class="logo">VELOS<span>LUXE</span></a>
      <h1>Service Agreement</h1>
      <p class="subtitle">AI-Powered Lead Response &amp; Appointment Booking</p>
    </div>

    ${isSigned ? `
    <script>window.scrollTo(0, 0);</script>
    <div class="signed-banner">
      <div class="check">&#10003;</div>
      <h2>Agreement Signed</h2>
      <p>Signed by ${escHtml(contract.signed_name)} on ${new Date(contract.signed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      ${stripeLink ? `<a href="${escHtml(stripeLink)}" class="payment-cta">Complete Deposit Payment — $${depositAmount.toLocaleString()}</a>` : ''}
    </div>
    ` : ''}

    <div class="contract-body">
      <h2>Parties</h2>
      <div class="parties">
        <div class="party">
          <div class="party-label">Service Provider</div>
          <div class="party-name">VelosLuxe LLC</div>
          <div class="party-detail">AI-Powered Business Solutions</div>
        </div>
        <div class="party">
          <div class="party-label">Client</div>
          <div class="party-name">${businessName || 'Client Business'}</div>
          ${clientName ? `<div class="party-detail">${clientName}</div>` : ''}
          ${contactEmail ? `<div class="party-detail">${contactEmail}</div>` : ''}
        </div>
      </div>

      <h2>Services Provided</h2>
      <p>VelosLuxe LLC ("Provider") agrees to provide the following services under the <strong>${packageName}</strong> package:</p>
      <ul>
        <li><strong>Instant Lead Response</strong> — Automated response to all inbound leads (website forms, social media, ads) within 60 seconds via SMS, email, and voice</li>
        <li><strong>AI Receptionist "Sophia"</strong> — 24/7 AI-powered voice assistant that answers calls, handles inquiries about services and pricing, and books appointments directly into your calendar</li>
        <li><strong>Smart Booking &amp; No-Show Prevention</strong> — Automated appointment scheduling with calendar sync and multi-channel reminders (48hr, 24hr, 1hr) to reduce no-shows</li>
        <li><strong>Review Generation</strong> — Automated post-visit review requests to build your online reputation</li>
        <li><strong>Client Reactivation</strong> — Re-engagement campaigns for inactive patients (60+ days) with personalized offers</li>
        <li><strong>Weekly Optimization</strong> — Ongoing tuning and reporting to maximize conversion rates</li>
      </ul>

      ${packageName.toLowerCase().includes('enterprise') ? `
      <p>Additionally, as part of the Enterprise package:</p>
      <ul>
        <li><strong>Website Redesign</strong> — Complete website overhaul optimized for conversion and SEO</li>
      </ul>
      ` : ''}

      <h2>Setup &amp; Onboarding</h2>
      <p>Provider will complete setup within <strong>48 hours</strong> of receiving all necessary access credentials from Client. This includes:</p>
      <ul>
        <li>Integration with Client's existing booking/calendar system</li>
        <li>AI assistant configuration and training on Client's services, pricing, and policies</li>
        <li>Phone number provisioning and call forwarding setup</li>
        <li>Testing and quality assurance</li>
      </ul>

      <div class="payment-summary">
        <h3>Payment Terms</h3>
        <div class="payment-row">
          <div>
            <div class="payment-label">Deposit (due upon signing)</div>
            <div class="payment-note">50% of first month</div>
          </div>
          <div class="payment-amount">$${depositAmount.toLocaleString()}</div>
        </div>
        <div class="payment-row">
          <div>
            <div class="payment-label">Remainder (due on go-live)</div>
            <div class="payment-note">Paid when system is live and operational</div>
          </div>
          <div class="payment-amount">$${remainderAmount.toLocaleString()}</div>
        </div>
        <div class="payment-row">
          <div>
            <div class="payment-label">Monthly Service Fee</div>
            <div class="payment-note">Billed on the 1st of each month after first month</div>
          </div>
          <div class="payment-amount">$${monthlyRate.toLocaleString()}/mo</div>
        </div>
      </div>

      <h2>Term &amp; Cancellation</h2>
      <p>This agreement has a minimum term of <strong>${termMonths} months</strong> from the go-live date. After the minimum term, either party may cancel with <strong>30 days written notice</strong>.</p>
      <p>If Client cancels before the minimum term expires, Client agrees to pay the remaining balance of the minimum term.</p>

      <h2>Client Responsibilities</h2>
      <p>Client agrees to:</p>
      <ul>
        <li>Provide access to their booking/calendar system within 3 business days of signing</li>
        <li>Provide accurate information about services, pricing, and business hours</li>
        <li>Respond to Provider's setup questions within 48 hours</li>
        <li>Maintain an active payment method on file</li>
      </ul>

      <h2>Service Level</h2>
      <p>Provider commits to:</p>
      <ul>
        <li><strong>99.5% uptime</strong> for AI receptionist and lead response systems</li>
        <li><strong>Sub-60-second</strong> response time for all inbound leads</li>
        <li><strong>Weekly performance reports</strong> with key metrics and optimization recommendations</li>
        <li><strong>48-hour support response</strong> for non-urgent issues; same-day for critical issues</li>
      </ul>

      <h2>Confidentiality</h2>
      <p>Both parties agree to keep confidential any proprietary information shared during the term of this agreement. Provider will handle all patient/customer data in compliance with applicable regulations including HIPAA where applicable.</p>

      <h2>Limitation of Liability</h2>
      <p>Provider's total liability under this agreement shall not exceed the total fees paid by Client in the 3 months preceding any claim. Provider is not liable for indirect, consequential, or lost profit damages.</p>

      ${customTerms ? `
      <h2>Additional Terms</h2>
      <p>${escHtml(customTerms)}</p>
      ` : ''}

      <div class="highlight">
        <strong>Effective Date:</strong> This agreement becomes effective upon electronic signature by the Client and receipt of the initial deposit payment.
      </div>
    </div>

    ${!isSigned ? `
    <div class="signature-section" id="signatureSection">
      <h2>Sign Agreement</h2>
      <div id="signMsg" class="msg"></div>
      <div class="sig-field">
        <label>Full Legal Name</label>
        <input type="text" id="sigName" placeholder="Type your full name" autocomplete="name">
      </div>
      <div class="sig-field">
        <label>Title / Position</label>
        <input type="text" id="sigTitle" placeholder="e.g. Owner, Manager" autocomplete="organization-title">
      </div>
      <div class="sig-preview" id="sigPreview"></div>
      <div class="consent-check">
        <input type="checkbox" id="sigConsent">
        <label for="sigConsent">I, the undersigned, have read and agree to the terms of this Service Agreement. I understand that typing my name above constitutes a legally binding electronic signature.</label>
      </div>
      <button class="sign-btn" id="signBtn" disabled onclick="submitSignature()">Sign Agreement</button>
    </div>

    <script>
      var nameInput = document.getElementById('sigName');
      var titleInput = document.getElementById('sigTitle');
      var preview = document.getElementById('sigPreview');
      var consent = document.getElementById('sigConsent');
      var btn = document.getElementById('signBtn');

      nameInput.addEventListener('input', function() {
        preview.textContent = this.value || '';
        checkReady();
      });
      consent.addEventListener('change', checkReady);

      function checkReady() {
        btn.disabled = !(nameInput.value.trim().length >= 2 && consent.checked);
      }

      function submitSignature() {
        btn.disabled = true;
        btn.textContent = 'Submitting...';
        var msg = document.getElementById('signMsg');
        msg.className = 'msg';
        msg.style.display = 'none';

        fetch('/api/contracts/${contract.id}/sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            signed_name: nameInput.value.trim(),
            signed_title: titleInput.value.trim()
          })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.success) {
            window.scrollTo(0, 0);
            window.location.reload();
          } else {
            msg.className = 'msg error';
            msg.textContent = data.error || 'Something went wrong. Please try again.';
            msg.style.display = 'block';
            btn.disabled = false;
            btn.textContent = 'Sign Agreement';
          }
        })
        .catch(function() {
          msg.className = 'msg error';
          msg.textContent = 'Network error. Please check your connection and try again.';
          msg.style.display = 'block';
          btn.disabled = false;
          btn.textContent = 'Sign Agreement';
        });
      }
    </script>
    ` : ''}
  </div>
</body>
</html>`;
}

function setupContractRoutes(app, getAll, getOne, runQuery, insertAndGetId, saveDb, notifyTeam) {

  // Ensure contracts table exists
  runQuery(`
    CREATE TABLE IF NOT EXISTS contracts (
      id TEXT PRIMARY KEY,
      client_name TEXT,
      client_email TEXT,
      client_phone TEXT,
      business_name TEXT,
      package_name TEXT DEFAULT 'Professional',
      monthly_rate INTEGER DEFAULT 3200,
      deposit_amount INTEGER DEFAULT 1600,
      term_months INTEGER DEFAULT 3,
      custom_terms TEXT,
      stripe_payment_link TEXT,
      status TEXT DEFAULT 'pending',
      signed_name TEXT,
      signed_title TEXT,
      signed_ip TEXT,
      signed_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ═══ CREATE CONTRACT ═══
  app.post('/api/contracts', (req, res) => {
    const adminKey = req.headers['x-admin-key'] || req.query.key;
    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      client_name,
      client_email,
      client_phone,
      business_name,
      package_name = 'Professional',
      monthly_rate = 3200,
      deposit_amount,
      term_months = 3,
      custom_terms,
      stripe_payment_link
    } = req.body;

    if (!business_name && !client_name) {
      return res.status(400).json({ error: 'business_name or client_name is required' });
    }

    const id = crypto.randomBytes(12).toString('hex');
    const deposit = deposit_amount || Math.round(monthly_rate / 2);

    runQuery(
      `INSERT INTO contracts (id, client_name, client_email, client_phone, business_name, package_name, monthly_rate, deposit_amount, term_months, custom_terms, stripe_payment_link)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, client_name || null, client_email || null, client_phone || null, business_name || null, package_name, monthly_rate, deposit, term_months, custom_terms || null, stripe_payment_link || null]
    );

    const url = `${process.env.NODE_ENV === 'production' ? 'https://velosluxe.com' : 'http://localhost:3000'}/contract/${id}`;

    res.json({ success: true, id, url });
  });

  // ═══ LIST CONTRACTS ═══
  app.get('/api/contracts', (req, res) => {
    const adminKey = req.headers['x-admin-key'] || req.query.key;
    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const status = req.query.status;
    let sql = 'SELECT * FROM contracts ORDER BY created_at DESC';
    let params = [];
    if (status) {
      sql = 'SELECT * FROM contracts WHERE status = ? ORDER BY created_at DESC';
      params = [status];
    }

    res.json(getAll(sql, params));
  });

  // ═══ GET SINGLE CONTRACT (admin) ═══
  app.get('/api/contracts/:id', (req, res) => {
    const adminKey = req.headers['x-admin-key'] || req.query.key;
    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const contract = getOne('SELECT * FROM contracts WHERE id = ?', [req.params.id]);
    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    res.json(contract);
  });

  // ═══ UPDATE CONTRACT ═══
  app.put('/api/contracts/:id', (req, res) => {
    const adminKey = req.headers['x-admin-key'] || req.query.key;
    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const contract = getOne('SELECT * FROM contracts WHERE id = ?', [req.params.id]);
    if (!contract) return res.status(404).json({ error: 'Contract not found' });

    const fields = ['client_name', 'client_email', 'client_phone', 'business_name', 'package_name', 'monthly_rate', 'deposit_amount', 'term_months', 'custom_terms', 'stripe_payment_link', 'status'];
    const updates = [];
    const params = [];

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(req.body[field]);
      }
    }

    if (updates.length === 0) return res.json({ success: true, message: 'No changes' });

    params.push(req.params.id);
    runQuery(`UPDATE contracts SET ${updates.join(', ')} WHERE id = ?`, params);

    res.json({ success: true });
  });

  // ═══ VIEW CONTRACT PAGE (public — no auth) ═══
  app.get('/contract/:id', (req, res) => {
    const contract = getOne('SELECT * FROM contracts WHERE id = ?', [req.params.id]);
    if (!contract) {
      return res.status(404).send('<html><body style="font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;color:#666"><h2>Contract not found</h2></body></html>');
    }

    res.set('Cache-Control', 'no-store');
    res.send(buildContractPage(contract));
  });

  // ═══ SIGN CONTRACT (public) ═══
  app.post('/api/contracts/:id/sign', (req, res) => {
    const contract = getOne('SELECT * FROM contracts WHERE id = ?', [req.params.id]);
    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    if (contract.status === 'signed') return res.status(400).json({ error: 'This contract has already been signed' });

    const { signed_name, signed_title } = req.body;
    if (!signed_name || signed_name.trim().length < 2) {
      return res.status(400).json({ error: 'Please enter your full name' });
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const signedAt = new Date().toISOString();

    runQuery(
      `UPDATE contracts SET status = 'signed', signed_name = ?, signed_title = ?, signed_ip = ?, signed_at = ? WHERE id = ?`,
      [signed_name.trim(), signed_title ? signed_title.trim() : null, ip, signedAt, req.params.id]
    );

    // Notify team
    if (notifyTeam) {
      const biz = contract.business_name || 'Unknown Business';
      notifyTeam(`CONTRACT SIGNED: ${biz} (${signed_name.trim()}) just signed the ${contract.package_name} agreement — $${contract.monthly_rate}/mo. Deposit link sent.`);
    }

    res.json({ success: true, signed_at: signedAt });
  });
}

module.exports = { setupContractRoutes };
