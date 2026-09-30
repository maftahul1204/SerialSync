const jwt = require('jsonwebtoken');
const env = require('../config/env');

const COOKIE_NAME = 'serialsync_token';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, email: user.email },
    env.jwtSecret,
    { expiresIn: '7d' }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

function cookieOptions() {
  const secure = env.nodeEnv === 'production';
  return {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    maxAge: MAX_AGE_MS,
    path: '/',
  };
}

module.exports = { COOKIE_NAME, signAccessToken, verifyAccessToken, cookieOptions };
