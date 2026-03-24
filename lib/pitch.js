/**
 * Pitch page routes — personalized luxury landing pages for med spa prospects
 * Route: GET /for/:slug
 */

const { createClient } = require('@supabase/supabase-js');

function getSpaceship() {
  return createClient(
    process.env.SPACESHIP_SUPABASE_URL,
    process.env.SPACESHIP_SUPABASE_KEY
  );
}

function escHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatCurrency(n) {
  if (!n && n !== 0) return '$0';
  return '$' + Number(n).toLocaleString('en-US');
}

function renderStars(rating) {
  var r = parseFloat(rating) || 0;
  var full = Math.floor(r);
  var half = r - full >= 0.5 ? 1 : 0;
  var empty = 5 - full - half;
  var html = '';
  for (var i = 0; i < full; i++) html += '<span class="star full">&#9733;</span>';
  if (half) html += '<span class="star half">&#9733;</span>';
  for (var j = 0; j < empty; j++) html += '<span class="star empty">&#9733;</span>';
  return html;
}

function buildPage(pitch, lead, enrichment) {
  var businessName = escHtml(lead.business_name || 'Your Practice');
  var city = escHtml(lead.city || '');
  var state = escHtml(lead.state || '');
  var address = escHtml(lead.address || '');
  var googleRating = parseFloat(lead.google_rating) || parseFloat(enrichment.rating) || 0;
  var googleReviews = parseInt(lead.google_reviews) || parseInt(enrichment.review_count) || 0;
  var ownerName = escHtml(enrichment.owner_name || '');
  var tagline = escHtml(enrichment.tagline || 'Your patients deserve an instant answer.');
  var logoUrl = escHtml(enrichment.logo_url || '');
  var heroImageUrl = escHtml(enrichment.hero_image_url || '');
  var contactEmail = escHtml(enrichment.contact_email || '');
  var estimatedLostRevenue = enrichment.estimated_lost_revenue || 0;
  var responseTimeEstimate = escHtml(enrichment.response_time_estimate || '3–5 hours');
  var instagram = escHtml((enrichment.social_links && enrichment.social_links.instagram) || '');
  var facebook = escHtml((enrichment.social_links && enrichment.social_links.facebook) || '');

  var primaryColor = escHtml(
    (enrichment.brand_colors && enrichment.brand_colors.primary) || '#8B7355'
  );
  var secondaryColor = escHtml(
    (enrichment.brand_colors && enrichment.brand_colors.secondary) || '#C9A96E'
  );

  var services = Array.isArray(enrichment.services) ? enrichment.services : [];
  var topServices = Array.isArray(enrichment.top_services) ? enrichment.top_services : services;

  var location = city && state ? city + ', ' + state : city || state || '';

  // Build service tags
  var serviceTagsHtml = '';
  var displayServices = topServices.length > 0 ? topServices : services;
  for (var i = 0; i < displayServices.length && i < 8; i++) {
    serviceTagsHtml += '<span class="service-tag">' + escHtml(displayServices[i]) + '</span>';
  }

  // Hero image style
  var heroBgStyle = heroImageUrl
    ? 'background-image: linear-gradient(to bottom, rgba(253,251,247,0.55) 0%, rgba(253,251,247,0.85) 60%, #FDFBF7 100%), url(' + heroImageUrl + '); background-size: cover; background-position: center top;'
    : '';

  // Logo or wordmark
  var logoHtml = logoUrl
    ? '<img src="' + logoUrl + '" alt="' + businessName + ' logo" class="practice-logo">'
    : '<div class="practice-wordmark">' + businessName + '</div>';

  // Owner greeting
  var greetingHtml = ownerName
    ? '<p class="hero-greeting">A personal note for ' + ownerName + '</p>'
    : '';

  // Social links
  var socialHtml = '';
  if (instagram) {
    socialHtml += '<a href="' + instagram + '" class="social-link" target="_blank" rel="noopener">Instagram</a>';
  }
  if (facebook) {
    socialHtml += '<a href="' + facebook + '" class="social-link" target="_blank" rel="noopener">Facebook</a>';
  }

  var css = '' +
    ':root {' +
    '  --primary: ' + primaryColor + ';' +
    '  --secondary: ' + secondaryColor + ';' +
    '  --cream: #FDFBF7;' +
    '  --cream-dark: #F5F0E8;' +
    '  --cream-border: #E8E0D0;' +
    '  --text-dark: #1A1612;' +
    '  --text-mid: #5C5247;' +
    '  --text-light: #8C8070;' +
    '  --shadow-sm: 0 1px 4px rgba(60,45,30,0.07);' +
    '  --shadow-md: 0 4px 20px rgba(60,45,30,0.10);' +
    '  --shadow-lg: 0 8px 40px rgba(60,45,30,0.13);' +
    '  --radius: 12px;' +
    '  --radius-lg: 20px;' +
    '}' +
    '*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }' +
    'html { scroll-behavior: smooth; }' +
    'body {' +
    '  background: var(--cream);' +
    '  color: var(--text-dark);' +
    '  font-family: "DM Sans", "Inter", system-ui, sans-serif;' +
    '  font-size: 16px;' +
    '  line-height: 1.65;' +
    '  -webkit-font-smoothing: antialiased;' +
    '}' +
    'h1, h2, h3, h4 {' +
    '  font-family: "Playfair Display", Georgia, serif;' +
    '  line-height: 1.2;' +
    '  color: var(--text-dark);' +
    '}' +
    'a { color: var(--primary); text-decoration: none; }' +
    'a:hover { text-decoration: underline; }' +
    '' +
    /* ── TOP BANNER ── */
    '.topbar {' +
    '  position: sticky; top: 0; z-index: 100;' +
    '  background: rgba(253,251,247,0.95);' +
    '  backdrop-filter: blur(12px);' +
    '  border-bottom: 1px solid var(--cream-border);' +
    '  padding: 0 32px;' +
    '  height: 56px;' +
    '  display: flex; align-items: center; justify-content: space-between;' +
    '}' +
    '.topbar-logo {' +
    '  font-family: "Playfair Display", serif;' +
    '  font-size: 17px;' +
    '  letter-spacing: 0.08em;' +
    '  color: var(--primary);' +
    '  font-weight: 500;' +
    '}' +
    '.topbar-logo span { color: var(--secondary); }' +
    '.topbar-cta-btn {' +
    '  background: var(--primary);' +
    '  color: #fff;' +
    '  padding: 8px 20px;' +
    '  border-radius: 50px;' +
    '  font-size: 13px;' +
    '  font-weight: 500;' +
    '  letter-spacing: 0.03em;' +
    '  transition: background 0.2s, transform 0.15s;' +
    '}' +
    '.topbar-cta-btn:hover { background: var(--secondary); text-decoration: none; transform: translateY(-1px); }' +
    '' +
    /* ── HERO ── */
    '.hero {' +
    '  min-height: 520px;' +
    '  display: flex; flex-direction: column; align-items: center; justify-content: center;' +
    '  text-align: center;' +
    '  padding: 80px 24px 64px;' +
    '  position: relative;' +
    '}' +
    '.hero-accent {' +
    '  display: inline-block;' +
    '  width: 48px; height: 2px;' +
    '  background: linear-gradient(90deg, var(--primary), var(--secondary));' +
    '  border-radius: 2px;' +
    '  margin-bottom: 28px;' +
    '}' +
    '.practice-logo {' +
    '  max-height: 72px; max-width: 240px;' +
    '  object-fit: contain;' +
    '  margin-bottom: 24px;' +
    '}' +
    '.practice-wordmark {' +
    '  font-family: "Playfair Display", serif;' +
    '  font-size: 22px;' +
    '  color: var(--primary);' +
    '  letter-spacing: 0.06em;' +
    '  margin-bottom: 24px;' +
    '}' +
    '.hero-greeting {' +
    '  font-size: 13px;' +
    '  letter-spacing: 0.12em;' +
    '  text-transform: uppercase;' +
    '  color: var(--secondary);' +
    '  margin-bottom: 16px;' +
    '  font-weight: 500;' +
    '}' +
    '.hero h1 {' +
    '  font-size: clamp(36px, 6vw, 64px);' +
    '  font-weight: 600;' +
    '  margin-bottom: 16px;' +
    '  max-width: 820px;' +
    '}' +
    '.hero-tagline {' +
    '  font-size: clamp(16px, 2.5vw, 20px);' +
    '  color: var(--text-mid);' +
    '  max-width: 560px;' +
    '  margin: 0 auto 28px;' +
    '  font-style: italic;' +
    '  font-family: "Playfair Display", serif;' +
    '}' +
    '.hero-location {' +
    '  font-size: 14px;' +
    '  color: var(--text-light);' +
    '  letter-spacing: 0.04em;' +
    '}' +
    '.hero-divider {' +
    '  width: 64px; height: 1px;' +
    '  background: var(--cream-border);' +
    '  margin: 28px auto 0;' +
    '}' +
    '' +
    /* ── LAYOUT ── */
    '.section {' +
    '  padding: 72px 24px;' +
    '}' +
    '.section-alt {' +
    '  background: var(--cream-dark);' +
    '}' +
    '.container {' +
    '  max-width: 900px;' +
    '  margin: 0 auto;' +
    '}' +
    '.section-label {' +
    '  font-size: 11px;' +
    '  letter-spacing: 0.18em;' +
    '  text-transform: uppercase;' +
    '  color: var(--secondary);' +
    '  font-weight: 600;' +
    '  margin-bottom: 10px;' +
    '}' +
    '.section-title {' +
    '  font-size: clamp(26px, 4vw, 40px);' +
    '  margin-bottom: 8px;' +
    '}' +
    '.section-sub {' +
    '  font-size: 16px;' +
    '  color: var(--text-mid);' +
    '  margin-bottom: 48px;' +
    '  max-width: 560px;' +
    '}' +
    '' +
    /* ── CARDS ── */
    '.card {' +
    '  background: #fff;' +
    '  border: 1px solid var(--cream-border);' +
    '  border-radius: var(--radius-lg);' +
    '  padding: 32px;' +
    '  box-shadow: var(--shadow-sm);' +
    '  transition: box-shadow 0.2s, transform 0.2s;' +
    '}' +
    '.card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }' +
    '.card-grid {' +
    '  display: grid;' +
    '  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));' +
    '  gap: 20px;' +
    '}' +
    '.card-icon {' +
    '  font-size: 28px;' +
    '  margin-bottom: 14px;' +
    '}' +
    '.card-label {' +
    '  font-size: 11px;' +
    '  letter-spacing: 0.14em;' +
    '  text-transform: uppercase;' +
    '  color: var(--text-light);' +
    '  font-weight: 600;' +
    '  margin-bottom: 6px;' +
    '}' +
    '.card-value {' +
    '  font-family: "Playfair Display", serif;' +
    '  font-size: 28px;' +
    '  color: var(--text-dark);' +
    '  font-weight: 600;' +
    '  line-height: 1.1;' +
    '  margin-bottom: 4px;' +
    '}' +
    '.card-detail {' +
    '  font-size: 14px;' +
    '  color: var(--text-mid);' +
    '}' +
    '' +
    /* ── STARS ── */
    '.stars { display: flex; gap: 3px; margin-bottom: 8px; }' +
    '.star { font-size: 18px; }' +
    '.star.full { color: var(--secondary); }' +
    '.star.half { color: var(--secondary); opacity: 0.6; }' +
    '.star.empty { color: var(--cream-border); }' +
    '' +
    /* ── SERVICE TAGS ── */
    '.services-wrap {' +
    '  display: flex; flex-wrap: wrap; gap: 10px;' +
    '  margin-top: 16px;' +
    '}' +
    '.service-tag {' +
    '  background: var(--cream-dark);' +
    '  border: 1px solid var(--cream-border);' +
    '  color: var(--text-mid);' +
    '  padding: 6px 16px;' +
    '  border-radius: 50px;' +
    '  font-size: 13px;' +
    '  font-weight: 500;' +
    '  letter-spacing: 0.02em;' +
    '  white-space: nowrap;' +
    '}' +
    '' +
    /* ── OPPORTUNITY ── */
    '.opp-grid {' +
    '  display: grid;' +
    '  grid-template-columns: 1fr 1fr 1fr;' +
    '  gap: 1px;' +
    '  background: var(--cream-border);' +
    '  border: 1px solid var(--cream-border);' +
    '  border-radius: var(--radius-lg);' +
    '  overflow: hidden;' +
    '  box-shadow: var(--shadow-sm);' +
    '}' +
    '@media (max-width: 640px) { .opp-grid { grid-template-columns: 1fr; } }' +
    '.opp-cell {' +
    '  background: #fff;' +
    '  padding: 36px 28px;' +
    '  text-align: center;' +
    '}' +
    '.opp-stat {' +
    '  font-family: "Playfair Display", serif;' +
    '  font-size: 52px;' +
    '  font-weight: 600;' +
    '  line-height: 1;' +
    '  color: var(--primary);' +
    '  margin-bottom: 8px;' +
    '}' +
    '.opp-stat-label {' +
    '  font-size: 14px;' +
    '  color: var(--text-mid);' +
    '  line-height: 1.4;' +
    '}' +
    '' +
    /* ── HOW IT WORKS ── */
    '.steps {' +
    '  display: grid;' +
    '  grid-template-columns: 1fr 40px 1fr 40px 1fr;' +
    '  align-items: center;' +
    '  gap: 0;' +
    '  margin-top: 8px;' +
    '}' +
    '@media (max-width: 700px) {' +
    '  .steps { grid-template-columns: 1fr; gap: 16px; }' +
    '  .step-arrow { display: none; }' +
    '}' +
    '.step {' +
    '  background: #fff;' +
    '  border: 1px solid var(--cream-border);' +
    '  border-radius: var(--radius-lg);' +
    '  padding: 32px 24px;' +
    '  text-align: center;' +
    '  box-shadow: var(--shadow-sm);' +
    '}' +
    '.step-number {' +
    '  width: 36px; height: 36px;' +
    '  background: linear-gradient(135deg, var(--primary), var(--secondary));' +
    '  color: #fff;' +
    '  border-radius: 50%;' +
    '  display: flex; align-items: center; justify-content: center;' +
    '  font-size: 14px;' +
    '  font-weight: 700;' +
    '  margin: 0 auto 16px;' +
    '}' +
    '.step-icon { font-size: 30px; margin-bottom: 12px; }' +
    '.step h4 { font-size: 15px; margin-bottom: 6px; font-weight: 600; font-family: "DM Sans", "Inter", sans-serif; }' +
    '.step p { font-size: 13px; color: var(--text-mid); line-height: 1.5; }' +
    '.step-arrow {' +
    '  text-align: center;' +
    '  font-size: 22px;' +
    '  color: var(--secondary);' +
    '  opacity: 0.6;' +
    '}' +
    '.powered-by {' +
    '  text-align: center;' +
    '  margin-top: 32px;' +
    '  font-size: 12px;' +
    '  color: var(--text-light);' +
    '  letter-spacing: 0.08em;' +
    '  text-transform: uppercase;' +
    '}' +
    '.powered-by strong { color: var(--primary); }' +
    '' +
    /* ── NUMBERS ── */
    '.numbers-grid {' +
    '  display: grid;' +
    '  grid-template-columns: repeat(3, 1fr);' +
    '  gap: 20px;' +
    '}' +
    '@media (max-width: 640px) { .numbers-grid { grid-template-columns: 1fr; } }' +
    '.number-card {' +
    '  background: #fff;' +
    '  border: 1px solid var(--cream-border);' +
    '  border-radius: var(--radius-lg);' +
    '  overflow: hidden;' +
    '  box-shadow: var(--shadow-sm);' +
    '}' +
    '.number-header {' +
    '  padding: 14px 20px;' +
    '  border-bottom: 1px solid var(--cream-border);' +
    '  font-size: 11px;' +
    '  letter-spacing: 0.14em;' +
    '  text-transform: uppercase;' +
    '  color: var(--text-light);' +
    '  font-weight: 600;' +
    '}' +
    '.number-row {' +
    '  display: flex; align-items: center; justify-content: space-between;' +
    '  padding: 16px 20px;' +
    '  border-bottom: 1px solid rgba(232,224,208,0.5);' +
    '}' +
    '.number-row:last-child { border-bottom: none; }' +
    '.number-row-label { font-size: 13px; color: var(--text-mid); }' +
    '.number-row-val {' +
    '  font-weight: 700;' +
    '  font-size: 15px;' +
    '  font-family: "Playfair Display", serif;' +
    '}' +
    '.val-before { color: var(--text-light); }' +
    '.val-after { color: var(--primary); }' +
    '.badge-before {' +
    '  display: inline-block;' +
    '  background: var(--cream-dark);' +
    '  color: var(--text-light);' +
    '  padding: 2px 10px;' +
    '  border-radius: 50px;' +
    '  font-size: 11px;' +
    '  font-weight: 600;' +
    '  letter-spacing: 0.05em;' +
    '  text-transform: uppercase;' +
    '  margin-bottom: 8px;' +
    '}' +
    '.badge-after {' +
    '  display: inline-block;' +
    '  background: linear-gradient(135deg, var(--primary), var(--secondary));' +
    '  color: #fff;' +
    '  padding: 2px 10px;' +
    '  border-radius: 50px;' +
    '  font-size: 11px;' +
    '  font-weight: 600;' +
    '  letter-spacing: 0.05em;' +
    '  text-transform: uppercase;' +
    '  margin-bottom: 8px;' +
    '}' +
    '' +
    /* ── CTA ── */
    '.cta-section {' +
    '  background: linear-gradient(135deg, var(--primary) 0%, #6B5840 100%);' +
    '  padding: 80px 24px;' +
    '  text-align: center;' +
    '  color: #fff;' +
    '}' +
    '.cta-section .section-label { color: rgba(255,255,255,0.6); }' +
    '.cta-section h2 { color: #fff; font-size: clamp(28px, 5vw, 48px); margin-bottom: 16px; }' +
    '.cta-section p { color: rgba(255,255,255,0.75); font-size: 17px; margin-bottom: 40px; max-width: 480px; margin-left: auto; margin-right: auto; }' +
    '.cta-btn {' +
    '  display: inline-block;' +
    '  background: var(--secondary);' +
    '  color: #fff;' +
    '  padding: 18px 44px;' +
    '  border-radius: 50px;' +
    '  font-size: 16px;' +
    '  font-weight: 600;' +
    '  letter-spacing: 0.04em;' +
    '  box-shadow: 0 4px 24px rgba(0,0,0,0.25);' +
    '  transition: transform 0.15s, box-shadow 0.15s, background 0.2s;' +
    '}' +
    '.cta-btn:hover {' +
    '  transform: translateY(-2px);' +
    '  box-shadow: 0 8px 32px rgba(0,0,0,0.32);' +
    '  background: #d4b278;' +
    '  text-decoration: none;' +
    '}' +
    '.cta-phone {' +
    '  display: block;' +
    '  margin-top: 24px;' +
    '  font-size: 15px;' +
    '  color: rgba(255,255,255,0.65);' +
    '  letter-spacing: 0.04em;' +
    '}' +
    '.cta-phone strong { color: rgba(255,255,255,0.9); }' +
    '' +
    /* ── FOOTER ── */
    '.pitch-footer {' +
    '  background: var(--cream-dark);' +
    '  border-top: 1px solid var(--cream-border);' +
    '  padding: 32px 24px;' +
    '  text-align: center;' +
    '}' +
    '.pitch-footer p {' +
    '  font-size: 13px;' +
    '  color: var(--text-light);' +
    '  line-height: 1.6;' +
    '}' +
    '.pitch-footer .footer-brand {' +
    '  font-family: "Playfair Display", serif;' +
    '  color: var(--primary);' +
    '  font-weight: 500;' +
    '}' +
    '.social-links { margin-top: 12px; display: flex; justify-content: center; gap: 16px; }' +
    '.social-link { font-size: 13px; color: var(--text-light); }' +
    '.social-link:hover { color: var(--primary); }' +
    '' +
    /* ── DIVIDER ORNAMENT ── */
    '.ornament {' +
    '  display: flex; align-items: center; gap: 16px;' +
    '  margin-bottom: 48px;' +
    '}' +
    '.ornament-line { flex: 1; height: 1px; background: var(--cream-border); }' +
    '.ornament-diamond {' +
    '  width: 6px; height: 6px;' +
    '  background: var(--secondary);' +
    '  transform: rotate(45deg);' +
    '}' +
    '' +
    /* ── RESPONSIVE ── */
    '@media (max-width: 480px) {' +
    '  .topbar { padding: 0 16px; }' +
    '  .section { padding: 48px 16px; }' +
    '  .hero { padding: 56px 16px 48px; }' +
    '  .opp-stat { font-size: 40px; }' +
    '}';

  var locationLine = location ? '<p class="hero-location">&#128205;&nbsp;' + location + '</p>' : '';
  var addressLine = address && !location ? '<p class="hero-location">&#128205;&nbsp;' + address + '</p>' : '';

  var glanceCards = '' +
    '<div class="card-grid">' +
    '  <div class="card">' +
    '    <div class="card-icon">&#11088;</div>' +
    '    <div class="card-label">Google Rating</div>' +
    '    <div class="stars">' + renderStars(googleRating) + '</div>' +
    '    <div class="card-value">' + escHtml(String(googleRating.toFixed(1))) + '</div>' +
    '    <div class="card-detail">' + escHtml(String(googleReviews)) + ' reviews on Google</div>' +
    '  </div>' +
    '  <div class="card">' +
    '    <div class="card-icon">&#128205;</div>' +
    '    <div class="card-label">Location</div>' +
    '    <div class="card-value" style="font-size:20px;line-height:1.3;">' + (location || escHtml(address) || 'On File') + '</div>' +
    (address && location ? '<div class="card-detail">' + escHtml(address) + '</div>' : '') +
    '  </div>' +
    (serviceTagsHtml ? (
      '  <div class="card">' +
      '    <div class="card-icon">&#10024;</div>' +
      '    <div class="card-label">Featured Services</div>' +
      '    <div class="services-wrap">' + serviceTagsHtml + '</div>' +
      '  </div>'
    ) : '') +
    '</div>';

  var lostRevenueDisplay = estimatedLostRevenue
    ? formatCurrency(estimatedLostRevenue) + '/mo'
    : '$3,200+/mo';

  var oppGrid = '' +
    '<div class="opp-grid">' +
    '  <div class="opp-cell">' +
    '    <div class="opp-stat">78%</div>' +
    '    <div class="opp-stat-label">of patients choose the first practice<br>that responds to their inquiry</div>' +
    '  </div>' +
    '  <div class="opp-cell">' +
    '    <div class="opp-stat" style="font-size:38px;">' + escHtml(lostRevenueDisplay) + '</div>' +
    '    <div class="opp-stat-label">estimated revenue lost to<br>slow or missed responses</div>' +
    '  </div>' +
    '  <div class="opp-cell">' +
    '    <div class="opp-stat" style="font-size:38px;">' + escHtml(responseTimeEstimate) + '</div>' +
    '    <div class="opp-stat-label">average current response time<br>for new patient inquiries</div>' +
    '  </div>' +
    '</div>';

  var stepsHtml = '' +
    '<div class="steps">' +
    '  <div class="step">' +
    '    <div class="step-number">1</div>' +
    '    <div class="step-icon">&#128172;</div>' +
    '    <h4>Patient Reaches Out</h4>' +
    '    <p>A new patient texts, calls, or submits a form — any hour of the day.</p>' +
    '  </div>' +
    '  <div class="step-arrow">&#8594;</div>' +
    '  <div class="step">' +
    '    <div class="step-number">2</div>' +
    '    <div class="step-icon">&#9889;</div>' +
    '    <h4>AI Responds in &lt;60s</h4>' +
    '    <p>Your AI answers instantly, answers questions, and qualifies the lead — trained on your practice.</p>' +
    '  </div>' +
    '  <div class="step-arrow">&#8594;</div>' +
    '  <div class="step">' +
    '    <div class="step-number">3</div>' +
    '    <div class="step-icon">&#128197;</div>' +
    '    <h4>Appointment Booked</h4>' +
    '    <p>The patient is guided to book directly. Your calendar fills while you focus on care.</p>' +
    '  </div>' +
    '</div>' +
    '<p class="powered-by">Powered by <strong>VelosLuxe</strong> &mdash; AI Patient Response for Med Spas</p>';

  var numbersGrid = '' +
    '<div class="numbers-grid">' +
    '  <div class="number-card">' +
    '    <div class="number-header">Revenue Recovered</div>' +
    '    <div class="number-row">' +
    '      <div>' +
    '        <div class="badge-before">Before</div>' +
    '        <div class="number-row-label">Missed inquiries</div>' +
    '      </div>' +
    '      <div class="number-row-val val-before">$0</div>' +
    '    </div>' +
    '    <div class="number-row">' +
    '      <div>' +
    '        <div class="badge-after">With VelosLuxe</div>' +
    '        <div class="number-row-label">Captured &amp; booked</div>' +
    '      </div>' +
    '      <div class="number-row-val val-after">' + escHtml(lostRevenueDisplay) + '</div>' +
    '    </div>' +
    '  </div>' +
    '  <div class="number-card">' +
    '    <div class="number-header">No-Show Rate</div>' +
    '    <div class="number-row">' +
    '      <div>' +
    '        <div class="badge-before">Before</div>' +
    '        <div class="number-row-label">Industry average</div>' +
    '      </div>' +
    '      <div class="number-row-val val-before">~20%</div>' +
    '    </div>' +
    '    <div class="number-row">' +
    '      <div>' +
    '        <div class="badge-after">With VelosLuxe</div>' +
    '        <div class="number-row-label">Automated reminders</div>' +
    '      </div>' +
    '      <div class="number-row-val val-after">&lt;7%</div>' +
    '    </div>' +
    '  </div>' +
    '  <div class="number-card">' +
    '    <div class="number-header">Response Time</div>' +
    '    <div class="number-row">' +
    '      <div>' +
    '        <div class="badge-before">Before</div>' +
    '        <div class="number-row-label">Current average</div>' +
    '      </div>' +
    '      <div class="number-row-val val-before">' + escHtml(responseTimeEstimate) + '</div>' +
    '    </div>' +
    '    <div class="number-row">' +
    '      <div>' +
    '        <div class="badge-after">With VelosLuxe</div>' +
    '        <div class="number-row-label">AI-powered reply</div>' +
    '      </div>' +
    '      <div class="number-row-val val-after">&lt; 60 seconds</div>' +
    '    </div>' +
    '  </div>' +
    '</div>';

  var socialLinksHtml = socialHtml
    ? '<div class="social-links">' + socialHtml + '</div>'
    : '';

  var heroStyle = heroBgStyle ? ' style="' + heroBgStyle + '"' : '';

  return '<!DOCTYPE html>' +
    '<html lang="en">' +
    '<head>' +
    '<meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<title>' + businessName + ' &mdash; A Personalized Proposal from VelosLuxe</title>' +
    '<meta name="description" content="VelosLuxe built something exclusively for ' + businessName + '. See how AI patient response can transform your practice.">' +
    '<meta name="robots" content="noindex, nofollow">' +
    '<meta property="og:title" content="' + businessName + ' &mdash; Your VelosLuxe Growth Plan">' +
    '<meta property="og:description" content="See the personalized opportunity report we built for ' + businessName + '.">' +
    '<meta property="og:type" content="website">' +
    (heroImageUrl ? '<meta property="og:image" content="' + heroImageUrl + '">' : '') +
    '<link rel="preconnect" href="https://fonts.googleapis.com">' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
    '<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">' +
    '<style>' + css + '</style>' +
    '</head>' +
    '<body>' +

    /* ── NAV ── */
    '<nav class="topbar">' +
    '  <span class="topbar-logo">VELOS<span>LUXE</span></span>' +
    '  <a href="https://velosluxe.com/book.html" class="topbar-cta-btn">Book a Walkthrough</a>' +
    '</nav>' +

    /* ── HERO ── */
    '<section class="hero"' + heroStyle + '>' +
    '  ' + logoHtml +
    '  ' + greetingHtml +
    '  <div class="hero-accent"></div>' +
    '  <h1>' + businessName + '</h1>' +
    '  <p class="hero-tagline">' + tagline + '</p>' +
    (locationLine || addressLine) +
    '  <div class="hero-divider"></div>' +
    '</section>' +

    /* ── AT A GLANCE ── */
    '<section class="section">' +
    '  <div class="container">' +
    '    <div class="section-label">Your Practice</div>' +
    '    <h2 class="section-title">At a Glance</h2>' +
    '    <p class="section-sub">What we found when we researched ' + businessName + '.</p>' +
    '    <div class="ornament"><div class="ornament-line"></div><div class="ornament-diamond"></div><div class="ornament-line"></div></div>' +
    '    ' + glanceCards +
    '  </div>' +
    '</section>' +

    /* ── THE OPPORTUNITY ── */
    '<section class="section section-alt">' +
    '  <div class="container">' +
    '    <div class="section-label">The Problem</div>' +
    '    <h2 class="section-title">The Opportunity You&#8217;re Missing</h2>' +
    '    <p class="section-sub">Every hour without an instant response is revenue walking out the door.</p>' +
    '    <div class="ornament"><div class="ornament-line"></div><div class="ornament-diamond"></div><div class="ornament-line"></div></div>' +
    '    ' + oppGrid +
    '  </div>' +
    '</section>' +

    /* ── WHAT WE BUILT ── */
    '<section class="section">' +
    '  <div class="container">' +
    '    <div class="section-label">The Solution</div>' +
    '    <h2 class="section-title">What We Built for ' + businessName + '</h2>' +
    '    <p class="section-sub">A done-for-you AI system that responds to every patient inquiry in under 60 seconds.</p>' +
    '    <div class="ornament"><div class="ornament-line"></div><div class="ornament-diamond"></div><div class="ornament-line"></div></div>' +
    '    ' + stepsHtml +
    '  </div>' +
    '</section>' +

    /* ── THE NUMBERS ── */
    '<section class="section section-alt">' +
    '  <div class="container">' +
    '    <div class="section-label">Impact</div>' +
    '    <h2 class="section-title">The Numbers</h2>' +
    '    <p class="section-sub">What changes when every inquiry gets an instant, intelligent reply.</p>' +
    '    <div class="ornament"><div class="ornament-line"></div><div class="ornament-diamond"></div><div class="ornament-line"></div></div>' +
    '    ' + numbersGrid +
    '  </div>' +
    '</section>' +

    /* ── CTA ── */
    '<section class="cta-section">' +
    '  <div class="container">' +
    '    <div class="section-label">Next Step</div>' +
    '    <h2>Book Your Free Walkthrough</h2>' +
    '    <p>See the live system we built for ' + businessName + '. No commitment, no pitch deck &mdash; just a working demo.</p>' +
    '    <a href="https://velosluxe.com/book.html" class="cta-btn">Reserve My Free Spot &rarr;</a>' +
    '    <span class="cta-phone">Or call us at <strong>(855) VELOS-AI</strong></span>' +
    '  </div>' +
    '</section>' +

    /* ── FOOTER ── */
    '<footer class="pitch-footer">' +
    '  <p>Prepared exclusively for <strong>' + businessName + '</strong> by <span class="footer-brand">VelosLuxe</span></p>' +
    '  <p style="margin-top:6px;">AI-Powered Patient Response &mdash; Built for Med Spas &bull; <a href="https://velosluxe.com">velosluxe.com</a></p>' +
    (socialLinksHtml || '') +
    '  <p style="margin-top:16px;font-size:12px;opacity:0.6;">&copy; ' + new Date().getFullYear() + ' VelosLuxe. This page was prepared exclusively for ' + businessName + ' and is not intended for general distribution.</p>' +
    '</footer>' +

    '</body></html>';
}

function setupPitchRoutes(app) {
  app.get('/for/:slug', async function(req, res, next) {
    var slug = req.params.slug;

    if (!slug || !/^[a-zA-Z0-9_-]+$/.test(slug)) {
      return next();
    }

    var spaceship = getSpaceship();

    try {
      var result = await spaceship
        .from('pitch_pages')
        .select('id, lead_id, slug, enrichment_data, page_views, created_at, leads(business_name, city, state, address, google_rating, google_reviews)')
        .eq('slug', slug)
        .single();

      if (result.error || !result.data) {
        return next();
      }

      var pitch = result.data;
      var lead = pitch.leads || {};
      var enrichment = pitch.enrichment_data || {};

      // Fire-and-forget page view increment
      spaceship
        .from('pitch_pages')
        .update({ page_views: (pitch.page_views || 0) + 1 })
        .eq('id', pitch.id)
        .then(function() {})
        .catch(function() {});

      var html = buildPage(pitch, lead, enrichment);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      return res.send(html);

    } catch (err) {
      console.error('[pitch] Error rendering slug=' + slug + ':', err);
      return next();
    }
  });
}

module.exports = { setupPitchRoutes };
