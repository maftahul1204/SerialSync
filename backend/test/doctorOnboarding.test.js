/**
 * Doctor signup documents, admin review details, and cancellation handling.
 * PT-* pass-path, FT-* fail-path (SRS Chapter 6).
 */
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { connectTestDb, clearScheduleData, disconnectTestDb, approveDoctor } = require('./helpers/testDb');
const { authCookie } = require('./helpers/fixtures');
const { registerDoctor, PDF, PNG } = require('./helpers/doctorDocs');
const { sentMessages } = require('../src/services/smsService');
const { Notification } = require('../src/models/Notification');
const { User } = require('../src/models/User');
const { SlotBooking } = require('../src/models/SlotBooking');
const env = require('../src/config/env');

let app;
let seq = 0;
const MISSING_ID = '64f1a2b3c4d5e6f7a8b9c0d1';

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
  sentMessages.length = 0;
});

const rejected = (res, status) => {
  assert.equal(res.status, status, JSON.stringify(res.body));
  assert.equal(res.body.success, false);
};
const uniq = () => `${Date.now()}-${(seq += 1)}`;

async function newDoctor(extra = {}, { approve = false } = {}) {
  const res = await registerDoctor(app, { fullName: `Dr ${uniq()}`, email: `d-${uniq()}@test.com`, ...extra });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  if (approve) await approveDoctor(res.body.user.id);
  return { res, id: res.body.user.id, cookie: authCookie(res), user: res.body.user };
}
async function newUser(role) {
  const res = await request(app).post('/api/auth/register').send({
    fullName: `${role} ${uniq()}`, email: `${role}-${uniq()}@test.com`, password: 'password123', role, phone: '01712345678',
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return { cookie: authCookie(res), id: res.body.user.id };
}

/* ---------------- doctor signup documents ---------------- */
test('PT-40: doctor registers with BMDC details and documents stored in the project folder', async () => {
  const { res, id } = await newDoctor({ degrees: 'MBBS, FCPS', experienceYears: 8, specialtySlug: 'cardiology' });
  assert.equal(res.body.user.doctorApprovalStatus, 'pending');
  assert.equal(res.body.user.doctorProfile.bmdcNumber, 'A-12345');
  assert.equal(res.body.user.doctorProfile.experienceYears, 8);
  assert.equal(res.body.user.documents.length, 3);
  assert.deepEqual(res.body.user.documents.map((d) => d.type).sort(), ['bmdcCertificate', 'medicalDegree', 'nationalId']);
  const dbUser = await User.findById(id);
  for (const d of dbUser.doctorDocuments) {
    assert.ok(fs.existsSync(path.join(env.doctorDocsDir, id, d.fileName)), 'stored on disk');
  }
});
test('PT-41: admin reads full doctor details with documents and the required-documents checklist', async () => {
  const doc = await newDoctor({ affiliations: 'Square Hospital', degrees: 'MBBS' });
  const admin = await newUser('admin');
  const res = await request(app).get(`/api/admin/doctors/${doc.id}`).set('Cookie', admin.cookie);
  assert.equal(res.status, 200);
  assert.equal(res.body.doctor.email, doc.user.email);
  assert.equal(res.body.doctor.doctorProfile.affiliations, 'Square Hospital');
  assert.equal(res.body.doctor.documents.length, 3);
  assert.ok(res.body.doctor.documents[0].url.startsWith(`/api/admin/doctors/${doc.id}/documents/`));
  assert.equal(res.body.requiredDocuments.every((r) => r.provided), true);
  assert.deepEqual(res.body.stats, { chambers: 0, schedules: 0 });
});
test('PT-42: admin opens an uploaded document (inline, correct content type)', async () => {
  const doc = await newDoctor();
  const admin = await newUser('admin');
  const details = await request(app).get(`/api/admin/doctors/${doc.id}`).set('Cookie', admin.cookie);
  const pdf = details.body.doctor.documents.find((d) => d.type === 'bmdcCertificate');
  const file = await request(app).get(pdf.url).set('Cookie', admin.cookie);
  assert.equal(file.status, 200);
  assert.equal(file.headers['content-type'], 'application/pdf');
  assert.match(file.headers['content-disposition'], /^inline/);
  assert.equal(file.headers['x-content-type-options'], 'nosniff');
});
test('PT-43: doctor views own document and re-uploads after rejection (back to pending)', async () => {
  const doc = await newDoctor();
  const admin = await newUser('admin');
  await request(app).patch(`/api/admin/doctors/${doc.id}/approval`).set('Cookie', admin.cookie)
    .send({ status: 'rejected', note: 'Degree certificate is blurry' });
  const me = await request(app).get('/api/users/me').set('Cookie', doc.cookie);
  const own = me.body.user.documents[0];
  assert.equal((await request(app).get(`/api/users/me/documents/${own.id}`).set('Cookie', doc.cookie)).status, 200);
  const re = await request(app).post('/api/users/me/documents').set('Cookie', doc.cookie)
    .attach('medicalDegree', PDF, { filename: 'degree-clear.pdf', contentType: 'application/pdf' });
  assert.equal(re.status, 200, JSON.stringify(re.body));
  assert.equal(re.body.resubmitted, true);
  assert.equal(re.body.user.doctorApprovalStatus, 'pending');
  assert.equal(re.body.user.documents.filter((d) => d.type === 'medicalDegree').length, 1);
  const notes = await request(app).get('/api/notifications').set('Cookie', admin.cookie);
  assert.ok(notes.body.notifications.some((n) => /resubmitted/i.test(n.title)));
});
test('PT-44: rejection reason is stored and the doctor is notified with it', async () => {
  const doc = await newDoctor();
  const admin = await newUser('admin');
  const r = await request(app).patch(`/api/admin/doctors/${doc.id}/approval`).set('Cookie', admin.cookie)
    .send({ status: 'rejected', note: 'BMDC number does not match the certificate' });
  assert.equal(r.status, 200);
  const me = await request(app).get('/api/users/me').set('Cookie', doc.cookie);
  assert.equal(me.body.user.doctorApprovalNote, 'BMDC number does not match the certificate');
  const notes = await request(app).get('/api/notifications').set('Cookie', doc.cookie);
  assert.ok(notes.body.notifications.some((n) => /BMDC number does not match/.test(n.body)));
});

test('FT-DOC-02: doctor signup without documents -> 400 and no account created', async () => {
  const email = `nodocs-${uniq()}@test.com`;
  const res = await registerDoctor(app, { fullName: 'No Docs', email }, { types: [] });
  rejected(res, 400);
  assert.equal(res.body.missingDocuments.length, 3);
  assert.equal(await User.countDocuments({ email }), 0);
});
test('FT-DOC-03: doctor signup missing one required document -> 400', async () => {
  const res = await registerDoctor(app, { fullName: 'Partial', email: `p-${uniq()}@test.com` }, { types: ['bmdcCertificate', 'nationalId'] });
  rejected(res, 400);
  assert.deepEqual(res.body.missingDocuments, ['medicalDegree']);
});
test('FT-DOC-04: unsupported file type -> 400', async () => {
  const req = registerDoctor(app, { fullName: 'Bad Type', email: `b-${uniq()}@test.com` }, { types: ['bmdcCertificate', 'nationalId'] });
  req.attach('medicalDegree', Buffer.from('just text'), { filename: 'degree.txt', contentType: 'text/plain' });
  rejected(await req, 400);
});
test('FT-DOC-05: file whose content does not match its type -> 400', async () => {
  const req = registerDoctor(app, { fullName: 'Fake Pdf', email: `f-${uniq()}@test.com` }, { types: ['bmdcCertificate', 'nationalId'] });
  req.attach('medicalDegree', Buffer.from('not really a pdf'), { filename: 'degree.pdf', contentType: 'application/pdf' });
  rejected(await req, 400);
});
test('FT-DOC-06: doctor signup without a BMDC number -> 400', async () => {
  const req = registerDoctor(app, { fullName: 'No Bmdc', email: `n-${uniq()}@test.com`, bmdcNumber: '' });
  rejected(await req, 400);
});
test('FT-DOC-07: document larger than 5 MB -> 413', async () => {
  const big = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(5 * 1024 * 1024 + 10, 1)]);
  const req = registerDoctor(app, { fullName: 'Big', email: `big-${uniq()}@test.com` }, { types: ['bmdcCertificate', 'nationalId'] });
  req.attach('medicalDegree', big, { filename: 'degree.pdf', contentType: 'application/pdf' });
  rejected(await req, 413);
});
test('FT-DOC-08: patient cannot read doctor details or documents -> 403', async () => {
  const doc = await newDoctor();
  const patient = await newUser('patient');
  rejected(await request(app).get(`/api/admin/doctors/${doc.id}`).set('Cookie', patient.cookie), 403);
  rejected(await request(app).get(`/api/admin/doctors/${doc.id}/documents/${MISSING_ID}`).set('Cookie', patient.cookie), 403);
});
test('FT-DOC-09: a doctor cannot open another doctor\'s documents -> 403', async () => {
  const a = await newDoctor();
  const b = await newDoctor();
  const details = await request(app).get('/api/users/me').set('Cookie', a.cookie);
  const id = details.body.user.documents[0].id;
  rejected(await request(app).get(`/api/admin/doctors/${a.id}/documents/${id}`).set('Cookie', b.cookie), 403);
  rejected(await request(app).get(`/api/users/me/documents/${id}`).set('Cookie', b.cookie), 404);
});
test('FT-DOC-10: unknown doctor / malformed ids on the admin detail routes', async () => {
  const admin = await newUser('admin');
  const doc = await newDoctor();
  rejected(await request(app).get(`/api/admin/doctors/${MISSING_ID}`).set('Cookie', admin.cookie), 404);
  rejected(await request(app).get('/api/admin/doctors/not-an-id').set('Cookie', admin.cookie), 400);
  rejected(await request(app).get(`/api/admin/doctors/${doc.id}/documents/not-an-id`).set('Cookie', admin.cookie), 400);
  rejected(await request(app).get(`/api/admin/doctors/${doc.id}/documents/${MISSING_ID}`).set('Cookie', admin.cookie), 404);
});
test('FT-DOC-11: patient cannot upload doctor documents -> 403', async () => {
  const patient = await newUser('patient');
  rejected(await request(app).post('/api/users/me/documents').set('Cookie', patient.cookie)
    .attach('nationalId', PNG, { filename: 'id.png', contentType: 'image/png' }), 403);
});
test('FT-ADMIN-06: rejecting a doctor without a reason -> 400', async () => {
  const doc = await newDoctor();
  const admin = await newUser('admin');
  rejected(await request(app).patch(`/api/admin/doctors/${doc.id}/approval`).set('Cookie', admin.cookie).send({ status: 'rejected' }), 400);
});
test('FT-ADMIN-07: approving a doctor who has no documents -> 409 DOCS_MISSING', async () => {
  const legacy = await User.create({
    fullName: 'Legacy Doctor', email: `legacy-${uniq()}@test.com`, passwordHash: await User.hashPassword('password123'),
    role: 'doctor', doctorApprovalStatus: 'pending',
  });
  const admin = await newUser('admin');
  const res = await request(app).patch(`/api/admin/doctors/${legacy._id}/approval`).set('Cookie', admin.cookie).send({ status: 'approved' });
  rejected(res, 409);
  assert.equal(res.body.code, 'DOCS_MISSING');
});

/* ---------------- cancellations ---------------- */
function nextWeekday(dow, minDaysAhead = 3) {
  const d = new Date();
  d.setDate(d.getDate() + minDaysAhead);
  while (d.getDay() !== dow) d.setDate(d.getDate() + 1);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function plusDays(ymd, n) {
  const [y, m, d] = ymd.split('-').map(Number);
  const x = new Date(y, m - 1, d + n);
  const p = (v) => String(v).padStart(2, '0');
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
}
const DOW = 2; // Tuesday

async function setup() {
  const doctor = await newDoctor({}, { approve: true });
  const chamber = await request(app).post('/api/chambers').set('Cookie', doctor.cookie).send({ name: `Ch ${uniq()}`, area: 'Dhanmondi' });
  const sched = await request(app).post('/api/schedules').set('Cookie', doctor.cookie).send({
    chamberId: chamber.body.chamber.id, daysOfWeek: [DOW], startTime: '09:00', endTime: '12:00',
    consultationFee: 800, patientsPerSlot: 1, slotDurationMinutes: 60,
  });
  assert.equal(sched.status, 201, JSON.stringify(sched.body));
  const date = nextWeekday(DOW);
  return { doctor, scheduleId: sched.body.schedule.id, date };
}
async function book(patient, s, slotStart = '09:00', date = s.date) {
  const res = await request(app).post('/api/schedules/slots/book').set('Cookie', patient.cookie)
    .send({ scheduleId: s.scheduleId, date, slotStart });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.appointment;
}
async function patientWithPhone() {
  const p = await newUser('patient');
  return p;
}
const notesOf = async (cookie) => (await request(app).get('/api/notifications').set('Cookie', cookie)).body.notifications;

test('PT-45: patient cancels - slot reopens for the next patient and the doctor is told', async () => {
  const s = await setup();
  const p1 = await patientWithPhone();
  const a = await book(p1, s);
  const c = await request(app).post(`/api/appointments/${a.id}/cancel`).set('Cookie', p1.cookie).send({ reason: 'Feeling better' });
  assert.equal(c.status, 200);
  assert.equal(c.body.appointment.cancelledBy, 'patient');
  assert.equal(c.body.appointment.cancelReason, 'Feeling better');
  assert.ok((await notesOf(s.doctor.cookie)).some((n) => /cancelled by the patient/.test(n.title)));
  const p2 = await patientWithPhone();
  assert.equal((await book(p2, s)).slotStart, '09:00'); // freed slot is bookable again
});
test('PT-46: doctor cancels one appointment - patient gets reason, SMS and the next available slot', async () => {
  const s = await setup();
  const p = await patientWithPhone();
  const a = await book(p, s);
  const r = await request(app).patch(`/api/appointments/${a.id}/status`).set('Cookie', s.doctor.cookie)
    .send({ status: 'cancelled', reason: 'Emergency surgery' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.appointment.cancelledBy, 'doctor');
  const note = (await notesOf(p.cookie)).find((n) => n.type === 'booking_cancelled' && /Emergency surgery/.test(n.body));
  assert.ok(note, 'patient notified with the reason');
  assert.match(note.body, /Next available: \d{4}-\d{2}-\d{2} 09:00/);
  assert.ok(note.link.startsWith('/doctors/'));
  assert.ok(sentMessages.some((m) => /Emergency surgery/.test(m.text)));
});
test('PT-47: doctor cancels a whole chamber day - everyone notified, date closed, then reopened', async () => {
  const s = await setup();
  const p1 = await patientWithPhone();
  const p2 = await patientWithPhone();
  await book(p1, s, '09:00');
  await book(p2, s, '10:00');
  const c = await request(app).post(`/api/schedules/${s.scheduleId}/cancel-day`).set('Cookie', s.doctor.cookie)
    .send({ date: s.date, reason: 'Medical conference' });
  assert.equal(c.status, 200, JSON.stringify(c.body));
  assert.equal(c.body.cancelledBookings, 2);
  for (const p of [p1, p2]) {
    const n = (await notesOf(p.cookie)).find((x) => x.type === 'booking_cancelled');
    assert.match(n.body, /Medical conference/);
    assert.match(n.body, new RegExp(`Next available: ${plusDays(s.date, 7)}`));
  }
  // no slots that day any more, and booking is refused politely
  const slots = await request(app).get(`/api/schedules/doctors/${s.doctor.id}/slots?from=${s.date}&to=${s.date}`).set('Cookie', p1.cookie);
  assert.equal(slots.body.slots.length, 0);
  const again = await request(app).post('/api/schedules/slots/book').set('Cookie', p1.cookie).send({ scheduleId: s.scheduleId, date: s.date, slotStart: '09:00' });
  rejected(again, 409);
  assert.equal(again.body.code, 'DOCTOR_UNAVAILABLE');
  const re = await request(app).delete(`/api/schedules/${s.scheduleId}/closed-dates/${s.date}`).set('Cookie', s.doctor.cookie);
  assert.equal(re.status, 200);
  const slots2 = await request(app).get(`/api/schedules/doctors/${s.doctor.id}/slots?from=${s.date}&to=${s.date}`).set('Cookie', p1.cookie);
  assert.ok(slots2.body.slots.length > 0);
});
test('PT-48: removing a schedule cancels and notifies its future bookings', async () => {
  const s = await setup();
  const p = await patientWithPhone();
  await book(p, s);
  const del = await request(app).delete(`/api/schedules/${s.scheduleId}`).set('Cookie', s.doctor.cookie);
  assert.equal(del.status, 200);
  assert.equal(del.body.cancelledBookings, 1);
  assert.ok((await notesOf(p.cookie)).some((n) => /removed this chamber schedule/.test(n.body)));
});
test('PT-49: pausing a schedule cancels its future bookings', async () => {
  const s = await setup();
  const p = await patientWithPhone();
  await book(p, s);
  const r = await request(app).patch(`/api/schedules/${s.scheduleId}/status`).set('Cookie', s.doctor.cookie).send({ status: 'inactive' });
  assert.equal(r.status, 200);
  assert.equal(r.body.cancelledBookings, 1);
});
test('PT-50: changing times cancels only bookings whose slot no longer exists', async () => {
  const s = await setup();
  const keep = await patientWithPhone();
  const lose = await patientWithPhone();
  await book(keep, s, '09:00');
  await book(lose, s, '11:00');
  const r = await request(app).patch(`/api/schedules/${s.scheduleId}`).set('Cookie', s.doctor.cookie).send({ endTime: '10:00' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.cancelledBookings, 1);
  const rows = await SlotBooking.find({ schedule: s.scheduleId });
  assert.equal(rows.find((b) => b.slotStart === '09:00').status, 'confirmed');
  assert.equal(rows.find((b) => b.slotStart === '11:00').status, 'cancelled');
});

test('FT-CANCEL-01: doctor cancels an appointment without a reason -> 400', async () => {
  const s = await setup();
  const p = await patientWithPhone();
  const a = await book(p, s);
  rejected(await request(app).patch(`/api/appointments/${a.id}/status`).set('Cookie', s.doctor.cookie).send({ status: 'cancelled' }), 400);
});
test('FT-CANCEL-02: patient cannot cancel someone else\'s appointment -> 403', async () => {
  const s = await setup();
  const owner = await patientWithPhone();
  const other = await patientWithPhone();
  const a = await book(owner, s);
  rejected(await request(app).post(`/api/appointments/${a.id}/cancel`).set('Cookie', other.cookie), 403);
});
test('FT-CANCEL-03: cancel-day without a reason -> 400', async () => {
  const s = await setup();
  rejected(await request(app).post(`/api/schedules/${s.scheduleId}/cancel-day`).set('Cookie', s.doctor.cookie).send({ date: s.date }), 400);
});
test('FT-CANCEL-04: cancel-day for a past date -> 400', async () => {
  const s = await setup();
  rejected(await request(app).post(`/api/schedules/${s.scheduleId}/cancel-day`).set('Cookie', s.doctor.cookie).send({ date: '2020-01-07', reason: 'Too late' }), 400);
});
test('FT-CANCEL-05: cancel-day on a date the schedule does not run -> 400', async () => {
  const s = await setup();
  rejected(await request(app).post(`/api/schedules/${s.scheduleId}/cancel-day`).set('Cookie', s.doctor.cookie).send({ date: plusDays(s.date, 1), reason: 'Not a Tuesday' }), 400);
});
test('FT-CANCEL-06: cancelling the same day twice -> 409', async () => {
  const s = await setup();
  const body = { date: s.date, reason: 'Conference' };
  assert.equal((await request(app).post(`/api/schedules/${s.scheduleId}/cancel-day`).set('Cookie', s.doctor.cookie).send(body)).status, 200);
  rejected(await request(app).post(`/api/schedules/${s.scheduleId}/cancel-day`).set('Cookie', s.doctor.cookie).send(body), 409);
});
test('FT-CANCEL-07: patient cannot cancel a chamber day -> 403', async () => {
  const s = await setup();
  const p = await patientWithPhone();
  rejected(await request(app).post(`/api/schedules/${s.scheduleId}/cancel-day`).set('Cookie', p.cookie).send({ date: s.date, reason: 'Nope' }), 403);
});
test('FT-CANCEL-08: another doctor cannot cancel my chamber day -> 404', async () => {
  const s = await setup();
  const other = await newDoctor({}, { approve: true });
  rejected(await request(app).post(`/api/schedules/${s.scheduleId}/cancel-day`).set('Cookie', other.cookie).send({ date: s.date, reason: 'Hijack' }), 404);
});
test('FT-CANCEL-09: reopening a day that was not cancelled -> 404', async () => {
  const s = await setup();
  rejected(await request(app).delete(`/api/schedules/${s.scheduleId}/closed-dates/${s.date}`).set('Cookie', s.doctor.cookie), 404);
});
test('FT-CANCEL-10: cancelling an already cancelled appointment -> 400', async () => {
  const s = await setup();
  const p = await patientWithPhone();
  const a = await book(p, s);
  assert.equal((await request(app).post(`/api/appointments/${a.id}/cancel`).set('Cookie', p.cookie)).status, 200);
  rejected(await request(app).post(`/api/appointments/${a.id}/cancel`).set('Cookie', p.cookie), 400);
});
