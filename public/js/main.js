/* ═══════════════════════════════════════════════════════
   VelosLuxe — Main JavaScript
   ═══════════════════════════════════════════════════════ */

// ═══ SCROLL REVEAL ANIMATIONS ═══
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('vis');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: .15, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.rv').forEach(el => revealObserver.observe(el));

// ═══ TOPBAR SCROLL EFFECT ═══
window.addEventListener('scroll', () => {
  document.getElementById('topbar').classList.toggle('scrolled', window.scrollY > 80);
});

// ═══ HERO COUNTER ANIMATION ═══
let heroCounterDone = false;
const heroObserver = new IntersectionObserver(([entry]) => {
  if (entry.isIntersecting && !heroCounterDone) {
    heroCounterDone = true;
    animateHeroCounter();
  }
}, { threshold: .5 });

const counterCard = document.querySelector('.counter-card');
if (counterCard) heroObserver.observe(counterCard);

function animateHeroCounter() {
  const el = document.getElementById('heroCounter');
  const unit = document.getElementById('heroUnit');
  if (!el || !unit) return;

  const steps = [
    { v: '42', u: 'hours', d: 1200 },
    { v: '24', u: 'hours', d: 400 },
    { v: '6',  u: 'hours', d: 400 },
    { v: '60', u: 'minutes', d: 300 },
    { v: '5',  u: 'minutes', d: 300 },
    { v: '30', u: 'seconds', d: 250 },
    { v: '5',  u: 'seconds', d: 250 },
    { v: '0.8', u: 'seconds', d: 0 }
  ];

  let i = 0;
  function next() {
    if (i >= steps.length) return;
    el.textContent = steps[i].v;
    unit.textContent = steps[i].u;
    if (i === steps.length - 1) {
      el.style.color = 'var(--sage)';
      unit.style.color = 'var(--sage)';
    }
    const delay = steps[i].d;
    i++;
    if (i < steps.length) setTimeout(next, delay);
  }
  next();
}

// ═══ BOOK A DEMO / HAVE SOPHIA CALL ═══
function submitBooking() {
  const name = document.getElementById('bookName').value.trim();
  const phone = document.getElementById('bookPhone').value.trim();
  const spa = document.getElementById('bookSpa').value.trim();
  const status = document.getElementById('bookStatus');
  const btn = document.getElementById('bookBtn');

  if (!name || !phone) {
    status.textContent = 'Please enter your name and phone number.';
    status.style.color = '#ef4444';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Connecting you to Sophia...';
  status.textContent = '';

  // Save lead
  fetch('/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      spa_name: spa || null,
      source: 'demo_booking'
    })
  }).catch(() => {});

  // Trigger Sophia to call them
  fetch('/api/call', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, phone })
  })
  .then(r => r.json())
  .then(data => {
    if (data.success) {
      if (typeof fbq === 'function') fbq('track', 'Lead', { content_name: 'demo_call' });
      status.textContent = "Sophia is calling you now! Pick up your phone.";
      status.style.color = 'var(--sage, #4ade80)';
      btn.textContent = 'Call Initiated!';
    } else {
      status.textContent = data.error || 'Something went wrong. Please try again.';
      status.style.color = '#ef4444';
      btn.disabled = false;
      btn.textContent = 'Have Sophia Call Me Now';
    }
  })
  .catch(() => {
    status.textContent = 'Network error. Please try again.';
    status.style.color = '#ef4444';
    btn.disabled = false;
    btn.textContent = 'Have Sophia Call Me Now';
  });
}

// ═══ VAPI WEB SDK — BROWSER CALL ═══
function toggleBrowserCall() {
  // Find the vapi-widget's internal button and click it
  var vapiWidget = document.querySelector('vapi-widget');
  if (vapiWidget && vapiWidget.shadowRoot) {
    var btn = vapiWidget.shadowRoot.querySelector('button');
    if (btn) { btn.click(); return; }
  }
  // Fallback: try clicking the widget element itself
  if (vapiWidget) {
    vapiWidget.click();
    return;
  }
  // If widget hasn't loaded yet
  var statusEl = document.getElementById('browserCallStatus');
  if (statusEl) {
    statusEl.textContent = 'Loading... please try again in a moment.';
    statusEl.style.color = '#ef4444';
  }
}

// ═══ FAQ ACCORDIONS ═══
document.querySelectorAll('.faq-item').forEach(item => {
  item.addEventListener('click', () => {
    item.classList.toggle('open');
  });
});

// ═══ SMOOTH SCROLL ═══
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
