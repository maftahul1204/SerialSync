const crypto = require('crypto');
const env = require('../config/env');

const TOKEN_TTL_MS = 15 * 60 * 1000;

function signReportDownload(orderId, patientId) {
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = `${orderId}.${patientId}.${exp}`;
  const sig = crypto.createHmac('sha256', env.reportHmacSecret).update(payload).digest('hex');
  return Buffer.from(`${payload}.${sig}`).toString('base64url');
}

function verifyReportDownload(token, orderId, patientId) {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf8');
    const [oid, pid, expStr, sig] = raw.split('.');
    if (oid !== orderId || pid !== patientId) return false;
    const exp = Number(expStr);
    if (!exp || exp < Date.now()) return false;
    const payload = `${oid}.${pid}.${expStr}`;
    const expected = crypto.createHmac('sha256', env.reportHmacSecret).update(payload).digest('hex');
    if (sig.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

function hashFileBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

module.exports = { signReportDownload, verifyReportDownload, hashFileBuffer, TOKEN_TTL_MS };
