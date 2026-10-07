const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

async function connectTestDb() {
  if (mongoose.connection.readyState === 1) {
    return;
  }
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'serialsync-test-jwt-secret';
  process.env.NODE_ENV = 'test';
  process.env.CLIENT_URL = 'http://localhost:3000';
  await mongoose.connect(process.env.MONGODB_URI);
}

async function clearUsers() {
  const { User } = require('../../src/models/User');
  await User.deleteMany({});
}

async function clearScheduleData() {
  const { User } = require('../../src/models/User');
  const { Chamber } = require('../../src/models/Chamber');
  const { DoctorSchedule } = require('../../src/models/DoctorSchedule');
  const { SlotBooking } = require('../../src/models/SlotBooking');
  await SlotBooking.deleteMany({});
  await DoctorSchedule.deleteMany({});
  await Chamber.deleteMany({});
  await User.deleteMany({});
}

async function disconnectTestDb() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
}

async function approveDoctor(userId) {
  const { User } = require('../../src/models/User');
  await User.findByIdAndUpdate(userId, { doctorApprovalStatus: 'approved' });
}

module.exports = { connectTestDb, clearUsers, clearScheduleData, disconnectTestDb, approveDoctor };
