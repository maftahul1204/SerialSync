const path = require('path');
const os = require('os');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const env = {
  // 5000 is often taken by macOS AirPlay Receiver; use 5050 locally unless PORT is set.
  port: Number(process.env.PORT) || 5050,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/serialsync',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-change-in-production',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  nodeEnv: process.env.NODE_ENV || 'development',
  redisUrl: process.env.REDIS_URL || '',
  reportHmacSecret: process.env.REPORT_HMAC_SECRET || process.env.JWT_SECRET || 'dev-report-hmac',
  smsProvider: process.env.SMS_PROVIDER || 'console',
  smsApiUrl: process.env.SMS_API_URL || '',
  smsApiKey: process.env.SMS_API_KEY || '',
  smsSenderId: process.env.SMS_SENDER_ID || 'SerialSync',
  trustProxy: process.env.TRUST_PROXY === 'true',
  doctorDocsDir:
    process.env.DOCTOR_DOCS_DIR ||
    (process.env.NODE_ENV === 'test'
      ? path.join(os.tmpdir(), 'serialsync-test-doctor-docs')
      : path.join(__dirname, '../../storage/doctor-documents')),
  reportsStorageDir: process.env.REPORTS_STORAGE_DIR || path.join(__dirname, '../../storage/reports'),
};

if (env.nodeEnv === 'production' && env.jwtSecret === 'dev-only-change-in-production') {
  throw new Error('JWT_SECRET must be set in production');
}

module.exports = env;
