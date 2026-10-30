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

test('SCRUM-37: book appointment assigns serial and confirmation', async () => {
  const ctx = await seedDoctorPatientChamber(app);
  const { book } = await bookFirstSlot(app, ctx);
  assert.equal(book.status, 201);
  assert.equal(book.body.appointment.serialNumber, 1);
  assert.ok(book.body.appointment.confirmationCode);
});

test('SCRUM-40: patient views appointment history', async () => {
  const ctx = await seedDoctorPatientChamber(app);
  await bookFirstSlot(app, ctx);
  const list = await request(app).get('/api/appointments/me').set('Cookie', ctx.patientCookie);
  assert.equal(list.status, 200);
  assert.equal(list.body.appointments.length, 1);
});

test('SCRUM-41: patient cancels appointment', async () => {
  const ctx = await seedDoctorPatientChamber(app);
  const { book } = await bookFirstSlot(app, ctx);
  const cancel = await request(app)
    .post(`/api/appointments/${book.body.appointment.id}/cancel`)
    .set('Cookie', ctx.patientCookie);
  assert.equal(cancel.status, 200);
  assert.equal(cancel.body.appointment.status, 'cancelled');
});

test('SCRUM-37: duplicate booking rejected', async () => {
  const ctx = await seedDoctorPatientChamber(app);
  const { slot } = await bookFirstSlot(app, ctx);
  const payload = {
    scheduleId: slot.scheduleId,
    date: ctx.bookingDate,
    slotStart: slot.slotStart,
  };
  const dup = await request(app).post('/api/schedules/slots/book').set('Cookie', ctx.patientCookie).send(payload);
  assert.equal(dup.status, 409);
});

test('SCRUM-35: doctor profile API', async () => {
  const ctx = await seedDoctorPatientChamber(app);
  const profile = await request(app).get(`/api/doctors/${ctx.doctorId}`).set('Cookie', ctx.patientCookie);
  assert.equal(profile.status, 200);
  assert.equal(profile.body.doctor.fullName, 'Dr Fixture');
});
