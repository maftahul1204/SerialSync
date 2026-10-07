require('dotenv').config();

const env = {
  // 5000 is often taken by macOS AirPlay Receiver; use 5050 locally unless PORT is set.
  port: Number(process.env.PORT) || 5050,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/serialsync',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-change-in-production',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  nodeEnv: process.env.NODE_ENV || 'development',
};

if (env.nodeEnv === 'production' && env.jwtSecret === 'dev-only-change-in-production') {
  throw new Error('JWT_SECRET must be set in production');
}

module.exports = env;
