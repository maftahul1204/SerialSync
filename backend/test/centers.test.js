/** Diagnostic centers: choice, per-center pricing, availability and order status history. */
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { connectTestDb, clearScheduleData, disconnectTestDb, seedDiagnosticTests } = require('./helpers/testDb');
const { authCookie } = require('./helpers/fixtures');
const { PDF } = require('./helpers/doctorDocs');
const { DiagnosticTest } = require('../src/models/DiagnosticTest');
const { DiagnosticCenter } = require('../src/models/DiagnosticCenter');
const { Notification } = require('../src/models/Notification');
const { User } = require('../src/models/User');

let app;
let seq = 0;
const MISSING_ID = '64f1a2b3c4d5e6f7a8b9c0d1';
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

before(async () => {
  await connectTestDb();
  app = require('../src/app');
});
after(async () => {
  await disconnectTestDb();
});
beforeEach(async () => {
  await clearScheduleData();
  await DiagnosticCenter.deleteMany({});
  await Notification.deleteMany({});
  await seedDiagnosticTests();
});

const rejected = (res, status) => {
  assert.equal(res.status, status, JSON.stringify(res.body));
  assert.equal(res.body.success, false);
};
async function user(role) {
  seq += 1;
  const res = await request(app).post('/api/auth/register').send({
    fullName: `${role} ${seq}`, email: `c-${role}-${seq}-${Date.now()}@test.com`, password: 'password123', role, phone: '01712345678',
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return { cookie: authCookie(res), id: res.body.user.id };
}
async function center(admin, over = {}) {
  seq += 1;
  const res = await request(app).post('/api/diagnostics/centers').set('Cookie', admin.cookie).send({
    name: `Center ${seq}`, area: 'Dhanmondi', address: 'Road 1', phone: '01800000000',
    openFrom: '00:00', openTo: '23:59', openDays: ALL_DAYS, turnaroundHours: 24,
    collectionFee: 100, freeCollectionAbove: 1500, prices: [{ code: 'CBC', price: 500 }, { code: 'FBS', price: 250 }, { code: 'LIPID', price: 1000 }],
    ...over,
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.center;
}
const order = (cookie, body) =>
  request(app).post('/api/diagnostics/orders').set('Cookie', cookie).send({
    address: 'House 1, Dhanmondi', contactPhone: '01700000000', preferredDate: '2026-12-01', timeSlot: '08:00-10:00', ...body,
  });
const testId = async (code) => (await DiagnosticTest.findOne({ code }))._id.toString();

test('PT-51: patient compares centers: quote per center, cheapest and recommended flagged', async () => {
  const admin = await user('admin');
  const patient = await user('patient');
  const cheap = await center(admin, { name: 'Green Lab', prices: [{ code: 'CBC', price: 400 }, { code: 'FBS', price: 200 }] });
  const dear = await center(admin, { name: 'Premium Lab', prices: [{ code: 'CBC', price: 900 }, { code: 'FBS', price: 450 }] });
  const partial = await center(admin, { name: 'Only CBC Lab', prices: [{ code: 'CBC', price: 300 }] });
  const res = await request(app).get('/api/diagnostics/centers?codes=CBC,FBS').set('Cookie', patient.cookie);
  assert.equal(res.status, 200);
  assert.equal(res.body.cheapestCenterId, cheap.id);
  assert.equal(res.body.recommendedCenterId, cheap.id);
  const byName = Object.fromEntries(res.body.centers.map((c) => [c.name, c]));
  assert.equal(byName['Green Lab'].quote.subtotal, 600);
  assert.equal(byName['Green Lab'].quote.collectionFee, 100); // 600 < 1500 free threshold
  assert.equal(byName['Green Lab'].quote.total, 700);
  assert.equal(byName['Premium Lab'].quote.total, 1450); // 1350 + 100
  assert.deepEqual(byName['Only CBC Lab'].quote.missing, ['FBS']);
  assert.equal(byName['Only CBC Lab'].quote.offersAll, false);
  assert.equal(res.body.centers[res.body.centers.length - 1].name, 'Only CBC Lab'); // cannot-serve sorted last
  assert.ok(dear.id);
});
test('PT-52: ordering at a chosen center uses that center\'s prices and records the center', async () => {
  const admin = await user('admin');
  const patient = await user('patient');
  const c = await center(admin, { name: 'Popular Lab' });
  const res = await order(patient.cookie, { testIds: [await testId('CBC'), await testId('FBS')], centerId: c.id });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const o = res.body.order;
  assert.equal(o.center.name, 'Popular Lab');
  assert.equal(o.subtotal, 750);
  assert.equal(o.collectionFee, 100);
  assert.equal(o.totalAmount, 850);
  assert.deepEqual(o.tests.map((t) => t.price).sort(), [250, 500]);
  assert.equal(o.statusHistory[0].status, 'pending_dispatch');
  assert.match(o.statusHistory[0].note, /Popular Lab/);
  const notes = await request(app).get('/api/notifications').set('Cookie', patient.cookie);
  assert.ok(notes.body.notifications.some((n) => /Popular Lab/.test(n.title)));
});
test('PT-53: collection is free above the threshold and packages are discounted', async () => {
  const admin = await user('admin');
  const patient = await user('patient');
  const c = await center(admin, { prices: [{ code: 'CBC', price: 600 }, { code: 'FBS', price: 300 }, { code: 'LIPID', price: 1100 }, { code: 'HBA1C', price: 900 }, { code: 'LFT', price: 1100 }] });
  await DiagnosticTest.create({ code: 'HBA1C', name: 'HbA1c', category: 'Biochemistry', price: 900 });
  await DiagnosticTest.create({ code: 'LFT', name: 'Liver Function', category: 'Biochemistry', price: 1100 });
  const res = await order(patient.cookie, { packageId: 'pkg-diabetic', centerId: c.id });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  // FBS 300 + HBA1C 900 + LIPID 1100 = 2300; 12% off = 276; 2024 >= 1500 so collection is free
  assert.equal(res.body.order.subtotal, 2300);
  assert.equal(res.body.order.discount, 276);
  assert.equal(res.body.order.collectionFee, 0);
  assert.equal(res.body.order.totalAmount, 2024);
});
test('PT-54: with no choice the cheapest open eligible center is assigned', async () => {
  const admin = await user('admin');
  const patient = await user('patient');
  await center(admin, { name: 'Dear', prices: [{ code: 'CBC', price: 900 }] });
  const cheap = await center(admin, { name: 'Cheap', prices: [{ code: 'CBC', price: 300 }] });
  const res = await order(patient.cookie, { testIds: [await testId('CBC')] });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(res.body.order.center.id, cheap.id);
});
test('PT-55: status changes append to the order timeline, including report upload', async () => {
  const admin = await user('admin');
  const patient = await user('patient');
  const collector = await user('phlebotomist');
  const c = await center(admin);
  const o = (await order(patient.cookie, { testIds: [await testId('CBC')], centerId: c.id })).body.order;
  const st = await request(app).patch(`/api/diagnostics/orders/${o.id}/status`).set('Cookie', collector.cookie).send({ status: 'sample_collected', collectionNote: 'Collected, cold chain OK' });
  assert.equal(st.status, 200, JSON.stringify(st.body));
  const up = await request(app).post(`/api/diagnostics/orders/${o.id}/report`).set('Cookie', admin.cookie).attach('report', PDF, { filename: 'r.pdf', contentType: 'application/pdf' });
  assert.equal(up.status, 200, JSON.stringify(up.body));
  const got = await request(app).get(`/api/diagnostics/orders/${o.id}`).set('Cookie', patient.cookie);
  assert.deepEqual(got.body.order.statusHistory.map((h) => h.status), ['pending_dispatch', 'assigned', 'sample_collected', 'completed']);
  assert.equal(got.body.order.statusHistory[2].note, 'Collected, cold chain OK');
});
test('PT-56: admin creates, updates (stops accepting orders) and reads center detail with prices', async () => {
  const admin = await user('admin');
  const patient = await user('patient');
  const c = await center(admin, { name: 'Detail Lab' });
  const upd = await request(app).patch(`/api/diagnostics/centers/${c.id}`).set('Cookie', admin.cookie).send({ acceptingOrders: false });
  assert.equal(upd.status, 200);
  assert.equal(upd.body.center.openNow, false);
  const detail = await request(app).get(`/api/diagnostics/centers/${c.id}`).set('Cookie', patient.cookie);
  assert.equal(detail.status, 200);
  assert.equal(detail.body.center.prices.length, 3);
  const audit = await request(app).get('/api/admin/audit?action=center.update').set('Cookie', admin.cookie);
  assert.equal(audit.body.entries.length, 1);
});

test('FT-CENTER-01: patient cannot create or edit a center -> 403', async () => {
  const patient = await user('patient');
  rejected(await request(app).post('/api/diagnostics/centers').set('Cookie', patient.cookie).send({ name: 'X' }), 403);
  rejected(await request(app).patch(`/api/diagnostics/centers/${MISSING_ID}`).set('Cookie', patient.cookie).send({ name: 'X' }), 403);
});
test('FT-CENTER-02: order with a malformed center id -> 400', async () => {
  const admin = await user('admin');
  const patient = await user('patient');
  await center(admin);
  rejected(await order(patient.cookie, { testIds: [await testId('CBC')], centerId: 'not-an-id' }), 400);
});
test('FT-CENTER-03: order at an unknown center -> 404', async () => {
  const patient = await user('patient');
  rejected(await order(patient.cookie, { testIds: [await testId('CBC')], centerId: MISSING_ID }), 404);
});
test('FT-CENTER-04: center that does not offer every selected test -> 400 CENTER_MISSING_TESTS', async () => {
  const admin = await user('admin');
  const patient = await user('patient');
  const c = await center(admin, { prices: [{ code: 'CBC', price: 400 }] });
  const res = await order(patient.cookie, { testIds: [await testId('CBC'), await testId('FBS')], centerId: c.id });
  rejected(res, 400);
  assert.equal(res.body.code, 'CENTER_MISSING_TESTS');
  assert.match(res.body.message, /FBS/);
});
test('FT-CENTER-05: center not accepting orders -> 409 CENTER_NOT_ACCEPTING', async () => {
  const admin = await user('admin');
  const patient = await user('patient');
  const c = await center(admin, { acceptingOrders: false });
  const res = await order(patient.cookie, { testIds: [await testId('CBC')], centerId: c.id });
  rejected(res, 409);
  assert.equal(res.body.code, 'CENTER_NOT_ACCEPTING');
});
test('FT-CENTER-06: center without home collection -> 400', async () => {
  const admin = await user('admin');
  const patient = await user('patient');
  const c = await center(admin, { homeCollection: false });
  rejected(await order(patient.cookie, { testIds: [await testId('CBC')], centerId: c.id }), 400);
});
test('FT-CENTER-07: unknown package when listing centers -> 400', async () => {
  const patient = await user('patient');
  rejected(await request(app).get('/api/diagnostics/centers?packageId=pkg-nope').set('Cookie', patient.cookie), 400);
});
test('FT-CENTER-08: creating a center without a name or with bad hours -> 400', async () => {
  const admin = await user('admin');
  rejected(await request(app).post('/api/diagnostics/centers').set('Cookie', admin.cookie).send({ area: 'X' }), 400);
  rejected(await request(app).post('/api/diagnostics/centers').set('Cookie', admin.cookie).send({ name: 'Bad Hours', openFrom: '8am' }), 400);
});
test('FT-CENTER-09: duplicate center name -> 409', async () => {
  const admin = await user('admin');
  await center(admin, { name: 'Same Name' });
  rejected(await request(app).post('/api/diagnostics/centers').set('Cookie', admin.cookie).send({ name: 'Same Name' }), 409);
});
test('FT-CENTER-10: update or read an unknown center -> 404', async () => {
  const admin = await user('admin');
  rejected(await request(app).patch(`/api/diagnostics/centers/${MISSING_ID}`).set('Cookie', admin.cookie).send({ rating: 4 }), 404);
  rejected(await request(app).get(`/api/diagnostics/centers/${MISSING_ID}`).set('Cookie', admin.cookie), 404);
  rejected(await request(app).get('/api/diagnostics/centers/not-an-id').set('Cookie', admin.cookie), 400);
});
test('FT-CENTER-11: no center can serve every test -> 409 NO_CENTER_AVAILABLE', async () => {
  const admin = await user('admin');
  const patient = await user('patient');
  await center(admin, { prices: [{ code: 'CBC', price: 400 }] });
  const res = await order(patient.cookie, { testIds: [await testId('FBS')] });
  rejected(res, 409);
  assert.equal(res.body.code, 'NO_CENTER_AVAILABLE');
});
test('FT-CENTER-12: listing centers without a session -> 401', async () => {
  rejected(await request(app).get('/api/diagnostics/centers'), 401);
});
test('FT-CENTER-13: invalid price entry on a center -> 400', async () => {
  const admin = await user('admin');
  rejected(await request(app).post('/api/diagnostics/centers').set('Cookie', admin.cookie).send({ name: 'Bad Price', prices: [{ code: 'CBC', price: -5 }] }), 400);
});

test('PT-57: a new center without a price list starts with the catalogue prices', async () => {
  const admin = await user('admin');
  const res = await request(app).post('/api/diagnostics/centers').set('Cookie', admin.cookie).send({ name: 'Default Price Lab' });
  assert.equal(res.status, 201);
  const detail = await request(app).get(`/api/diagnostics/centers/${res.body.center.id}`).set('Cookie', admin.cookie);
  assert.equal(detail.body.center.prices.length, 3); // CBC, FBS, LIPID from seedDiagnosticTests
  assert.equal(detail.body.center.prices.find((p) => p.code === 'CBC').price, 450);
});
