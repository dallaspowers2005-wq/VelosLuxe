// Multi-Tenant Middleware

// Resolve client from admin_key (header or query param)
// Sets req.client with full client row
function resolveClient(getOne) {
  return (req, res, next) => {
    const key = req.headers['x-admin-key'] || req.query.key;
    if (!key) return res.status(401).json({ error: 'Missing admin key' });

    const client = getOne("SELECT * FROM clients WHERE admin_key = ? AND status = 'active'", [key]);
    if (!client) return res.status(401).json({ error: 'Invalid admin key or inactive client' });

    req.client = client;
    next();
  };
}

// Require internal team key for setup/management endpoints
function requireInternal(req, res, next) {
  const key = req.headers['x-internal-key'] || req.query.internal_key;
  if (!process.env.INTERNAL_KEY) {
    console.warn('WARNING: INTERNAL_KEY not set — internal routes unprotected');
    return next();
  }
  if (key !== process.env.INTERNAL_KEY) {
    return res.status(401).json({ error: 'Unauthorized — invalid internal key' });
  }
  next();
}

module.exports = { resolveClient, requireInternal };
