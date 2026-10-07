const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const { connectTestDb, disconnectTestDb, clearUsers, approveDoctor } = require('./helpers/testDb');

before(async () => {
  await connectTestDb();
});

after(async () => {
  await clearUsers();
  await disconnectTestDb();
});

test('GET /api/doctors requires authentication', async () => {
  const res = await request(app).get('/api/doctors');
  assert.equal(res.status, 401);
});

test('GET /api/doctors returns directory payload', async () => {
  const reg = await request(app).post('/api/auth/register').send({
    fullName: 'Dr. Test',
    email: 'dir-doctor@test.com',
    password: 'password123',
    role: 'doctor',
    doctorProfile: {
      specialtyTitle: 'Cardiologist',
      specialtySlug: 'cardiology',
      affiliations: 'Square Hospital',
    },
  });
  await approveDoctor(reg.body.user.id);

  const patientReg = await request(app).post('/api/auth/register').send({
    fullName: 'Patient Dir',
    email: 'patient-dir@test.com',
    password: 'password123',
    role: 'patient',
  });
  const cookie = patientReg.headers['set-cookie'][0].split(';')[0];

  const res = await request(app).get('/api/doctors').set('Cookie', cookie);
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(Array.isArray(res.body.doctors));
  assert.equal(res.body.doctors.length, 1);
  assert.ok(res.body.meta.specialties.length >= 4);
});
