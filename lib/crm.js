// CRM Integration — routes through platform adapter, falls back to legacy webhook

const { getAdapter } = require('./integrations');

async function pushToCRM(client, getOne, leadData) {
  // Try platform adapter first
  if (getOne) {
    try {
      const integration = getOne(
        "SELECT * FROM client_integrations WHERE client_id = ? AND purpose IN ('crm', 'both') AND status = 'active' LIMIT 1",
        [client.id]
      );

      if (integration) {
        const adapter = getAdapter(integration.platform, integration);
        const result = await adapter.createContact({
          name: leadData.name,
          phone: leadData.phone,
          email: leadData.email,
          notes: leadData.notes || leadData.interest || null,
          type: leadData.type
        });

        if (result.success) {
          console.log(`[${client.slug}] CRM push via ${integration.platform}: ${result.message}`);
        } else {
          console.error(`[${client.slug}] CRM adapter error (${integration.platform}): ${result.message}`);
        }
        return;
      }
    } catch (err) {
      console.error(`[${client.slug}] CRM adapter lookup error:`, err.message);
    }
  }

  // Fallback: legacy webhook URL
  if (!client.crm_webhook_url) return;

  try {
    const payload = {
      source: 'velosluxe',
      client_name: client.name,
      client_slug: client.slug,
      timestamp: new Date().toISOString(),
      ...leadData
    };

    const res = await fetch(client.crm_webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      console.error(`CRM webhook failed for ${client.slug}: ${res.status} ${res.statusText}`);
    } else {
      console.log(`CRM webhook sent for ${client.slug}`);
    }
  } catch (err) {
    console.error(`CRM webhook error for ${client.slug}:`, err.message);
  }
}

module.exports = { pushToCRM };
