const env = require('./env');

/**
 * Allowed browser origins. CLIENT_URL may hold a comma-separated list. Outside production the
 * localhost / 127.0.0.1 twin of every origin is allowed too, because opening the app via
 * 127.0.0.1 instead of localhost is a common cause of "Failed to fetch".
 */
function buildAllowedOrigins(clientUrl = env.clientUrl, nodeEnv = env.nodeEnv) {
  const list = String(clientUrl || '')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
  const out = new Set(list);
  if (nodeEnv !== 'production') {
    for (const o of list) {
      if (o.includes('//localhost')) out.add(o.replace('//localhost', '//127.0.0.1'));
      if (o.includes('//127.0.0.1')) out.add(o.replace('//127.0.0.1', '//localhost'));
    }
  }
  return out;
}

const allowedOrigins = buildAllowedOrigins();

function originCheck(origin, callback) {
  // No Origin header (curl, server-to-server, same-origin) is always fine.
  if (!origin || allowedOrigins.has(origin)) return callback(null, true);
  return callback(null, false);
}

module.exports = { buildAllowedOrigins, allowedOrigins, originCheck };
