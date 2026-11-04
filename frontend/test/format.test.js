const { test } = require('node:test');
const assert = require('node:assert/strict');

let fmt;
test.before(async () => {
  fmt = await import('../src/lib/format.js');
});

test('timeAgo formats recent and older times', () => {
  const now = Date.parse('2026-10-05T12:00:00Z');
  assert.equal(fmt.timeAgo('2026-10-05T11:59:40Z', now), 'just now');
  assert.equal(fmt.timeAgo('2026-10-05T11:30:00Z', now), '30 min ago');
  assert.equal(fmt.timeAgo('2026-10-05T09:00:00Z', now), '3 h ago');
  assert.equal(fmt.timeAgo('2026-10-03T12:00:00Z', now), '2 d ago');
  assert.equal(fmt.timeAgo('not-a-date', now), '');
});

test('todayYmd pads month and day', () => {
  assert.equal(fmt.todayYmd(new Date(2026, 0, 5)), '2026-01-05');
});

test('formatTaka prefixes the currency symbol', () => {
  assert.equal(fmt.formatTaka(1200), '৳1,200');
  assert.equal(fmt.formatTaka(undefined), '৳0');
});

test('buildSeriesGeometry maps values into the chart box', () => {
  const g = fmt.buildSeriesGeometry([{ value: 4 }, { value: 8 }], { width: 100, height: 60, pad: 10 });
  assert.equal(g.coords.length, 2);
  assert.equal(g.coords[0].x, 10);
  assert.equal(g.coords[1].x, 90);
  assert.ok(g.coords[1].y < g.coords[0].y, 'higher value is drawn higher on screen');
});

test('buildSeriesGeometry handles a single point and an empty series', () => {
  const single = fmt.buildSeriesGeometry([{ value: 5 }], { width: 100, height: 60 });
  assert.equal(single.coords[0].x, 50);
  assert.deepEqual(fmt.buildSeriesGeometry([]).coords, []);
});
