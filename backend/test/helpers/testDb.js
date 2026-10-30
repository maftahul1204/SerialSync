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
  const { QueueSession } = require('../../src/models/QueueSession');
  const { WalkInEntry } = require('../../src/models/WalkInEntry');
  const { DiagnosticOrder } = require('../../src/models/DiagnosticOrder');
  const { DiagnosticTest } = require('../../src/models/DiagnosticTest');
  await WalkInEntry.deleteMany({});
  await QueueSession.deleteMany({});
  await DiagnosticOrder.deleteMany({});
  await DiagnosticTest.deleteMany({});
  await SlotBooking.deleteMany({});
  await DoctorSchedule.deleteMany({});
  await Chamber.deleteMany({});
  await User.deleteMany({});
}

async function seedDiagnosticTests() {
  const { DiagnosticTest } = require('../../src/models/DiagnosticTest');
  const count = await DiagnosticTest.countDocuments();
  if (count > 0) return;
  await DiagnosticTest.insertMany([
    { code: 'CBC', name: 'Complete Blood Count', category: 'Hematology', price: 450 },
    { code: 'FBS', name: 'Fasting Blood Sugar', category: 'Biochemistry', price: 200 },
    { code: 'LIPID', name: 'Lipid Profile', category: 'Biochemistry', price: 900 },
  ]);
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

module.exports = {
  connectTestDb,
  clearUsers,
  clearScheduleData,
  disconnectTestDb,
  approveDoctor,
  seedDiagnosticTests,
};
