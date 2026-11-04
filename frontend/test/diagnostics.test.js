const { test } = require('node:test');
const assert = require('node:assert/strict');

let d;
test.before(async () => {
  d = await import('../src/lib/diagnostics.js');
});

const center = (over = {}) => ({
  isActive: true, acceptingOrders: true, homeCollection: true, openNow: true,
  openFrom: '08:00', openTo: '20:00', openDays: [0, 1, 2, 3, 4, 5, 6], quote: { offersAll: true }, ...over,
});

test('slotsForCenter keeps only slots inside opening hours', () => {
  assert.deepEqual(d.slotsForCenter(center({ openFrom: '10:00', openTo: '14:00' }), '2026-12-01'), ['10:00-12:00', '12:00-14:00']);
  assert.equal(d.slotsForCenter(center(), '2026-12-01').length, 5);
});

test('slotsForCenter returns nothing on a closed weekday', () => {
  // 2026-12-04 is a Friday (5)
  assert.deepEqual(d.slotsForCenter(center({ openDays: [0, 1, 2, 3, 4] }), '2026-12-04'), []);
  assert.deepEqual(d.slotsForCenter(null, '2026-12-04'), []);
});

test('centerStatus explains why a center cannot be used', () => {
  assert.equal(d.centerStatus(center()).label, 'Open now');
  assert.equal(d.centerStatus(center({ openNow: false })).tone, 'amber');
  assert.match(d.centerStatus(center({ openNow: false })).label, /opens 08:00/);
  assert.equal(d.centerStatus(center({ acceptingOrders: false })).label, 'Not accepting orders');
  assert.equal(d.centerStatus(center({ homeCollection: false })).label, 'No home collection');
});

test('canOrderFrom requires acceptance, collection and every test offered', () => {
  assert.equal(d.canOrderFrom(center()), true);
  assert.equal(d.canOrderFrom(center({ quote: { offersAll: false } })), false);
  assert.equal(d.canOrderFrom(center({ acceptingOrders: false })), false);
});

test('buildTimeline marks done / current / upcoming steps with timestamps', () => {
  const order = { status: 'sample_collected', statusHistory: [
    { status: 'pending_dispatch', at: '2026-12-01T07:30:00Z', note: 'Order placed' },
    { status: 'assigned', at: '2026-12-01T08:00:00Z' },
    { status: 'sample_collected', at: '2026-12-01T09:00:00Z' },
  ] };
  const t = d.buildTimeline(order);
  assert.deepEqual(t.map((s) => s.state), ['done', 'done', 'done', 'current', 'upcoming', 'upcoming', 'upcoming'].map((x, i) => (i === 2 ? 'done' : x)).map((x, i) => (i === 3 ? 'current' : x)));
  assert.equal(t[3].status, 'sample_collected');
  assert.equal(t[3].state, 'current');
  assert.equal(t[0].note, 'Order placed');
  assert.equal(t[6].state, 'upcoming');
});

test('buildTimeline shows every step done for a completed order', () => {
  const t = d.buildTimeline({ status: 'completed', statusHistory: [] });
  assert.ok(t.every((s, i) => (i === 6 ? s.state === 'done' : s.state === 'done')));
});

test('statusLabel maps statuses to friendly text', () => {
  assert.equal(d.statusLabel('en_route'), 'On the way');
  assert.equal(d.statusLabel('weird_status'), 'weird status');
});
