/* ═══ VelosLuxe Admin Dashboard ═══ */

// Admin key from URL param (?key=xxx) or sessionStorage
const urlKey = new URLSearchParams(window.location.search).get('key');
if (urlKey) {
  sessionStorage.setItem('adminKey', urlKey);
  window.history.replaceState({}, '', window.location.pathname);
}
const ADMIN_KEY = sessionStorage.getItem('adminKey') || '';

async function fetchJSON(url) {
  const res = await fetch(url, { headers: { 'x-admin-key': ADMIN_KEY } });
  if (res.status === 401) {
    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;"><h1>Unauthorized — add ?key=YOUR_KEY to the URL</h1></div>';
    throw new Error('Unauthorized');
  }
  return res.json();
}

// ═══ LOAD STATS ═══
async function loadStats() {
  try {
    const stats = await fetchJSON('/api/admin/stats');
    document.getElementById('totalLeads').textContent = stats.totalLeads;
    document.getElementById('totalCalls').textContent = stats.totalCalls;
    document.getElementById('leadsToday').textContent = stats.leadsToday;
    document.getElementById('callsToday').textContent = stats.callsToday;
  } catch (e) {
    console.error('Failed to load stats:', e);
  }
}

// ═══ LOAD LEADS ═══
async function loadLeads() {
  try {
    const leads = await fetchJSON('/api/admin/leads?limit=100');
    const tbody = document.getElementById('leadsBody');
    const count = document.getElementById('leadsCount');
    count.textContent = leads.length + ' records';

    if (leads.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty">No leads yet. Submit the demo form to capture your first lead.</td></tr>';
      return;
    }

    tbody.innerHTML = leads.map(l => `
      <tr>
        <td>${esc(l.name)}</td>
        <td>${esc(l.email || '—')}</td>
        <td>${esc(l.spa_name || '—')}</td>
        <td><span class="status-badge requested">${esc(l.source)}</span></td>
        <td>${formatDate(l.created_at)}</td>
        <td><button class="delete-btn" onclick="deleteLead(${l.id})">Delete</button></td>
      </tr>
    `).join('');
  } catch (e) {
    console.error('Failed to load leads:', e);
  }
}

// ═══ LOAD CALLS ═══
async function loadCalls() {
  try {
    const calls = await fetchJSON('/api/admin/calls?limit=100');
    const tbody = document.getElementById('callsBody');
    const count = document.getElementById('callsCount');
    count.textContent = calls.length + ' records';

    if (calls.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty">No calls yet. Use the call form or test call below.</td></tr>';
      return;
    }

    tbody.innerHTML = calls.map(c => `
      <tr>
        <td>${esc(c.name)}</td>
        <td>${esc(c.phone)}</td>
        <td>${esc(c.source)}</td>
        <td><span class="status-badge ${esc(c.status)}">${esc(c.status)}</span></td>
        <td>${formatDate(c.created_at)}</td>
      </tr>
    `).join('');
  } catch (e) {
    console.error('Failed to load calls:', e);
  }
}

// ═══ DELETE LEAD ═══
async function deleteLead(id) {
  if (!confirm('Delete this lead?')) return;
  try {
    await fetch(`/api/admin/leads/${id}`, { method: 'DELETE', headers: { 'x-admin-key': ADMIN_KEY } });
    loadLeads();
    loadStats();
  } catch (e) {
    console.error('Failed to delete lead:', e);
  }
}

// ═══ PHONE AUTO-FORMAT ═══
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

// ═══ TEST CALL ═══
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
    const res = await fetch('/api/admin/test-call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
      body: JSON.stringify({ name, phone })
    });
    const data = await res.json();

    if (data.success) {
      status.textContent = 'Call initiated! Phone should ring shortly.';
      status.className = 'test-status success';
      loadCalls();
      loadStats();
    } else {
      status.textContent = data.error || 'Call failed.';
      status.className = 'test-status error';
    }
  } catch (e) {
    status.textContent = 'Network error. Is the server running?';
    status.className = 'test-status error';
  }

  setTimeout(() => {
    btn.disabled = false;
    btn.textContent = 'Call Now';
  }, 3000);
}

// ═══ LOAD VAPI CALL LOG ═══
async function loadVapiCalls() {
  try {
    const calls = await fetchJSON('/api/admin/vapi-calls?limit=50');
    const tbody = document.getElementById('vapiCallsBody');
    const count = document.getElementById('vapiCallsCount');
    count.textContent = calls.length + ' calls';

    if (calls.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty">No voice agent calls yet.</td></tr>';
      return;
    }

    tbody.innerHTML = calls.map(c => `
      <tr>
        <td>${esc(c.phone || '—')}</td>
        <td>${esc(c.name || '—')}</td>
        <td><span class="status-badge ${esc(c.type)}">${esc(c.type)}</span></td>
        <td><span class="status-badge ${esc(c.status)}">${esc(c.status)}</span></td>
        <td>${c.duration ? c.duration + 's' : '—'}</td>
        <td>${formatDate(c.startedAt)}</td>
      </tr>
    `).join('');
  } catch (e) {
    console.error('Failed to load Vapi calls:', e);
  }
}

// ═══ LOAD AI CONFIG ═══
async function loadConfig() {
  try {
    const config = await fetchJSON('/api/vapi-token');
    document.getElementById('assistantId').textContent = config.assistantId || '—';
  } catch (e) {
    document.getElementById('assistantId').textContent = 'Error loading';
  }
}

// ═══ UTILITIES ═══
function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// ═══ INIT ═══
function refreshAll() {
  loadStats();
  loadLeads();
  loadCalls();
  loadVapiCalls();
}

refreshAll();
loadConfig();

// Auto-refresh every 30 seconds
setInterval(refreshAll, 30000);
