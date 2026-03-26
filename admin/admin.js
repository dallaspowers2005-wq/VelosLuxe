/* ═══ Client Value-Proof Dashboard ═══ */

// Admin key from URL param (?key=xxx) or sessionStorage
const urlKey = new URLSearchParams(window.location.search).get('key');
if (urlKey) {
  sessionStorage.setItem('adminKey', urlKey);
  window.history.replaceState({}, '', window.location.pathname);
}
const ADMIN_KEY = sessionStorage.getItem('adminKey') || '';

let currentDays = 7; // default time filter

async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { 'x-admin-key': ADMIN_KEY, 'Content-Type': 'application/json', ...opts.headers }
  });
  if (res.status === 401) {
    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#ccc;"><h1>Unauthorized — add ?key=YOUR_KEY to the URL</h1></div>';
    throw new Error('Unauthorized');
  }
  return res.json();
}

// ═══ DASHBOARD STATS ═══
async function loadDashboard() {
  try {
    const params = currentDays > 0 ? `?days=${currentDays}` : '';
    const stats = await fetchJSON(`/api/admin/dashboard${params}`);

    document.getElementById('clientName').textContent = stats.clientName || 'Dashboard';
    document.title = (stats.clientName || 'Dashboard') + ' — Dashboard';

    document.getElementById('totalCalls').textContent = stats.calls || 0;
    document.getElementById('callsSub').textContent = stats.callsThisMonth ? `${stats.callsThisMonth} this month` : '';

    document.getElementById('totalLeads').textContent = stats.leads || 0;
    document.getElementById('leadsSub').textContent = stats.leadsThisMonth ? `${stats.leadsThisMonth} this month` : '';

    document.getElementById('totalSms').textContent = stats.smsSent || 0;
    document.getElementById('smsSub').textContent = stats.smsThisMonth ? `${stats.smsThisMonth} this month` : '';

    document.getElementById('totalReviews').textContent = stats.reviewRequests || 0;
    document.getElementById('reviewsSub').textContent = '';

    document.getElementById('totalAppointments').textContent = stats.appointments || 0;
    document.getElementById('appointmentsSub').textContent = '';

    // Activity feed
    const feed = document.getElementById('activityFeed');
    if (stats.recentActivity && stats.recentActivity.length > 0) {
      feed.innerHTML = stats.recentActivity.map(a => `
        <div class="activity-item">
          <span class="activity-icon">${activityIcon(a.type)}</span>
          <div class="activity-content">
            <span class="activity-text">${esc(a.description)}</span>
            <span class="activity-time">${formatDate(a.created_at)}</span>
          </div>
        </div>
      `).join('');
    } else {
      feed.innerHTML = '<div class="empty">No recent activity</div>';
    }
  } catch (e) {
    console.error('Failed to load dashboard:', e);
  }
}

function activityIcon(type) {
  const icons = { call: 'phone', lead: 'person', sms: 'chat', review: 'star', appointment: 'calendar' };
  return icons[type] || 'info';
}

// ═══ SMS LOG ═══
async function loadSmsLog() {
  try {
    const logs = await fetchJSON('/api/admin/sms-log?limit=50');
    const tbody = document.getElementById('smsBody');
    document.getElementById('smsCount').textContent = logs.length + ' messages';

    if (logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty">No SMS sent yet</td></tr>';
      return;
    }

    tbody.innerHTML = logs.map(s => `
      <tr>
        <td>${esc(s.phone)}</td>
        <td><span class="status-badge ${esc(s.sms_type || '')}">${esc(s.sms_type || 'general')}</span></td>
        <td class="msg-cell">${esc(truncate(s.message, 60))}</td>
        <td><span class="status-badge ${esc(s.status)}">${esc(s.status)}</span></td>
        <td>${formatDate(s.created_at)}</td>
      </tr>
    `).join('');
  } catch (e) {
    console.error('Failed to load SMS log:', e);
  }
}

// ═══ CONTACTS ═══
async function loadContacts() {
  try {
    const contacts = await fetchJSON('/api/admin/contacts?limit=100');
    const tbody = document.getElementById('contactsBody');
    document.getElementById('contactsCount').textContent = contacts.length + ' contacts';

    if (contacts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty">No contacts yet</td></tr>';
      return;
    }

    tbody.innerHTML = contacts.map(c => `
      <tr>
        <td>${esc(c.name || '—')}</td>
        <td>${esc(c.phone)}</td>
        <td><span class="status-badge">${esc(c.source || '—')}</span></td>
        <td>${formatDate(c.last_appointment_at)}</td>
        <td>${formatDate(c.last_sms_at)}</td>
      </tr>
    `).join('');
  } catch (e) {
    console.error('Failed to load contacts:', e);
  }
}

// ═══ SETTINGS ═══
async function loadSettings() {
  try {
    const data = await fetchJSON('/api/admin/dashboard');
    document.getElementById('settingsReviewLink').value = data.settings?.google_review_link || '';
    document.getElementById('settingsReviewDelay').value = data.settings?.review_delay_minutes || 60;
    document.getElementById('settingsFollowupDays').value = data.settings?.followup_inactive_days || 60;
    document.getElementById('settingsFollowupEnabled').value = data.settings?.followup_enabled ? '1' : '0';
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
}

async function saveSettings() {
  const status = document.getElementById('settingsStatus');
  try {
    const body = {
      google_review_link: document.getElementById('settingsReviewLink').value.trim() || null,
      review_delay_minutes: parseInt(document.getElementById('settingsReviewDelay').value) || 60,
      followup_inactive_days: parseInt(document.getElementById('settingsFollowupDays').value) || 60,
      followup_enabled: parseInt(document.getElementById('settingsFollowupEnabled').value)
    };

    await fetchJSON('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(body)
    });

    status.textContent = 'Saved!';
    status.className = 'form-status success';
    setTimeout(() => { status.textContent = ''; }, 2000);
  } catch (e) {
    status.textContent = 'Failed to save';
    status.className = 'form-status error';
  }
}

// ═══ TEST CALL ═══
function formatPhoneInput(input) {
  let digits = input.value.replace(/\D/g, '');
  if (digits.length > 10 && digits[0] === '1') digits = digits.slice(1);
  if (digits.length > 10) digits = digits.slice(0, 10);
  let formatted = '';
  if (digits.length > 0) formatted = '(' + digits.slice(0, 3);
  if (digits.length >= 3) formatted += ') ';
  if (digits.length > 3) formatted += digits.slice(3, 6);
  if (digits.length >= 6) formatted += '-' + digits.slice(6, 10);
  input.value = formatted;
}

function getE164Phone(formatted) {
  const digits = formatted.replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits[0] === '1') return '+' + digits;
  return '+' + digits;
}

document.querySelectorAll('input[type="tel"]').forEach(input => {
  input.addEventListener('input', () => formatPhoneInput(input));
});

async function triggerTestCall() {
  const name = document.getElementById('testName').value.trim() || 'Test User';
  const rawPhone = document.getElementById('testPhone').value.trim();
  const status = document.getElementById('testStatus');
  const btn = document.getElementById('testCallBtn');

  if (!rawPhone) {
    status.textContent = 'Please enter a phone number.';
    status.className = 'test-status error';
    return;
  }

  const phone = getE164Phone(rawPhone);
  if (phone.length < 12) {
    status.textContent = 'Please enter a valid 10-digit phone number.';
    status.className = 'test-status error';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Calling...';
  status.textContent = '';

  try {
    const res = await fetchJSON('/api/admin/test-call', {
      method: 'POST',
      body: JSON.stringify({ name, phone })
    });

    if (res.success) {
      status.textContent = 'Call initiated! Phone should ring shortly.';
      status.className = 'test-status success';
    } else {
      status.textContent = res.error || 'Call failed.';
      status.className = 'test-status error';
    }
  } catch (e) {
    status.textContent = 'Network error.';
    status.className = 'test-status error';
  }

  setTimeout(() => {
    btn.disabled = false;
    btn.textContent = 'Call Now';
  }, 3000);
}

// ═══ TIME FILTER ═══
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentDays = parseInt(btn.dataset.days);
    loadDashboard();
  });
});

// ═══ UTILITIES ═══
function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '...' : str;
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// ═══ INIT ═══
function refreshAll() {
  loadDashboard();
  loadSmsLog();
  loadContacts();
}

refreshAll();
loadSettings();
setInterval(refreshAll, 30000);
