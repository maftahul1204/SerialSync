const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { connectTestDb, clearScheduleData, disconnectTestDb } = require('./helpers/testDb');
const { seedDoctorPatientChamber, bookFirstSlot, authCookie } = require('./helpers/fixtures');

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

async function registerAssistant() {
  const res = await request(app).post('/api/auth/register').send({
    fullName: 'Queue Assistant',
    email: `assistant-${Date.now()}@test.com`,
    password: 'password123',
    role: 'assistant',
  });
  return authCookie(res);
}

test('queue session ensure and advance updates state', async () => {
  const ctx = await seedDoctorPatientChamber(app);
  await bookFirstSlot(app, ctx);
  const assistantCookie = await registerAssistant();

  const session = await request(app)
    .post('/api/queue/sessions')
    .set('Cookie', assistantCookie)
    .send({ doctorId: ctx.doctorId, chamberId: ctx.chamberId, date: ctx.bookingDate });
  assert.equal(session.status, 200);
  assert.ok(session.body.queue.sessionId);
  const sessionId = session.body.queue.sessionId;

  const state = await request(app)
    .get(`/api/queue/sessions/${sessionId}`)
    .set('Cookie', assistantCookie);
  assert.equal(state.status, 200);
  assert.ok(state.body.queue.items.length >= 1);

  const advance = await request(app)
    .post(`/api/queue/sessions/${sessionId}/advance`)
    .set('Cookie', assistantCookie);
  assert.equal(advance.status, 200);
  assert.ok(advance.body.queue.nowServing);
  assert.equal(advance.body.queue.servingIndex, 0);
});

test('patient live queue view for today booking', async () => {
  const today = new Date();
  const bookingDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const ctx = await seedDoctorPatientChamber(app);
  const slots = await request(app)
    .get(`/api/schedules/doctors/${ctx.doctorId}/slots?from=${bookingDate}&to=${bookingDate}`)
    .set('Cookie', ctx.patientCookie);
  if (slots.body.slots.length) {
    const slot = slots.body.slots[0];
    await request(app)
      .post('/api/schedules/slots/book')
      .set('Cookie', ctx.patientCookie)
      .send({ scheduleId: slot.scheduleId, date: bookingDate, slotStart: slot.slotStart });
  } else {
    await request(app)
      .post('/api/schedules')
      .set('Cookie', ctx.doctorCookie)
      .send({
        chamberId: ctx.chamberId,
        daysOfWeek: [today.getDay()],
        startTime: '09:00',
        endTime: '12:00',
        consultationFee: 500,
        patientsPerSlot: 1,
        slotDurationMinutes: 60,
      });
    const slots2 = await request(app)
      .get(`/api/schedules/doctors/${ctx.doctorId}/slots?from=${bookingDate}&to=${bookingDate}`)
      .set('Cookie', ctx.patientCookie);
    const slot = slots2.body.slots[0];
    await request(app)
      .post('/api/schedules/slots/book')
      .set('Cookie', ctx.patientCookie)
      .send({ scheduleId: slot.scheduleId, date: bookingDate, slotStart: slot.slotStart });
  }
  const view = await request(app).get('/api/queue/me/today').set('Cookie', ctx.patientCookie);
  assert.equal(view.status, 200);
  assert.equal(view.body.success, true);
  assert.ok(view.body.serialNumber >= 1);
});

test('walk-in requires assistant role', async () => {
  const ctx = await seedDoctorPatientChamber(app);
  const assistantCookie = await registerAssistant();
  const session = await request(app)
    .post('/api/queue/sessions')
    .set('Cookie', assistantCookie)
    .send({ doctorId: ctx.doctorId, chamberId: ctx.chamberId, date: ctx.bookingDate });
  const sessionId = session.body.queue.sessionId;

  const denied = await request(app)
    .post(`/api/queue/sessions/${sessionId}/walk-in`)
    .set('Cookie', ctx.patientCookie)
    .send({ afterSerial: 1, patientName: 'Walk In' });
  assert.equal(denied.status, 403);

  const ok = await request(app)
    .post(`/api/queue/sessions/${sessionId}/walk-in`)
    .set('Cookie', assistantCookie)
    .send({ afterSerial: 1, patientName: 'Walk In Patient' });
  assert.equal(ok.status, 201);
  assert.ok(ok.body.walkIn);
});
