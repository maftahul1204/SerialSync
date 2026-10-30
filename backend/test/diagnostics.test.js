const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const {
  connectTestDb,
  clearScheduleData,
  disconnectTestDb,
  seedDiagnosticTests,
} = require('./helpers/testDb');
const { authCookie } = require('./helpers/fixtures');
const { DiagnosticTest } = require('../src/models/DiagnosticTest');

let app;

before(async () => {
  await connectTestDb();
  app = require('../src/app');
});

after(async () => {
  await disconnectTestDb();
});

beforeEach(async () => {
  await clearScheduleData();
  await seedDiagnosticTests();
});

async function registerPatient() {
  const res = await request(app).post('/api/auth/register').send({
    fullName: 'Diag Patient',
    email: `diag-patient-${Date.now()}@test.com`,
    password: 'password123',
    role: 'patient',
  });
  return authCookie(res);
}

test('list diagnostic tests catalog', async () => {
  const cookie = await registerPatient();
  const res = await request(app).get('/api/diagnostics/tests').set('Cookie', cookie);
  assert.equal(res.status, 200);
  assert.ok(res.body.tests.length >= 3);
});

test('patient creates home collection order', async () => {
  const cookie = await registerPatient();
  const cbc = await DiagnosticTest.findOne({ code: 'CBC' });
  const res = await request(app)
    .post('/api/diagnostics/orders')
    .set('Cookie', cookie)
    .send({
      testIds: [cbc._id.toString()],
      address: 'House 12, Dhanmondi',
      contactPhone: '01700000001',
      preferredDate: '2026-10-10',
      timeSlot: '09:00-11:00',
    });
  assert.equal(res.status, 201);
  assert.equal(res.body.order.status, 'pending_dispatch');
  assert.ok(res.body.order.totalAmount >= 450);
});

test('patient lists own diagnostic orders', async () => {
  const cookie = await registerPatient();
  const cbc = await DiagnosticTest.findOne({ code: 'CBC' });
  await request(app)
    .post('/api/diagnostics/orders')
    .set('Cookie', cookie)
    .send({
      testIds: [cbc._id.toString()],
      address: 'House 12',
      contactPhone: '01700000002',
      preferredDate: '2026-10-11',
      timeSlot: '11:00-13:00',
    });
  const list = await request(app).get('/api/diagnostics/orders/me').set('Cookie', cookie);
  assert.equal(list.status, 200);
  assert.equal(list.body.orders.length, 1);
});

test('diagnostics packages endpoint', async () => {
  const cookie = await registerPatient();
  const res = await request(app).get('/api/diagnostics/packages').set('Cookie', cookie);
  assert.equal(res.status, 200);
  assert.ok(res.body.packages.length >= 2);
});
