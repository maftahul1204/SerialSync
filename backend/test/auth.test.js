const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { connectTestDb, clearUsers, disconnectTestDb } = require('./helpers/testDb');
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
  await clearUsers();
});

function authCookie(res) {
  const setCookie = res.headers['set-cookie'];
  assert.ok(setCookie, 'expected Set-Cookie header');
  const line = setCookie.find((c) => c.startsWith(`${COOKIE_NAME}=`));
  assert.ok(line, 'expected auth cookie');
  return line.split(';')[0];
}

const sampleUser = {
  fullName: 'Test Patient',
  email: 'patient@serialsync.test',
  password: 'password123',
  phone: '01700000000',
};

test('SCRUM-94: user registration creates account and session', async () => {
  const res = await request(app).post('/api/auth/register').send(sampleUser);
  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.user.email, sampleUser.email);
  assert.equal(res.body.user.role, 'patient');
  assert.ok(res.headers['set-cookie']);
});

test('SCRUM-94: registration rejects weak password', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ ...sampleUser, password: 'short' });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

test('SCRUM-96: login returns user and auth cookie', async () => {
  await request(app).post('/api/auth/register').send(sampleUser);
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: sampleUser.email, password: sampleUser.password });
  assert.equal(res.status, 200);
  assert.equal(res.body.user.email, sampleUser.email);
  authCookie(res);
});

test('SCRUM-96: login rejects invalid credentials', async () => {
  await request(app).post('/api/auth/register').send(sampleUser);
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: sampleUser.email, password: 'wrongpassword' });
  assert.equal(res.status, 401);
});

test('SCRUM-98: logout succeeds and protected route requires cookie', async () => {
  const register = await request(app).post('/api/auth/register').send(sampleUser);
  const cookie = authCookie(register);
  const logout = await request(app).post('/api/auth/logout').set('Cookie', cookie);
  assert.equal(logout.status, 200);
  assert.equal(logout.body.success, true);
  const cleared = logout.headers['set-cookie'];
  assert.ok(cleared?.some((c) => c.startsWith(`${COOKIE_NAME}=`)), 'logout should set clear-cookie header');
  const me = await request(app).get('/api/auth/me');
  assert.equal(me.status, 401);
});

test('SCRUM-100: password reset flow', async () => {
  await request(app).post('/api/auth/register').send(sampleUser);
  const forgot = await request(app)
    .post('/api/auth/forgot-password')
    .send({ email: sampleUser.email });
  assert.equal(forgot.status, 200);
  assert.ok(forgot.body.resetToken, 'dev mode exposes reset token');

  const reset = await request(app)
    .post('/api/auth/reset-password')
    .send({ token: forgot.body.resetToken, password: 'newpassword99' });
  assert.equal(reset.status, 200);

  const loginOld = await request(app)
    .post('/api/auth/login')
    .send({ email: sampleUser.email, password: sampleUser.password });
  assert.equal(loginOld.status, 401);

  const loginNew = await request(app)
    .post('/api/auth/login')
    .send({ email: sampleUser.email, password: 'newpassword99' });
  assert.equal(loginNew.status, 200);
});

test('SCRUM-105: RBAC blocks non-admin from admin route', async () => {
  const register = await request(app).post('/api/auth/register').send(sampleUser);
  const cookie = authCookie(register);
  const res = await request(app).get('/api/users/admin/overview').set('Cookie', cookie);
  assert.equal(res.status, 403);
});

test('SCRUM-105: RBAC allows admin role', async () => {
  const register = await request(app)
    .post('/api/auth/register')
    .send({ ...sampleUser, email: 'admin@serialsync.test', role: 'admin' });
  const cookie = authCookie(register);
  const res = await request(app).get('/api/users/admin/overview').set('Cookie', cookie);
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
});

test('SCRUM-107: profile read and update', async () => {
  const register = await request(app).post('/api/auth/register').send(sampleUser);
  const cookie = authCookie(register);

  const getMe = await request(app).get('/api/users/me').set('Cookie', cookie);
  assert.equal(getMe.status, 200);
  assert.equal(getMe.body.user.fullName, sampleUser.fullName);

  const patch = await request(app)
    .patch('/api/users/me')
    .set('Cookie', cookie)
    .send({ fullName: 'Updated Name', phone: '01811111111' });
  assert.equal(patch.status, 200);
  assert.equal(patch.body.user.fullName, 'Updated Name');
  assert.equal(patch.body.user.phone, '01811111111');
});

test('health endpoint is available', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
});
