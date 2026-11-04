const { test } = require('node:test');
const assert = require('node:assert/strict');

let docs;
test.before(async () => {
  docs = await import('../src/lib/documents.js');
});

const file = (type, size = 1000) => ({ type, size, name: 'f' });

test('required document list matches the API (3 required, 2 optional)', () => {
  assert.deepEqual(docs.DOCUMENT_FIELDS.filter((d) => d.required).map((d) => d.key), ['bmdcCertificate', 'medicalDegree', 'nationalId']);
  assert.equal(docs.DOCUMENT_FIELDS.length, 5);
});

test('missingRequiredDocuments lists exactly what is absent', () => {
  assert.equal(docs.missingRequiredDocuments({}).length, 3);
  assert.deepEqual(docs.missingRequiredDocuments({ bmdcCertificate: 1, nationalId: 1 }), ['Medical degree certificate (MBBS / postgraduate)']);
  assert.deepEqual(docs.missingRequiredDocuments({ bmdcCertificate: 1, medicalDegree: 1, nationalId: 1 }), []);
});

test('validateDocumentFile accepts PDF/JPG/PNG up to 5 MB only', () => {
  assert.equal(docs.validateDocumentFile(file('application/pdf')), '');
  assert.equal(docs.validateDocumentFile(file('image/png')), '');
  assert.match(docs.validateDocumentFile(file('text/plain')), /PDF, JPG or PNG/);
  assert.match(docs.validateDocumentFile(file('application/pdf', 6 * 1024 * 1024)), /5 MB/);
  assert.equal(docs.validateDocumentFile(null), '');
});

test('formatBytes and labelForDocument', () => {
  assert.equal(docs.formatBytes(512), '512 B');
  assert.equal(docs.formatBytes(2048), '2 KB');
  assert.equal(docs.formatBytes(3 * 1024 * 1024), '3.0 MB');
  assert.equal(docs.labelForDocument('nationalId'), 'National ID or passport');
  assert.equal(docs.labelForDocument('unknown'), 'unknown');
});
