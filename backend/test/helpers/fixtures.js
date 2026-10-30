const request = require('supertest');
const { registerDoctor } = require('./doctorDocs');
const { approveDoctor } = require('./testDb');
const { COOKIE_NAME } = require('../../src/utils/jwt');

function authCookie(res) {
  const setCookie = res.headers['set-cookie'];
  const line = setCookie.find((c) => c.startsWith(`${COOKIE_NAME}=`));
  return line.split(';')[0];
}

/** Fixed Monday for deterministic slot tests (2026-10-05 is a Monday). */
let fixtureSeq = 0;
function uniq() {
  fixtureSeq += 1;
  return `${Date.now()}-${fixtureSeq}-${Math.random().toString(36).slice(2, 8)}`;
}

const BOOKING_DATE = '2026-10-05';
const BOOKING_DOW = 1;

async function seedDoctorPatientChamber(app) {
  const doctorReg = await registerDoctor(app, {
    fullName: 'Dr Fixture',
    email: `doc-fixture-${uniq()}@test.com`,
  });
  await approveDoctor(doctorReg.body.user.id);
  const doctorCookie = authCookie(doctorReg);

  const chamberRes = await request(app)
    .post('/api/chambers')
    .set('Cookie', doctorCookie)
    .send({ name: 'Fixture Chamber', area: 'Dhanmondi' });
  const chamberId = chamberRes.body.chamber.id;

  await request(app)
    .post('/api/schedules')
    .set('Cookie', doctorCookie)
    .send({
      chamberId,
      daysOfWeek: [BOOKING_DOW],
      startTime: '09:00',
      endTime: '12:00',
      consultationFee: 1200,
      patientsPerSlot: 1,
      slotDurationMinutes: 60,
    });

  const patientReg = await request(app).post('/api/auth/register').send({
    fullName: 'Patient Fixture',
    email: `patient-fixture-${uniq()}@test.com`,
    password: 'password123',
    role: 'patient',
  });

  return {
    doctorId: doctorReg.body.user.id,
    doctorCookie,
    patientCookie: authCookie(patientReg),
    chamberId,
    bookingDate: BOOKING_DATE,
  };
}

async function bookFirstSlot(app, { doctorId, patientCookie, bookingDate }) {
  const slots = await request(app)
    .get(`/api/schedules/doctors/${doctorId}/slots?from=${bookingDate}&to=${bookingDate}`)
    .set('Cookie', patientCookie);
  const slot = slots.body.slots[0];
  const book = await request(app)
    .post('/api/schedules/slots/book')
    .set('Cookie', patientCookie)
    .send({ scheduleId: slot.scheduleId, date: bookingDate, slotStart: slot.slotStart });
  return { slot, book };
}

module.exports = {
  authCookie,
  BOOKING_DATE,
  BOOKING_DOW,
  seedDoctorPatientChamber,
  bookFirstSlot,
};
