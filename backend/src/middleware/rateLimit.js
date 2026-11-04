const rateLimit = require('express-rate-limit');
const env = require('../config/env');

/** Build a JSON-speaking limiter; disabled in the test environment unless forced. */
function makeLimiter({ windowMs, max, message, force = false, skipSuccessfulRequests = false }) {
  if ((env.nodeEnv === 'test' || process.env.NODE_ENV === 'test') && !force) return (_req, _res, next) => next();
  return rateLimit({
    windowMs,
    limit: max,
    skipSuccessfulRequests,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, message: message || 'Too many requests, please try again later' },
  });
}

const apiLimiter = makeLimiter({ windowMs: 60 * 1000, max: 300 });
const authLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  skipSuccessfulRequests: true, // only failed sign-ins / invalid attempts count
  message: 'Too many authentication attempts, please try again in a few minutes',
});

module.exports = { makeLimiter, apiLimiter, authLimiter };
