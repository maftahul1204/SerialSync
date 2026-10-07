const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { connectTestDb, clearScheduleData, disconnectTestDb, approveDoctor } = require('./helpers/testDb');
const { COOKIE_NAME } = require('../src/utils/jwt');

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

function authCookie(res) {
  const setCookie = res.headers['set-cookie'];
  const line = setCookie.find((c) => c.startsWith(`${COOKIE_NAME}=`));
  return line.split(';')[0];
}

async function registerAdmin() {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      fullName: 'Admin User',
      email: 'admin-approval@test.com',
      password: 'password123',
      role: 'admin',
    });
  return authCookie(res);
}

test('pending doctors are hidden from directory until approved', async () => {
  const reg = await request(app).post('/api/auth/register').send({
    fullName: 'Dr Pending',
    email: 'pending-doc@test.com',
    password: 'password123',
    role: 'doctor',
  });
  assert.equal(reg.body.user.doctorApprovalStatus, 'pending');

  const patientReg = await request(app).post('/api/auth/register').send({
    fullName: 'Patient',
    email: 'patient-list@test.com',
    password: 'password123',
    role: 'patient',
  });
  const patientCookie = patientReg.headers['set-cookie'][0].split(';')[0];

  let list = await request(app).get('/api/doctors').set('Cookie', patientCookie);
  assert.equal(list.body.doctors.length, 0);

  const adminCookie = await registerAdmin();
  const approve = await request(app)
    .patch(`/api/admin/doctors/${reg.body.user.id}/approval`)
    .set('Cookie', adminCookie)
    .send({ status: 'approved' });
  assert.equal(approve.status, 200);

  list = await request(app).get('/api/doctors').set('Cookie', patientCookie);
  assert.equal(list.body.doctors.length, 1);
});

test('pending doctor cannot create chambers', async () => {
  const reg = await request(app).post('/api/auth/register').send({
    fullName: 'Dr Blocked',
    email: 'blocked-doc@test.com',
    password: 'password123',
    role: 'doctor',
  });
  const cookie = authCookie(reg);
  const res = await request(app)
    .post('/api/chambers')
    .set('Cookie', cookie)
    .send({ name: 'Test Chamber' });
  assert.equal(res.status, 403);
  assert.equal(res.body.code, 'DOCTOR_PENDING');
});

test('admin lists pending doctors and can reject', async () => {
  await request(app).post('/api/auth/register').send({
    fullName: 'Dr Review',
    email: 'review-doc@test.com',
    password: 'password123',
    role: 'doctor',
  });
  const adminCookie = await registerAdmin();
  const list = await request(app).get('/api/admin/doctors?status=pending').set('Cookie', adminCookie);
  assert.equal(list.status, 200);
  assert.ok(list.body.counts.pending >= 1);
  const doctorId = list.body.doctors[0].id;
  const reject = await request(app)
    .patch(`/api/admin/doctors/${doctorId}/approval`)
    .set('Cookie', adminCookie)
    .send({ status: 'rejected' });
  assert.equal(reject.status, 200);
  assert.equal(reject.body.doctor.doctorApprovalStatus, 'rejected');
});
