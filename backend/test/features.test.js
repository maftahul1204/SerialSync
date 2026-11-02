/**
 * Tests for notifications/SMS, family care, doctor day summary, report results + trends,
 * admin catalogue + audit log, pagination and platform hardening.
 * PT-* are pass-path checks; FT-* are fail-path checks (see SRS Chapter 6).
 */
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
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
const { Notification } = require('../src/models/Notification');
const { AuditLog } = require('../src/models/AuditLog');
const { sentMessages } = require('../src/services/smsService');
const { makeLimiter } = require('../src/middleware/rateLimit');

let app;
let seq = 0;
const MISSING_ID = '64f1a2b3c4d5e6f7a8b9c0d1';
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');

before(async () => {
  await connectTestDb();
  app = require('../src/app');
});
after(async () => {
  await disconnectTestDb();
});
beforeEach(async () => {
  await clearScheduleData();
  await Notification.deleteMany({});
  await AuditLog.deleteMany({});
  await seedDiagnosticTests();
  sentMessages.length = 0;
});

async function register(role = 'patient', extra = {}) {
  seq += 1;
  const fields = { fullName: `F ${role} ${seq}`, email: `feat-${role}-${seq}-${Date.now()}@test.com`, role, ...extra };
  const res =
    role === 'doctor'
      ? await registerDoctor(app, fields)
      : await request(app).post('/api/auth/register').send({ password: 'password123', ...fields });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return { cookie: authCookie(res), id: res.body.user.id };
}
function rejected(res, status) {
  assert.equal(res.status, status, JSON.stringify(res.body));
  assert.equal(res.body.success, false);
}
async function orderFor(cookie) {
  const cbc = await DiagnosticTest.findOne({ code: 'CBC' });
  const res = await request(app).post('/api/diagnostics/orders').set('Cookie', cookie).send({
    testIds: [cbc._id.toString()], address: 'House 1', contactPhone: '01700000000',
    preferredDate: '2026-10-10', timeSlot: '09:00-11:00',
  });
  assert.equal(res.status, 201);
  return res.body.order.id;
}
function upload(orderId, cookie, { results, name = 'report.pdf', type = 'application/pdf' } = {}) {
  const r = request(app).post(`/api/diagnostics/orders/${orderId}/report`).set('Cookie', cookie);
  if (results !== undefined) r.field('results', typeof results === 'string' ? results : JSON.stringify(results));
  return r.attach('report', PDF, { filename: name, contentType: type });
}

/* ---------------- notifications + SMS (FR-05, FR-13) ---------------- */
test('PT-29: booking creates an in-app notification and an SMS', async () => {
  const f = await seedDoctorPatientChamber(app);
  await request(app).patch('/api/users/me').set('Cookie', f.patientCookie).send({ phone: '01711111111' });
  const { book } = await bookFirstSlot(app, f);
  assert.equal(book.status, 201);
  const list = await request(app).get('/api/notifications').set('Cookie', f.patientCookie);
  assert.equal(list.status, 200);
  assert.ok(list.body.unread >= 1);
  assert.equal(list.body.notifications[0].type, 'booking_confirmed');
  assert.ok(sentMessages.some((m) => m.to === '01711111111'));
});
test('PT-30: mark one and all notifications read', async () => {
  const f = await seedDoctorPatientChamber(app);
  await bookFirstSlot(app, f);
  const list = await request(app).get('/api/notifications').set('Cookie', f.patientCookie);
  const id = list.body.notifications[0].id;
  const one = await request(app).patch(`/api/notifications/${id}/read`).set('Cookie', f.patientCookie);
  assert.equal(one.status, 200);
  assert.equal(one.body.notification.read, true);
  const all = await request(app).post('/api/notifications/read-all').set('Cookie', f.patientCookie);
  assert.equal(all.status, 200);
  const after = await request(app).get('/api/notifications?unread=true').set('Cookie', f.patientCookie);
  assert.equal(after.body.unread, 0);
});
test('FT-NOTIF-01: notifications without session -> 401', async () => {
  rejected(await request(app).get('/api/notifications'), 401);
});
test('FT-NOTIF-02: mark read with malformed id -> 400', async () => {
  const { cookie } = await register();
  rejected(await request(app).patch('/api/notifications/not-an-id/read').set('Cookie', cookie), 400);
});
test('FT-NOTIF-03: cannot mark another user\'s notification -> 404', async () => {
  const f = await seedDoctorPatientChamber(app);
  await bookFirstSlot(app, f);
  const list = await request(app).get('/api/notifications').set('Cookie', f.patientCookie);
  const stranger = await register();
  rejected(
    await request(app).patch(`/api/notifications/${list.body.notifications[0].id}/read`).set('Cookie', stranger.cookie),
    404
  );
});

/* ---------------- family care ---------------- */
test('PT-31: family member CRUD and booking for a family member', async () => {
  const f = await seedDoctorPatientChamber(app);
  const created = await request(app).post('/api/family').set('Cookie', f.patientCookie)
    .send({ fullName: 'Rahima Begum', relation: 'parent', age: 62, gender: 'female' });
  assert.equal(created.status, 201);
  const id = created.body.member.id;
  const upd = await request(app).patch(`/api/family/${id}`).set('Cookie', f.patientCookie).send({ age: 63 });
  assert.equal(upd.body.member.age, 63);

  const slots = await request(app)
    .get(`/api/schedules/doctors/${f.doctorId}/slots?from=${f.bookingDate}&to=${f.bookingDate}`)
    .set('Cookie', f.patientCookie);
  const slot = slots.body.slots[0];
  const body = { scheduleId: slot.scheduleId, date: f.bookingDate, slotStart: slot.slotStart };
  const forFamily = await request(app).post('/api/schedules/slots/book').set('Cookie', f.patientCookie)
    .send({ ...body, familyMemberId: id });
  assert.equal(forFamily.status, 201);
  assert.equal(forFamily.body.appointment.bookedForName, 'Rahima Begum');
  assert.equal(forFamily.body.appointment.familyMemberId, id);
  // Same slot for the account holder is still allowed
  assert.equal((await request(app).post('/api/schedules/slots/book').set('Cookie', f.patientCookie).send(body)).status, 409);
  const del = await request(app).delete(`/api/family/${id}`).set('Cookie', f.patientCookie);
  assert.equal(del.status, 200);
  const list = await request(app).get('/api/family').set('Cookie', f.patientCookie);
  assert.equal(list.body.members.length, 0);
});
test('FT-FAM-01: doctor cannot use family care -> 403', async () => {
  const { cookie } = await register('doctor');
  rejected(await request(app).get('/api/family').set('Cookie', cookie), 403);
});
test('FT-FAM-02: invalid relation -> 400', async () => {
  const { cookie } = await register();
  rejected(await request(app).post('/api/family').set('Cookie', cookie).send({ fullName: 'X', relation: 'neighbour' }), 400);
});
test('FT-FAM-03: cannot edit another user\'s family member -> 404', async () => {
  const a = await register();
  const b = await register();
  const m = await request(app).post('/api/family').set('Cookie', a.cookie).send({ fullName: 'Kid', relation: 'child' });
  rejected(await request(app).patch(`/api/family/${m.body.member.id}`).set('Cookie', b.cookie).send({ age: 5 }), 404);
});
test('FT-FAM-04: booking for someone else\'s family member -> 404', async () => {
  const f = await seedDoctorPatientChamber(app);
  const other = await register();
  const m = await request(app).post('/api/family').set('Cookie', other.cookie).send({ fullName: 'Kid', relation: 'child' });
  const slots = await request(app)
    .get(`/api/schedules/doctors/${f.doctorId}/slots?from=${f.bookingDate}&to=${f.bookingDate}`)
    .set('Cookie', f.patientCookie);
  const slot = slots.body.slots[0];
  rejected(
    await request(app).post('/api/schedules/slots/book').set('Cookie', f.patientCookie)
      .send({ scheduleId: slot.scheduleId, date: f.bookingDate, slotStart: slot.slotStart, familyMemberId: m.body.member.id }),
    404
  );
});
test('FT-FAM-05: more than 10 family members -> 409', async () => {
  const { cookie } = await register();
  for (let i = 0; i < 10; i += 1) {
    const r = await request(app).post('/api/family').set('Cookie', cookie).send({ fullName: `M${i}`, relation: 'other' });
    assert.equal(r.status, 201);
  }
  rejected(await request(app).post('/api/family').set('Cookie', cookie).send({ fullName: 'M11', relation: 'other' }), 409);
});

/* ---------------- doctor day summary (FR-15) ---------------- */
test('PT-32: doctor end-of-day summary counts and fees', async () => {
  const f = await seedDoctorPatientChamber(app);
  const { book } = await bookFirstSlot(app, f);
  const id = book.body.appointment.id;
  const done = await request(app).patch(`/api/appointments/${id}/status`).set('Cookie', f.doctorCookie).send({ status: 'completed' });
  assert.equal(done.status, 200);
  const res = await request(app).get(`/api/appointments/doctor/summary?date=${f.bookingDate}`).set('Cookie', f.doctorCookie);
  assert.equal(res.status, 200);
  assert.equal(res.body.summary.totalBooked, 1);
  assert.equal(res.body.summary.completed, 1);
  assert.equal(res.body.summary.feesCollected, 1200);
  assert.equal(res.body.summary.completionRate, 100);
});
test('PT-33: appointment list is paginated', async () => {
  const f = await seedDoctorPatientChamber(app);
  await bookFirstSlot(app, f);
  const res = await request(app).get('/api/appointments/me?limit=1&page=1').set('Cookie', f.patientCookie);
  assert.equal(res.status, 200);
  assert.equal(res.body.pagination.limit, 1);
  assert.equal(res.body.pagination.total, 1);
});
test('FT-SUM-01: patient cannot read the doctor summary -> 403', async () => {
  const { cookie } = await register();
  rejected(await request(app).get('/api/appointments/doctor/summary?date=2026-10-05').set('Cookie', cookie), 403);
});
test('FT-SUM-02: summary without a valid date -> 400', async () => {
  const f = await seedDoctorPatientChamber(app);
  rejected(await request(app).get('/api/appointments/doctor/summary?date=yesterday').set('Cookie', f.doctorCookie), 400);
});

/* ---------------- report results, trends, catalogue, audit ---------------- */
test('PT-34: admin uploads report with results; flags, trends and notification follow', async () => {
  const patient = await register();
  const admin = await register('admin');
  const orderId = await orderFor(patient.cookie);
  const results = [
    { code: 'FBS', name: 'Fasting Blood Sugar', value: 7.9, unit: 'mmol/L', refLow: 3.9, refHigh: 5.6 },
    { code: 'CBC', name: 'Haemoglobin', value: 13.5, unit: 'g/dL', refLow: 12, refHigh: 16 },
  ];
  const up = await upload(orderId, admin.cookie, { results });
  assert.equal(up.status, 200, JSON.stringify(up.body));
  assert.equal(up.body.order.status, 'completed');
  assert.deepEqual(up.body.order.criticalFlags, ['Fasting Blood Sugar: high']);
  const trends = await request(app).get('/api/diagnostics/trends').set('Cookie', patient.cookie);
  assert.equal(trends.status, 200);
  assert.equal(trends.body.series.length, 2);
  const fbs = trends.body.series.find((s) => s.code === 'FBS');
  assert.equal(fbs.points[0].flag, 'high');
  const notes = await request(app).get('/api/notifications').set('Cookie', patient.cookie);
  assert.ok(notes.body.notifications.some((n) => n.type === 'report_ready'));
  const audit = await request(app).get('/api/admin/audit').set('Cookie', admin.cookie);
  assert.ok(audit.body.entries.some((e) => e.action === 'report.upload'));
});
test('PT-35: admin creates and updates a diagnostic test; audit log records it', async () => {
  const admin = await register('admin');
  const created = await request(app).post('/api/diagnostics/tests').set('Cookie', admin.cookie)
    .send({ code: 'TSH', name: 'Thyroid Stimulating Hormone', category: 'Hormones', price: 700 });
  assert.equal(created.status, 201);
  const upd = await request(app).patch(`/api/diagnostics/tests/${created.body.test.id}`).set('Cookie', admin.cookie).send({ price: 650 });
  assert.equal(upd.body.test.price, 650);
  const audit = await request(app).get('/api/admin/audit?action=test.update').set('Cookie', admin.cookie);
  assert.equal(audit.body.entries.length, 1);
});
test('PT-36: admin lists all diagnostic orders with pagination', async () => {
  const patient = await register();
  const admin = await register('admin');
  await orderFor(patient.cookie);
  const res = await request(app).get('/api/diagnostics/orders?limit=5').set('Cookie', admin.cookie);
  assert.equal(res.status, 200);
  assert.equal(res.body.pagination.total, 1);
});
test('PT-37: patient shares a report with a doctor and the doctor is notified', async () => {
  const f = await seedDoctorPatientChamber(app);
  const orderId = await orderFor(f.patientCookie);
  const res = await request(app).post(`/api/diagnostics/orders/${orderId}/share-doctor`).set('Cookie', f.patientCookie).send({ doctorId: f.doctorId });
  assert.equal(res.status, 200);
  const notes = await request(app).get('/api/notifications').set('Cookie', f.doctorCookie);
  assert.ok(notes.body.notifications.some((n) => /shared a lab report/.test(n.title)));
});
test('FT-DIAG-08: non-PDF report upload -> 400', async () => {
  const patient = await register();
  const admin = await register('admin');
  const orderId = await orderFor(patient.cookie);
  rejected(await upload(orderId, admin.cookie, { name: 'report.txt', type: 'text/plain' }), 400);
});
test('FT-DIAG-09: results that are not valid JSON -> 400', async () => {
  const patient = await register();
  const admin = await register('admin');
  const orderId = await orderFor(patient.cookie);
  rejected(await upload(orderId, admin.cookie, { results: '{not json' }), 400);
});
test('FT-DIAG-10: patient cannot create a catalogue test -> 403', async () => {
  const { cookie } = await register();
  rejected(await request(app).post('/api/diagnostics/tests').set('Cookie', cookie).send({ code: 'X1', name: 'X', category: 'Y', price: 1 }), 403);
});
test('FT-DIAG-11: duplicate catalogue code -> 409', async () => {
  const admin = await register('admin');
  rejected(await request(app).post('/api/diagnostics/tests').set('Cookie', admin.cookie).send({ code: 'CBC', name: 'Dup', category: 'Hematology', price: 100 }), 409);
});
test('FT-DIAG-12: negative price -> 400', async () => {
  const admin = await register('admin');
  rejected(await request(app).post('/api/diagnostics/tests').set('Cookie', admin.cookie).send({ code: 'NEG', name: 'Neg', category: 'X', price: -5 }), 400);
});
test('FT-DIAG-13: doctor cannot read patient trends -> 403', async () => {
  const { cookie } = await register('doctor');
  rejected(await request(app).get('/api/diagnostics/trends').set('Cookie', cookie), 403);
});
test('FT-DIAG-14: update an unknown catalogue test -> 404', async () => {
  const admin = await register('admin');
  rejected(await request(app).patch(`/api/diagnostics/tests/${MISSING_ID}`).set('Cookie', admin.cookie).send({ price: 10 }), 404);
});
test('FT-DIAG-15: share report with an unknown doctor -> 404', async () => {
  const patient = await register();
  const orderId = await orderFor(patient.cookie);
  rejected(await request(app).post(`/api/diagnostics/orders/${orderId}/share-doctor`).set('Cookie', patient.cookie).send({ doctorId: MISSING_ID }), 404);
});
test('FT-ADMIN-04: patient cannot read the audit log -> 403', async () => {
  const { cookie } = await register();
  rejected(await request(app).get('/api/admin/audit').set('Cookie', cookie), 403);
});
test('FT-ADMIN-05: orders list with invalid status filter -> 400', async () => {
  const admin = await register('admin');
  rejected(await request(app).get('/api/diagnostics/orders?status=bogus').set('Cookie', admin.cookie), 400);
});

/* ---------------- platform hardening ---------------- */
test('PT-38: readiness probe and security headers', async () => {
  const ready = await request(app).get('/api/ready');
  assert.equal(ready.status, 200);
  assert.equal(ready.body.database, 'up');
  assert.equal(ready.headers['x-content-type-options'], 'nosniff');
  assert.equal(ready.headers['x-powered-by'], undefined);
});
test('FT-RATE-01: limiter answers 429 after the allowed number of requests', async () => {
  const mini = express();
  mini.use(makeLimiter({ windowMs: 60_000, max: 3, force: true }));
  mini.get('/ping', (_req, res) => res.json({ success: true }));
  for (let i = 0; i < 3; i += 1) assert.equal((await request(mini).get('/ping')).status, 200);
  rejected(await request(mini).get('/ping'), 429);
});

/* ---------------- CORS (cause of "Failed to fetch" when the origin differs) ---------------- */
test('PT-39: API accepts localhost and 127.0.0.1 origins and echoes credentials', async () => {
  for (const origin of ['http://localhost:3000', 'http://127.0.0.1:3000']) {
    const res = await request(app).get('/api/health').set('Origin', origin);
    assert.equal(res.status, 200);
    assert.equal(res.headers['access-control-allow-origin'], origin);
    assert.equal(res.headers['access-control-allow-credentials'], 'true');
  }
});
test('FT-CORS-01: unknown origin gets no CORS headers', async () => {
  const res = await request(app).get('/api/health').set('Origin', 'https://evil.example');
  assert.equal(res.headers['access-control-allow-origin'], undefined);
});
