const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { connectTestDb, clearScheduleData, disconnectTestDb } = require('./helpers/testDb');
const { seedDoctorPatientChamber, bookFirstSlot } = require('./helpers/fixtures');

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
});

test('appointment QR payload for patient', async () => {
  const ctx = await seedDoctorPatientChamber(app);
  const { book } = await bookFirstSlot(app, ctx);
  const id = book.body.appointment.id;
  const qr = await request(app).get(`/api/appointments/${id}/qr`).set('Cookie', ctx.patientCookie);
  assert.equal(qr.status, 200);
  assert.ok(qr.body.qrDataUrl.startsWith('data:image/png'));
  assert.equal(qr.body.payload.serialNumber, 1);
});

test('appointment detail forbidden for other patient', async () => {
  const ctx = await seedDoctorPatientChamber(app);
  const { book } = await bookFirstSlot(app, ctx);
  const other = await request(app).post('/api/auth/register').send({
    fullName: 'Other Patient',
    email: `other-${Date.now()}@test.com`,
    password: 'password123',
    role: 'patient',
  });
  const otherCookie = other.headers['set-cookie'][0].split(';')[0];
  const res = await request(app)
    .get(`/api/appointments/${book.body.appointment.id}`)
    .set('Cookie', otherCookie);
  assert.equal(res.status, 403);
});
