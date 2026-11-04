const { test } = require('node:test');
const assert = require('node:assert/strict');

let nav;
test.before(async () => {
  nav = await import('../src/lib/navigation.js');
});

const hrefs = (list) => list.map((i) => i.href);

test('doctor sees the schedule portal only after approval', () => {
  assert.deepEqual(hrefs(nav.staffNav({ role: 'doctor', doctorApprovalStatus: 'pending' }).portals), []);
  assert.deepEqual(hrefs(nav.staffNav({ role: 'doctor', doctorApprovalStatus: 'approved' }).portals), ['/dashboard/schedule']);
});

test('assistant and phlebotomist each get their own workspace link', () => {
  assert.deepEqual(hrefs(nav.staffNav({ role: 'assistant' }).portals), ['/dashboard/assistant']);
  assert.deepEqual(hrefs(nav.staffNav({ role: 'phlebotomist' }).portals), ['/dashboard/collections']);
});

test('admin can reach every portal from the menu', () => {
  const portals = hrefs(nav.staffNav({ role: 'admin' }).portals);
  for (const href of [
    '/dashboard/admin', '/dashboard/admin/diagnostics', '/dashboard/admin/audit',
    '/dashboard/schedule', '/dashboard/assistant', '/dashboard/collections',
  ]) {
    assert.ok(portals.includes(href), `missing ${href}`);
  }
});

test('every role has Dashboard, Profile and Notifications reachable', () => {
  for (const role of ['doctor', 'assistant', 'phlebotomist', 'admin']) {
    const n = nav.staffNav({ role });
    assert.ok(hrefs(n.core).includes('/dashboard'));
    assert.deepEqual(hrefs(n.account), ['/profile', '/notifications']);
  }
});

test('patient menu links to family care, home tests and bookings', () => {
  const links = hrefs(nav.PATIENT_MENU);
  for (const href of ['/profile', '/family', '/diagnostics', '/bookings', '/notifications']) assert.ok(links.includes(href));
});

test('isActivePath matches exact and nested pages but not sibling portals', () => {
  assert.equal(nav.isActivePath('/dashboard/admin', '/dashboard/admin'), true);
  assert.equal(nav.isActivePath('/dashboard/admin/audit', '/dashboard/admin'), false);
  assert.equal(nav.isActivePath('/dashboard/admin/audit', '/dashboard/admin/audit'), true);
  assert.equal(nav.isActivePath('/dashboard/assistant', '/dashboard'), false);
  assert.equal(nav.isActivePath('/dashboard', '/dashboard'), true);
});
