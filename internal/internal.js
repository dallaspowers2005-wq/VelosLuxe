/* ═══ VelosLuxe Internal Setup Tool ═══ */

// Internal key from URL param or sessionStorage
const urlKey = new URLSearchParams(window.location.search).get('key');
if (urlKey) {
  sessionStorage.setItem('internalKey', urlKey);
  window.history.replaceState({}, '', window.location.pathname);
}
const INTERNAL_KEY = sessionStorage.getItem('internalKey') || '';

let platformsCache = [];

async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { 'x-internal-key': INTERNAL_KEY, 'Content-Type': 'application/json', ...opts.headers }
  });
  if (res.status === 401) {
    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#ccc;"><h1>Unauthorized — add ?key=INTERNAL_KEY to the URL</h1></div>';
    throw new Error('Unauthorized');
  }
  return res.json();
}

// ═══ PLATFORMS ═══
async function loadPlatforms() {
  try {
    platformsCache = await fetchJSON('/api/internal/platforms');
    const select = document.getElementById('platformSelect');
    const editSelect = document.getElementById('editPlatformSelect');

    for (const p of platformsCache) {
      const opt = new Option(p.displayName, p.platformName);
      select.add(opt);
      if (editSelect) editSelect.add(opt.cloneNode(true));
    }
  } catch (e) {
    console.error('Failed to load platforms:', e);
  }
}

function renderDynamicFields(platform, credContainer, configContainer, prefix) {
  credContainer.innerHTML = '';
  configContainer.innerHTML = '';
  if (!platform) return;

  const meta = platformsCache.find(p => p.platformName === platform);
  if (!meta) return;

  // Show OAuth notice for OAuth platforms
  const oauthNotice = document.getElementById('oauthNotice');
  if (oauthNotice) {
    oauthNotice.style.display = meta.authType === 'oauth' ? 'block' : 'none';
  }

  // Credential fields (skip for OAuth platforms — tokens come from OAuth flow)
  if (meta.authType !== 'oauth') {
    for (const f of meta.credentialFields) {
      if (f.oauth) continue;
      const div = document.createElement('div');
      div.className = 'field';
      div.innerHTML = `<label>${esc(f.label)}</label>
        <input type="${f.type === 'textarea' ? 'text' : (f.type || 'text')}" id="${prefix}_cred_${f.key}" placeholder="${esc(f.label)}">`;
      credContainer.appendChild(div);
    }
  }

  // Config fields
  for (const f of meta.configFields) {
    const div = document.createElement('div');
    div.className = 'field' + (f.type === 'textarea' ? ' full' : '');
    if (f.type === 'textarea') {
      div.innerHTML = `<label>${esc(f.label)}</label>
        <textarea id="${prefix}_conf_${f.key}" rows="2" placeholder="${esc(f.label)}"></textarea>`;
    } else {
      div.innerHTML = `<label>${esc(f.label)}</label>
        <input type="${f.type || 'text'}" id="${prefix}_conf_${f.key}" placeholder="${esc(f.label)}">`;
    }
    configContainer.appendChild(div);
  }
}

function onPlatformChange() {
  const platform = document.getElementById('platformSelect').value;
  renderDynamicFields(platform,
    document.getElementById('credentialFields'),
    document.getElementById('configFields'),
    'prov');
}

function onEditPlatformChange() {
  const platform = document.getElementById('editPlatformSelect').value;
  renderDynamicFields(platform,
    document.getElementById('editNewCredFields'),
    document.getElementById('editNewConfigFields'),
    'editNew');
}

function collectDynamicFields(platform, prefix) {
  const meta = platformsCache.find(p => p.platformName === platform);
  if (!meta) return { credentials: {}, config: {} };

  const credentials = {};
  for (const f of meta.credentialFields) {
    if (f.oauth) continue;
    const el = document.getElementById(`${prefix}_cred_${f.key}`);
    if (el && el.value.trim()) credentials[f.key] = el.value.trim();
  }

  const config = {};
  for (const f of meta.configFields) {
    const el = document.getElementById(`${prefix}_conf_${f.key}`);
    if (el && el.value.trim()) config[f.key] = el.value.trim();
  }

  return { credentials, config };
}

// ═══ OVERVIEW ═══
async function loadOverview() {
  try {
    const stats = await fetchJSON('/api/internal/overview');
    document.getElementById('activeClients').textContent = stats.activeClients || 0;
    document.getElementById('totalLeadsAll').textContent = stats.totalLeads || 0;
    document.getElementById('totalCallsAll').textContent = stats.totalCalls || 0;
    document.getElementById('totalSmsAll').textContent = stats.totalSms || 0;
  } catch (e) {
    console.error('Failed to load overview:', e);
  }
}

// ═══ CLIENT LIST ═══
async function loadClients() {
  try {
    const clients = await fetchJSON('/api/internal/clients');
    const tbody = document.getElementById('clientsBody');
    document.getElementById('clientsCount').textContent = clients.length + ' clients';

    if (clients.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty">No clients yet. Provision your first client above.</td></tr>';
      return;
    }

    tbody.innerHTML = clients.map(c => `
      <tr>
        <td>${esc(c.name)}</td>
        <td><code>${esc(c.slug)}</code></td>
        <td>${esc(c.sms_phone_number || '—')}</td>
        <td><span class="status-badge ${esc(c.status)}">${esc(c.status)}</span></td>
        <td>${formatDate(c.created_at)}</td>
        <td class="actions-cell">
          <button class="small-btn" onclick="openEditModal(${c.id})">Edit</button>
          <button class="small-btn" onclick="copyDashLink(${c.id}, '${esc(c.admin_key)}')">Copy Link</button>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    console.error('Failed to load clients:', e);
  }
}

// ═══ PROVISION CLIENT ═══
async function provisionClient(e) {
  e.preventDefault();
  const btn = document.getElementById('provisionBtn');
  const status = document.getElementById('provisionStatus');

  btn.disabled = true;
  btn.textContent = 'Provisioning...';
  status.textContent = '';

  const platform = document.getElementById('platformSelect').value;
  const { credentials, config } = platform ? collectDynamicFields(platform, 'prov') : { credentials: null, config: null };

  const body = {
    name: document.getElementById('spaName').value.trim(),
    assistant_name: document.getElementById('assistantName').value.trim() || 'Sophia',
    contact_name: document.getElementById('contactName').value.trim(),
    contact_email: document.getElementById('contactEmail').value.trim(),
    contact_phone: document.getElementById('contactPhone').value.trim(),
    services: document.getElementById('services').value.trim(),
    hours: document.getElementById('hours').value.trim(),
    crm_webhook_url: document.getElementById('crmWebhook').value.trim() || null,
    booking_webhook_url: document.getElementById('bookingWebhook').value.trim() || null,
    google_review_link: document.getElementById('googleReviewLink').value.trim() || null,
    review_delay_minutes: parseInt(document.getElementById('reviewDelay').value) || 60,
    integration_platform: platform || undefined,
    integration_credentials: credentials || undefined,
    integration_config: config || undefined
  };

  try {
    const data = await fetchJSON('/api/internal/clients', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    if (data.error) {
      status.textContent = data.error;
      status.className = 'form-status error';
    } else {
      let statusMsg = 'Client provisioned!';
      if (data.integration_status) statusMsg += ` (integration: ${data.integration_status})`;
      status.textContent = statusMsg;
      status.className = 'form-status success';

      // Show result
      const result = document.getElementById('provisionResult');
      result.style.display = 'block';
      const baseUrl = window.location.origin;
      document.getElementById('resultDashUrl').textContent = `${baseUrl}/admin/?key=${data.admin_key}`;
      document.getElementById('resultAdminKey').textContent = data.admin_key;
      document.getElementById('resultPhone').textContent = data.phone_number || 'None assigned';
      document.getElementById('resultApptWebhook').textContent = `${baseUrl}/api/webhook/appointment/${data.slug}`;
      document.getElementById('resultVapiWebhook').textContent = `${baseUrl}/api/vapi/webhook/${data.slug}`;

      loadClients();
      loadOverview();
    }
  } catch (e) {
    status.textContent = 'Network error';
    status.className = 'form-status error';
  }

  btn.disabled = false;
  btn.textContent = 'Provision Client';
}

// ═══ EDIT CLIENT ═══
let editingClientId = null;

async function openEditModal(id) {
  editingClientId = id;
  try {
    const client = await fetchJSON(`/api/internal/clients/${id}`);
    document.getElementById('editId').value = client.id;
    document.getElementById('editName').value = client.name || '';
    document.getElementById('editContactName').value = client.contact_name || '';
    document.getElementById('editContactEmail').value = client.contact_email || '';
    document.getElementById('editContactPhone').value = client.contact_phone || '';
    document.getElementById('editAssistantName').value = client.assistant_name || 'Sophia';
    document.getElementById('editCrmWebhook').value = client.crm_webhook_url || '';
    document.getElementById('editBookingWebhook').value = client.booking_webhook_url || '';
    document.getElementById('editGoogleReview').value = client.google_review_link || '';
    document.getElementById('editReviewDelay').value = client.review_delay_minutes || 60;
    document.getElementById('editFollowupDays').value = client.followup_inactive_days || 60;
    const statusSelect = document.querySelector('#editModal select#editStatus');
    if (statusSelect) statusSelect.value = client.status || 'active';
    document.getElementById('editFollowupEnabled').value = client.followup_enabled ? '1' : '0';
    document.getElementById('editModalTitle').textContent = `Edit: ${client.name}`;
    document.getElementById('editModal').style.display = 'flex';

    // Load integrations
    loadClientIntegrations(id);
  } catch (e) {
    alert('Failed to load client details');
  }
}

async function loadClientIntegrations(clientId) {
  const container = document.getElementById('editIntegrationsList');
  try {
    const integrations = await fetchJSON(`/api/internal/clients/${clientId}/integrations`);
    if (integrations.length === 0) {
      container.innerHTML = '<p style="color:#666;font-size:0.85rem;">No integrations configured.</p>';
      return;
    }

    container.innerHTML = integrations.map(int => {
      const meta = platformsCache.find(p => p.platformName === int.platform);
      const displayName = meta ? meta.displayName : int.platform;
      const statusClass = int.status === 'active' ? 'active' : (int.status === 'error' ? 'error' : 'paused');
      return `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid #222;">
          <div>
            <strong>${esc(displayName)}</strong>
            <span style="color:#888;font-size:0.8rem;margin-left:0.5rem;">${esc(int.purpose)}</span>
            <span class="status-badge ${statusClass}" style="margin-left:0.5rem;">${esc(int.status)}</span>
            ${int.last_error ? `<span style="color:#f66;font-size:0.75rem;display:block;">${esc(int.last_error)}</span>` : ''}
          </div>
          <div>
            ${meta && meta.authType === 'oauth' ? `<button class="small-btn" onclick="connectOAuth('${esc(int.platform)}', ${clientId})">Reconnect</button>` : ''}
            <button class="small-btn" onclick="testIntegration(${clientId}, ${int.id})">Test</button>
            <button class="small-btn" onclick="removeIntegration(${clientId}, ${int.id})">Remove</button>
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    container.innerHTML = '<p style="color:#f66;">Failed to load integrations</p>';
  }
}

function showAddIntegration() {
  document.getElementById('addIntegrationForm').style.display = 'block';
  document.getElementById('addIntStatus').textContent = '';
}

async function addIntegrationForClient() {
  const platform = document.getElementById('editPlatformSelect').value;
  const statusEl = document.getElementById('addIntStatus');
  if (!platform) { statusEl.textContent = 'Select a platform'; return; }

  const meta = platformsCache.find(p => p.platformName === platform);

  // For OAuth platforms, redirect to OAuth flow
  if (meta && meta.authType === 'oauth') {
    connectOAuth(platform, editingClientId);
    return;
  }

  const { credentials, config } = collectDynamicFields(platform, 'editNew');
  statusEl.textContent = 'Testing connection...';

  try {
    const result = await fetchJSON(`/api/internal/clients/${editingClientId}/integrations`, {
      method: 'POST',
      body: JSON.stringify({
        platform,
        purpose: meta?.capabilities?.booking && meta?.capabilities?.crm ? 'both'
          : meta?.capabilities?.booking ? 'booking' : 'crm',
        auth_type: meta?.authType || 'api_key',
        credentials,
        config
      })
    });

    if (result.success) {
      statusEl.textContent = 'Added!';
      statusEl.className = 'form-status success';
      document.getElementById('addIntegrationForm').style.display = 'none';
      loadClientIntegrations(editingClientId);
    } else {
      statusEl.textContent = result.error || 'Failed';
      statusEl.className = 'form-status error';
    }
  } catch (e) {
    statusEl.textContent = 'Network error';
    statusEl.className = 'form-status error';
  }
}

async function testIntegration(clientId, intId) {
  try {
    const result = await fetchJSON(`/api/internal/clients/${clientId}/integrations/${intId}/test`, { method: 'POST' });
    alert(result.success ? `Connected: ${result.message}` : `Failed: ${result.message}`);
    loadClientIntegrations(clientId);
  } catch (e) {
    alert('Test failed: network error');
  }
}

async function removeIntegration(clientId, intId) {
  if (!confirm('Remove this integration?')) return;
  try {
    await fetchJSON(`/api/internal/clients/${clientId}/integrations/${intId}`, { method: 'DELETE' });
    loadClientIntegrations(clientId);
  } catch (e) {
    alert('Failed to remove');
  }
}

function connectOAuth(platform, clientId) {
  const url = `/api/internal/oauth/${platform}/authorize?client_id=${clientId}&internal_key=${INTERNAL_KEY}`;
  window.open(url, '_blank', 'width=600,height=700');
}

function closeEditModal() {
  document.getElementById('editModal').style.display = 'none';
  editingClientId = null;
}

async function saveClient(e) {
  e.preventDefault();
  const id = document.getElementById('editId').value;
  const body = {
    name: document.getElementById('editName').value.trim(),
    assistant_name: document.getElementById('editAssistantName').value.trim() || 'Sophia',
    contact_name: document.getElementById('editContactName').value.trim(),
    contact_email: document.getElementById('editContactEmail').value.trim(),
    contact_phone: document.getElementById('editContactPhone').value.trim(),
    crm_webhook_url: document.getElementById('editCrmWebhook').value.trim() || null,
    booking_webhook_url: document.getElementById('editBookingWebhook').value.trim() || null,
    google_review_link: document.getElementById('editGoogleReview').value.trim() || null,
    review_delay_minutes: parseInt(document.getElementById('editReviewDelay').value) || 60,
    followup_inactive_days: parseInt(document.getElementById('editFollowupDays').value) || 60,
    status: document.querySelector('#editModal select#editStatus').value,
    followup_enabled: parseInt(document.getElementById('editFollowupEnabled').value)
  };

  try {
    await fetchJSON(`/api/internal/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
    closeEditModal();
    loadClients();
  } catch (e) {
    alert('Failed to save');
  }
}

// ═══ HELPERS ═══
function copyDashLink(id, key) {
  const url = `${window.location.origin}/admin/?key=${key}`;
  navigator.clipboard.writeText(url).then(() => alert('Dashboard link copied!'));
}

function togglePanel(id) {
  const el = document.getElementById(id);
  el.classList.toggle('collapsed');
}

function esc(str) {
  if (!str) return '';
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
  loadOverview();
  loadClients();
}

loadPlatforms();
refreshAll();
setInterval(refreshAll, 30000);
