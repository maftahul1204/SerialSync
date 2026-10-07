const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { connectTestDb, clearScheduleData, disconnectTestDb, approveDoctor } = require('./helpers/testDb');
const { COOKIE_NAME } = require('../src/utils/jwt');

let app;

test.before(async () => {
  await connectTestDb();
  app = require('../src/app');
});

test.after(async () => {
  await disconnectTestDb();
});

test.beforeEach(async () => {
  await clearScheduleData();
});

function authCookie(res) {
  const setCookie = res.headers['set-cookie'];
  const line = setCookie.find((c) => c.startsWith(`${COOKIE_NAME}=`));
  return line.split(';')[0];
}

async function registerDoctor() {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      fullName: 'Dr Test',
      email: 'doctor@serialsync.test',
      password: 'password123',
      role: 'doctor',
    });
  const user = res.body.user;
  await approveDoctor(user.id);
  return { cookie: authCookie(res), user };
}

async function registerPatient() {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      fullName: 'Patient Test',
      email: 'patient@serialsync.test',
      password: 'password123',
      role: 'patient',
    });
  return { cookie: authCookie(res), user: res.body.user };
}

test('SCRUM-26: doctor creates chamber and availability', async () => {
  const { cookie, user } = await registerDoctor();
  const chamberRes = await request(app)
    .post('/api/chambers')
    .set('Cookie', cookie)
    .send({ name: 'City Clinic', address: '123 Main', city: 'Dhaka', consultationFee: 500 });
  assert.equal(chamberRes.status, 201);
  const chamberId = chamberRes.body.chamber.id;

  const scheduleRes = await request(app)
    .post('/api/schedules')
    .set('Cookie', cookie)
    .send({
      chamberId,
      daysOfWeek: [1, 3],
      startTime: '09:00',
      endTime: '12:00',
      consultationFee: 500,
      patientsPerSlot: 2,
      slotDurationMinutes: 30,
    });
  assert.equal(scheduleRes.status, 201);
  assert.equal(scheduleRes.body.schedule.doctorId, user.id);
  assert.deepEqual(scheduleRes.body.schedule.daysOfWeek, [1, 3]);
});

test('SCRUM-27: doctor updates schedule times', async () => {
  const { cookie } = await registerDoctor();
  const chamber = await request(app)
    .post('/api/chambers')
    .set('Cookie', cookie)
    .send({ name: 'Chamber A' });
  const created = await request(app)
    .post('/api/schedules')
    .set('Cookie', cookie)
    .send({
      chamberId: chamber.body.chamber.id,
      daysOfWeek: [2],
      startTime: '10:00',
      endTime: '11:00',
      consultationFee: 300,
    });
  const updated = await request(app)
    .patch(`/api/schedules/${created.body.schedule.id}`)
    .set('Cookie', cookie)
    .send({ startTime: '10:30', endTime: '11:30' });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.schedule.startTime, '10:30');
});

test('SCRUM-28: doctor deletes availability', async () => {
  const { cookie } = await registerDoctor();
  const chamber = await request(app)
    .post('/api/chambers')
    .set('Cookie', cookie)
    .send({ name: 'Chamber B' });
  const created = await request(app)
    .post('/api/schedules')
    .set('Cookie', cookie)
    .send({
      chamberId: chamber.body.chamber.id,
      daysOfWeek: [4],
      startTime: '14:00',
      endTime: '15:00',
      consultationFee: 400,
    });
  const del = await request(app)
    .delete(`/api/schedules/${created.body.schedule.id}`)
    .set('Cookie', cookie);
  assert.equal(del.status, 200);
  const list = await request(app).get('/api/schedules/me').set('Cookie', cookie);
  assert.equal(list.body.schedules.length, 0);
});

test('SCRUM-29: patient views doctor schedule', async () => {
  const { cookie, user } = await registerDoctor();
  const chamber = await request(app)
    .post('/api/chambers')
    .set('Cookie', cookie)
    .send({ name: 'View Chamber' });
  await request(app)
    .post('/api/schedules')
    .set('Cookie', cookie)
    .send({
      chamberId: chamber.body.chamber.id,
      daysOfWeek: [1],
      startTime: '09:00',
      endTime: '10:00',
      consultationFee: 250,
    });

  const view = await request(app).get(`/api/schedules/doctors/${user.id}`);
  assert.equal(view.status, 200);
  assert.equal(view.body.schedules.length, 1);
  assert.equal(view.body.chambers.length, 1);
});

test('SCRUM-31: overlapping schedules are rejected', async () => {
  const { cookie } = await registerDoctor();
  const chamber = await request(app)
    .post('/api/chambers')
    .set('Cookie', cookie)
    .send({ name: 'Conflict Chamber' });
  const chamberId = chamber.body.chamber.id;
  await request(app)
    .post('/api/schedules')
    .set('Cookie', cookie)
    .send({
      chamberId,
      daysOfWeek: [1],
      startTime: '09:00',
      endTime: '11:00',
      consultationFee: 500,
    });
  const conflict = await request(app)
    .post('/api/schedules')
    .set('Cookie', cookie)
    .send({
      chamberId,
      daysOfWeek: [1],
      startTime: '10:00',
      endTime: '12:00',
      consultationFee: 500,
    });
  assert.equal(conflict.status, 409);
  assert.ok(conflict.body.conflicts?.length);
});

test('SCRUM-32: inactive schedule hidden from public view', async () => {
  const { cookie, user } = await registerDoctor();
  const chamber = await request(app)
    .post('/api/chambers')
    .set('Cookie', cookie)
    .send({ name: 'Status Chamber' });
  const created = await request(app)
    .post('/api/schedules')
    .set('Cookie', cookie)
    .send({
      chamberId: chamber.body.chamber.id,
      daysOfWeek: [5],
      startTime: '08:00',
      endTime: '09:00',
      consultationFee: 200,
    });
  await request(app)
    .patch(`/api/schedules/${created.body.schedule.id}/status`)
    .set('Cookie', cookie)
    .send({ status: 'inactive' });
  const view = await request(app).get(`/api/schedules/doctors/${user.id}`);
  assert.equal(view.body.schedules.length, 0);
});

test('SCRUM-30: appointment slots respect patient quota', async () => {
  const doctor = await registerDoctor();
  const patient = await registerPatient();
  const chamber = await request(app)
    .post('/api/chambers')
    .set('Cookie', doctor.cookie)
    .send({ name: 'Slot Chamber' });
  const schedule = await request(app)
    .post('/api/schedules')
    .set('Cookie', doctor.cookie)
    .send({
      chamberId: chamber.body.chamber.id,
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      startTime: '09:00',
      endTime: '10:00',
      consultationFee: 100,
      patientsPerSlot: 1,
      slotDurationMinutes: 60,
    });
  const scheduleId = schedule.body.schedule.id;
  const from = '2026-10-05';
  const to = '2026-10-05';

  const slotsBefore = await request(app).get(
    `/api/schedules/doctors/${doctor.user.id}/slots?from=${from}&to=${to}`
  );
  assert.ok(slotsBefore.body.slots.length >= 1);
  const slotStart = slotsBefore.body.slots[0].slotStart;

  const book1 = await request(app)
    .post('/api/schedules/slots/book')
    .set('Cookie', patient.cookie)
    .send({ scheduleId, date: from, slotStart });
  assert.equal(book1.status, 201);

  const book2 = await request(app)
    .post('/api/schedules/slots/book')
    .set('Cookie', patient.cookie)
    .send({ scheduleId, date: from, slotStart });
  assert.equal(book2.status, 409);
});
