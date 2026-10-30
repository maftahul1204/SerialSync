const request = require('supertest');

const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');
// 1x1 transparent PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);
const REQUIRED = ['bmdcCertificate', 'medicalDegree', 'nationalId'];

/** Register a doctor the way the signup form does: multipart fields + verification documents. */
function registerDoctor(app, fields = {}, { types = REQUIRED, bmdcNumber = 'A-12345' } = {}) {
  const req = request(app).post('/api/auth/register');
  const all = { password: 'password123', role: 'doctor', bmdcNumber, ...fields };
  for (const [k, v] of Object.entries(all)) {
    if (v !== undefined && v !== null) req.field(k, String(v));
  }
  for (const type of types) {
    req.attach(type, type === 'nationalId' ? PNG : PDF, {
      filename: type === 'nationalId' ? `${type}.png` : `${type}.pdf`,
      contentType: type === 'nationalId' ? 'image/png' : 'application/pdf',
    });
  }
  return req;
}

module.exports = { registerDoctor, PDF, PNG, REQUIRED };
