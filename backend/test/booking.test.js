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

async function seedDoctorAndPatient() {
  const doctorReg = await request(app).post('/api/auth/register').send({
    fullName: 'Dr Book',
    email: 'book-doc@test.com',
    password: 'password123',
    role: 'doctor',
  });
  await approveDoctor(doctorReg.body.user.id);
  const doctorCookie = authCookie(doctorReg);

  await request(app)
    .post('/api/chambers')
    .set('Cookie', doctorCookie)
    .send({ name: 'Test Chamber', area: 'Dhanmondi' });

  const chambers = await request(app).get('/api/chambers').set('Cookie', doctorCookie);
  const chamberId = chambers.body.chambers[0].id;
  const dow = new Date().getDay();
  await request(app)
    .post('/api/schedules')
    .set('Cookie', doctorCookie)
    .send({
      chamberId,
      daysOfWeek: [dow],
      startTime: '09:00',
      endTime: '12:00',
      consultationFee: 1200,
      patientsPerSlot: 1,
    });

  const patientReg = await request(app).post('/api/auth/register').send({
    fullName: 'Patient Book',
    email: 'book-patient@test.com',
    password: 'password123',
    role: 'patient',
  });
  return {
    doctorId: doctorReg.body.user.id,
    patientCookie: authCookie(patientReg),
    doctorCookie,
  };
}

test('SCRUM-37: book appointment assigns serial and confirmation', async () => {
  const { doctorId, patientCookie } = await seedDoctorAndPatient();
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const slots = await request(app)
    .get(`/api/schedules/doctors/${doctorId}/slots?from=${date}&to=${date}`)
    .set('Cookie', patientCookie);
  assert.ok(slots.body.slots.length);
  const slot = slots.body.slots[0];
  const book = await request(app)
    .post('/api/schedules/slots/book')
    .set('Cookie', patientCookie)
    .send({ scheduleId: slot.scheduleId, date, slotStart: slot.slotStart });
  assert.equal(book.status, 201);
  assert.equal(book.body.appointment.serialNumber, 1);
  assert.ok(book.body.appointment.confirmationCode);
});

test('SCRUM-40: patient views appointment history', async () => {
  const { doctorId, patientCookie } = await seedDoctorAndPatient();
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const slots = await request(app)
    .get(`/api/schedules/doctors/${doctorId}/slots?from=${date}&to=${date}`)
    .set('Cookie', patientCookie);
  const slot = slots.body.slots[0];
  await request(app)
    .post('/api/schedules/slots/book')
    .set('Cookie', patientCookie)
    .send({ scheduleId: slot.scheduleId, date, slotStart: slot.slotStart });

  const list = await request(app).get('/api/appointments/me').set('Cookie', patientCookie);
  assert.equal(list.status, 200);
  assert.equal(list.body.appointments.length, 1);
});

test('SCRUM-41: patient cancels appointment', async () => {
  const { doctorId, patientCookie } = await seedDoctorAndPatient();
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const slots = await request(app)
    .get(`/api/schedules/doctors/${doctorId}/slots?from=${date}&to=${date}`)
    .set('Cookie', patientCookie);
  const slot = slots.body.slots[0];
  const book = await request(app)
    .post('/api/schedules/slots/book')
    .set('Cookie', patientCookie)
    .send({ scheduleId: slot.scheduleId, date, slotStart: slot.slotStart });
  const cancel = await request(app)
    .post(`/api/appointments/${book.body.appointment.id}/cancel`)
    .set('Cookie', patientCookie);
  assert.equal(cancel.status, 200);
  assert.equal(cancel.body.appointment.status, 'cancelled');
});

test('SCRUM-37: duplicate booking rejected', async () => {
  const { doctorId, patientCookie } = await seedDoctorAndPatient();
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const slots = await request(app)
    .get(`/api/schedules/doctors/${doctorId}/slots?from=${date}&to=${date}`)
    .set('Cookie', patientCookie);
  const slot = slots.body.slots[0];
  const payload = { scheduleId: slot.scheduleId, date, slotStart: slot.slotStart };
  await request(app).post('/api/schedules/slots/book').set('Cookie', patientCookie).send(payload);
  const dup = await request(app).post('/api/schedules/slots/book').set('Cookie', patientCookie).send(payload);
  assert.equal(dup.status, 409);
});

test('SCRUM-35: doctor profile API', async () => {
  const { doctorId, patientCookie } = await seedDoctorAndPatient();
  const profile = await request(app).get(`/api/doctors/${doctorId}`).set('Cookie', patientCookie);
  assert.equal(profile.status, 200);
  assert.equal(profile.body.doctor.fullName, 'Dr Book');
});
