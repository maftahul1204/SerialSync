/**
 * Fail-path ("negative") API tests.
 * Every case sends an invalid, unauthorised or conflicting request and asserts that the API
 * rejects it with the documented 4xx status and { success: false }.
 * IDs (FT-*) are referenced from the API & Testing Documentation (SRS Chapter 6).
 */
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { registerDoctor } = require('./helpers/doctorDocs');
const {
  connectTestDb,
  clearScheduleData,
  disconnectTestDb,
  seedDiagnosticTests,
} = require('./helpers/testDb');
const { authCookie, seedDoctorPatientChamber, bookFirstSlot } = require('./helpers/fixtures');
const { DiagnosticTest } = require('../src/models/DiagnosticTest');

let app;
const MISSING_ID = '64f1a2b3c4d5e6f7a8b9c0d1';
let seq = 0;

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

async function register(role = 'patient', extra = {}) {
  seq += 1;
  const fields = { fullName: `FT ${role} ${seq}`, email: `ft-${role}-${seq}-${Date.now()}@test.com`, role, ...extra };
  const res =
    role === 'doctor'
      ? await registerDoctor(app, fields)
      : await request(app).post('/api/auth/register').send({ password: 'password123', ...fields });
  assert.equal(res.status, 201, `register ${role} failed: ${JSON.stringify(res.body)}`);
  return { res, cookie: authCookie(res), id: res.body.user.id };
}
function rejected(res, status) {
  assert.equal(res.status, status, JSON.stringify(res.body));
  assert.equal(res.body.success, false);
}

/* ---------- Module 1: Authentication & users ---------- */
test('FT-AUTH-01: register with an already used email -> 409', async () => {
  const email = 'dup@test.com';
  const body = { fullName: 'A B', email, password: 'password123' };
  await request(app).post('/api/auth/register').send(body);
  rejected(await request(app).post('/api/auth/register').send(body), 409);
});
test('FT-AUTH-02: register with malformed email -> 400', async () => {
  rejected(
    await request(app).post('/api/auth/register').send({ fullName: 'A B', email: 'not-an-email', password: 'password123' }),
    400
  );
});
test('FT-AUTH-03: register without full name -> 400', async () => {
  rejected(await request(app).post('/api/auth/register').send({ email: 'x@test.com', password: 'password123' }), 400);
});
test('FT-AUTH-04: login with wrong password -> 401', async () => {
  await request(app).post('/api/auth/register').send({ fullName: 'A B', email: 'wp@test.com', password: 'password123' });
  rejected(await request(app).post('/api/auth/login').send({ email: 'wp@test.com', password: 'wrongpass99' }), 401);
});
test('FT-AUTH-05: login with unknown account -> 401', async () => {
  rejected(await request(app).post('/api/auth/login').send({ email: 'nobody@test.com', password: 'password123' }), 401);
});
test('FT-AUTH-06: GET /api/auth/me without session cookie -> 401', async () => {
  rejected(await request(app).get('/api/auth/me'), 401);
});
test('FT-AUTH-07: GET /api/auth/me with tampered token -> 401', async () => {
  rejected(await request(app).get('/api/auth/me').set('Cookie', 'serialsync_token=invalid.jwt.token'), 401);
});
test('FT-AUTH-08: reset password with invalid token -> 400', async () => {
  rejected(await request(app).post('/api/auth/reset-password').send({ token: 'bad-token', password: 'newpassword123' }), 400);
});
test('FT-AUTH-09: change password with wrong current password -> 4xx', async () => {
  const { cookie } = await register('patient');
  const res = await request(app)
    .post('/api/auth/change-password')
    .set('Cookie', cookie)
    .send({ currentPassword: 'totallywrong1', newPassword: 'newpassword123' });
  assert.ok([400, 401].includes(res.status), String(res.status));
  assert.equal(res.body.success, false);
});
test('FT-USER-01: GET /api/users/me without session -> 401', async () => {
  rejected(await request(app).get('/api/users/me'), 401);
});

/* ---------- Module 2: doctors, chambers, schedules ---------- */
test('FT-DOC-01: doctor directory without session -> 401', async () => {
  rejected(await request(app).get('/api/doctors'), 401);
});
test('FT-CHAM-01: patient cannot create a chamber -> 403', async () => {
  const { cookie } = await register('patient');
  rejected(await request(app).post('/api/chambers').set('Cookie', cookie).send({ name: 'X', area: 'Y' }), 403);
});
test('FT-CHAM-02: unapproved doctor cannot create a chamber -> 403', async () => {
  const { cookie } = await register('doctor');
  const res = await request(app).post('/api/chambers').set('Cookie', cookie).send({ name: 'X', area: 'Y' });
  rejected(res, 403);
  assert.equal(res.body.code, 'DOCTOR_PENDING');
});
test('FT-SCHED-01: schedule with end time before start time -> 400', async () => {
  const f = await seedDoctorPatientChamber(app);
  const res = await request(app).post('/api/schedules').set('Cookie', f.doctorCookie).send({
    chamberId: f.chamberId, daysOfWeek: [2], startTime: '15:00', endTime: '10:00',
    consultationFee: 500, patientsPerSlot: 1, slotDurationMinutes: 30,
  });
  rejected(res, 400);
});
test('FT-SCHED-02: patient cannot publish a schedule -> 403', async () => {
  const f = await seedDoctorPatientChamber(app);
  const res = await request(app).post('/api/schedules').set('Cookie', f.patientCookie).send({
    chamberId: f.chamberId, daysOfWeek: [2], startTime: '10:00', endTime: '12:00',
    consultationFee: 500, patientsPerSlot: 1, slotDurationMinutes: 30,
  });
  rejected(res, 403);
});
test('FT-SCHED-03: overlapping schedule on the same chamber/day -> 409', async () => {
  const f = await seedDoctorPatientChamber(app);
  const res = await request(app).post('/api/schedules').set('Cookie', f.doctorCookie).send({
    chamberId: f.chamberId, daysOfWeek: [1], startTime: '10:00', endTime: '11:00',
    consultationFee: 500, patientsPerSlot: 1, slotDurationMinutes: 30,
  });
  rejected(res, 409);
});
test('FT-SCHED-04: schedule for an unknown chamber -> 4xx', async () => {
  const f = await seedDoctorPatientChamber(app);
  const res = await request(app).post('/api/schedules').set('Cookie', f.doctorCookie).send({
    chamberId: MISSING_ID, daysOfWeek: [3], startTime: '10:00', endTime: '12:00',
    consultationFee: 500, patientsPerSlot: 1, slotDurationMinutes: 30,
  });
  assert.ok([400, 404].includes(res.status), String(res.status));
  assert.equal(res.body.success, false);
});

/* ---------- Module 3: booking & appointments ---------- */
test('FT-BOOK-01: booking without session -> 401', async () => {
  rejected(await request(app).post('/api/schedules/slots/book').send({}), 401);
});
test('FT-BOOK-02: booking with missing fields -> 400', async () => {
  const f = await seedDoctorPatientChamber(app);
  rejected(await request(app).post('/api/schedules/slots/book').set('Cookie', f.patientCookie).send({}), 400);
});
test('FT-BOOK-03: booking an already taken slot -> 409', async () => {
  const f = await seedDoctorPatientChamber(app);
  const first = await bookFirstSlot(app, f);
  assert.equal(first.book.status, 201);
  const other = await register('patient');
  const res = await request(app)
    .post('/api/schedules/slots/book')
    .set('Cookie', other.cookie)
    .send({ scheduleId: first.slot.scheduleId, date: f.bookingDate, slotStart: first.slot.slotStart });
  rejected(res, 409);
});
test('FT-BOOK-04: doctor cannot book a patient slot -> 403', async () => {
  const f = await seedDoctorPatientChamber(app);
  const slots = await request(app)
    .get(`/api/schedules/doctors/${f.doctorId}/slots?from=${f.bookingDate}&to=${f.bookingDate}`)
    .set('Cookie', f.doctorCookie);
  const slot = slots.body.slots[0];
  const res = await request(app)
    .post('/api/schedules/slots/book')
    .set('Cookie', f.doctorCookie)
    .send({ scheduleId: slot.scheduleId, date: f.bookingDate, slotStart: slot.slotStart });
  rejected(res, 403);
});
test('FT-APPT-01: another patient cannot read my appointment -> 403/404', async () => {
  const f = await seedDoctorPatientChamber(app);
  const { book } = await bookFirstSlot(app, f);
  const id = (book.body.appointment || book.body.booking).id;
  const intruder = await register('patient');
  const res = await request(app).get(`/api/appointments/${id}`).set('Cookie', intruder.cookie);
  assert.ok([403, 404].includes(res.status), String(res.status));
  assert.equal(res.body.success, false);
});
test('FT-APPT-02: patient cannot change appointment status -> 403', async () => {
  const f = await seedDoctorPatientChamber(app);
  const { book } = await bookFirstSlot(app, f);
  const id = (book.body.appointment || book.body.booking).id;
  rejected(
    await request(app).patch(`/api/appointments/${id}/status`).set('Cookie', f.patientCookie).send({ status: 'completed' }),
    403
  );
});
test('FT-APPT-03: doctor cannot list "my appointments" as a patient -> 403', async () => {
  const f = await seedDoctorPatientChamber(app);
  rejected(await request(app).get('/api/appointments/me').set('Cookie', f.doctorCookie), 403);
});

/* ---------- Module 4: queue ---------- */
test('FT-QUEUE-01: queue advance without session -> 401', async () => {
  rejected(await request(app).post(`/api/queue/sessions/${MISSING_ID}/advance`), 401);
});
test('FT-QUEUE-02: patient cannot advance the queue -> 403', async () => {
  const { cookie } = await register('patient');
  rejected(await request(app).post(`/api/queue/sessions/${MISSING_ID}/advance`).set('Cookie', cookie), 403);
});
test('FT-QUEUE-03: assistant advances an unknown session -> 404', async () => {
  const { cookie } = await register('assistant');
  rejected(await request(app).post(`/api/queue/sessions/${MISSING_ID}/advance`).set('Cookie', cookie), 404);
});
test('FT-QUEUE-05: malformed session id -> 400', async () => {
  const { cookie } = await register('assistant');
  rejected(await request(app).post('/api/queue/sessions/not-an-id/advance').set('Cookie', cookie), 400);
});
test('FT-QUEUE-04: doctor cannot insert an emergency walk-in -> 403', async () => {
  const { cookie } = await register('doctor');
  rejected(await request(app).post(`/api/queue/sessions/${MISSING_ID}/walk-in`).set('Cookie', cookie).send({}), 403);
});

/* ---------- Module 5: diagnostics ---------- */
test('FT-DIAG-01: doctor cannot order a home collection -> 403', async () => {
  const { cookie } = await register('doctor');
  rejected(await request(app).post('/api/diagnostics/orders').set('Cookie', cookie).send({}), 403);
});
test('FT-DIAG-02: order without required address/phone/date/slot -> 400', async () => {
  const { cookie } = await register('patient');
  rejected(await request(app).post('/api/diagnostics/orders').set('Cookie', cookie).send({ testIds: [] }), 400);
});
test('FT-DIAG-03: order without any test selected -> 400', async () => {
  const { cookie } = await register('patient');
  const res = await request(app).post('/api/diagnostics/orders').set('Cookie', cookie).send({
    testIds: [], address: 'House 1', contactPhone: '01700000000', preferredDate: '2026-10-10', timeSlot: '09:00-11:00',
  });
  rejected(res, 400);
});
test('FT-DIAG-04: order with unknown package -> 400', async () => {
  const { cookie } = await register('patient');
  const res = await request(app).post('/api/diagnostics/orders').set('Cookie', cookie).send({
    packageId: 'pkg-nope', address: 'House 1', contactPhone: '01700000000', preferredDate: '2026-10-10', timeSlot: '09:00-11:00',
  });
  rejected(res, 400);
});
test('FT-DIAG-05: another patient cannot read or download my order/report -> 403/404', async () => {
  const owner = await register('patient');
  const cbc = await DiagnosticTest.findOne({ code: 'CBC' });
  const created = await request(app).post('/api/diagnostics/orders').set('Cookie', owner.cookie).send({
    testIds: [cbc._id.toString()], address: 'House 1', contactPhone: '01700000000', preferredDate: '2026-10-10', timeSlot: '09:00-11:00',
  });
  const id = created.body.order.id || created.body.order._id;
  const intruder = await register('patient');
  for (const path of [`/api/diagnostics/orders/${id}`, `/api/diagnostics/orders/${id}/download`]) {
    const res = await request(app).get(path).set('Cookie', intruder.cookie);
    assert.ok([403, 404].includes(res.status), `${path} -> ${res.status}`);
  }
});
test('FT-DIAG-06: patient cannot upload a lab report -> 403', async () => {
  const { cookie } = await register('patient');
  rejected(await request(app).post(`/api/diagnostics/orders/${MISSING_ID}/report`).set('Cookie', cookie), 403);
});
test('FT-DIAG-07: patient cannot update collection status -> 403', async () => {
  const { cookie } = await register('patient');
  rejected(
    await request(app).patch(`/api/diagnostics/orders/${MISSING_ID}/status`).set('Cookie', cookie).send({ status: 'collected' }),
    403
  );
});

/* ---------- Module 6: administration ---------- */
test('FT-ADMIN-01: patient cannot list doctors for moderation -> 403', async () => {
  const { cookie } = await register('patient');
  rejected(await request(app).get('/api/admin/doctors').set('Cookie', cookie), 403);
});
test('FT-ADMIN-02: approval with an invalid status value -> 400', async () => {
  const admin = await register('admin');
  const doctor = await register('doctor');
  rejected(
    await request(app).patch(`/api/admin/doctors/${doctor.id}/approval`).set('Cookie', admin.cookie).send({ status: 'maybe' }),
    400
  );
});
test('FT-ADMIN-03: approval of an unknown doctor -> 404', async () => {
  const admin = await register('admin');
  rejected(
    await request(app).patch(`/api/admin/doctors/${MISSING_ID}/approval`).set('Cookie', admin.cookie).send({ status: 'approved' }),
    404
  );
});
