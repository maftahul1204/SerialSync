/**
 * Dev database seed — test users, chambers, and schedules; writes docs/TEST_LOGIN_ACCOUNTS.txt
 * Run: npm run seed:test-users (from backend/)
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { User } = require('../src/models/User');
const { Chamber } = require('../src/models/Chamber');
const { DoctorSchedule } = require('../src/models/DoctorSchedule');
const { DiagnosticTest } = require('../src/models/DiagnosticTest');
const env = require('../src/config/env');
const { seedDemoActivity } = require('./seed-demo-activity');

const DIAGNOSTIC_TESTS = [
  { code: 'CBC', name: 'Complete Blood Count (CBC)', category: 'Hematology', price: 450, tubeType: 'EDTA', fastingRequired: false },
  { code: 'FBS', name: 'Fasting Blood Sugar', category: 'Biochemistry', price: 250, fastingRequired: true, preparation: '8–12 hours fasting' },
  { code: 'HBA1C', name: 'HbA1c (Glycated Hemoglobin)', category: 'Biochemistry', price: 900, fastingRequired: false },
  { code: 'LIPID', name: 'Lipid Profile', category: 'Biochemistry', price: 1200, fastingRequired: true, preparation: '12 hours fasting' },
  { code: 'LFT', name: 'Liver Function Test', category: 'Biochemistry', price: 1100, fastingRequired: false },
  { code: 'KFT', name: 'Kidney Function Test', category: 'Biochemistry', price: 1000, fastingRequired: false },
  { code: 'TSH', name: 'Thyroid Stimulating Hormone (TSH)', category: 'Hormone', price: 850, fastingRequired: false },
  { code: 'VITD', name: 'Vitamin D (25-OH)', category: 'Vitamins', price: 1500, fastingRequired: false },
  { code: 'CRP', name: 'C-Reactive Protein (CRP)', category: 'Immunology', price: 700, fastingRequired: false },
  { code: 'ESR', name: 'Erythrocyte Sedimentation Rate', category: 'Hematology', price: 250, fastingRequired: false },
  { code: 'URINE', name: 'Routine Urine Analysis', category: 'Pathology', price: 300, tubeType: 'Sterile cup', fastingRequired: false },
];

const PASSWORD = 'TestPass123!';

const ACCOUNTS = [
  {
    label: 'Administrator',
    fullName: 'SerialSync Admin',
    email: 'admin@serialsync.test',
    phone: '01700000001',
    role: 'admin',
  },
  {
    label: 'Patient',
    fullName: 'Adil Rahman',
    email: 'patient@serialsync.test',
    phone: '01700000002',
    role: 'patient',
    patientProfile: { city: 'Dhaka', bloodType: 'O+ Positive', smartPassVerified: true },
  },
  {
    label: 'Doctor (approved)',
    fullName: 'Dr. Nusrat Jahan',
    email: 'doctor.nusrat@serialsync.test',
    phone: '01700000003',
    role: 'doctor',
    doctorApprovalStatus: 'approved',
    doctorProfile: {
      specialtyTitle: 'Cardiologist',
      specialtySlug: 'cardiology',
      affiliations: 'Square Hospital & Green Life',
      roomLabel: 'Room 402',
      rating: 4.9,
      isOnline: true,
    },
  },
  {
    label: 'Doctor (approved)',
    fullName: 'Dr. Tanveer Masud',
    email: 'doctor.tanveer@serialsync.test',
    phone: '01700000004',
    role: 'doctor',
    doctorApprovalStatus: 'approved',
    doctorProfile: {
      specialtyTitle: 'General Surgeon',
      specialtySlug: 'medicine',
      affiliations: 'Popular Diagnostic, Dhanmondi',
      rating: 4.8,
      isOnline: true,
    },
  },
  {
    label: 'Doctor (pending — for admin approval testing)',
    fullName: 'Dr. Pending Review',
    email: 'doctor.pending@serialsync.test',
    phone: '01700000005',
    role: 'doctor',
    doctorApprovalStatus: 'pending',
    doctorProfile: {
      specialtyTitle: 'Physician',
      specialtySlug: 'medicine',
      affiliations: 'New Clinic Uttara',
    },
  },
  {
    label: 'Patient (demo)',
    fullName: 'Sara Khan',
    email: 'patient.sara@serialsync.test',
    phone: '01700000011',
    role: 'patient',
    patientProfile: { city: 'Dhaka', bloodType: 'A+ Positive', smartPassVerified: true },
  },
  {
    label: 'Patient (demo)',
    fullName: 'Imran Hossain',
    email: 'patient.imran@serialsync.test',
    phone: '01700000012',
    role: 'patient',
    patientProfile: { city: 'Dhaka', bloodType: 'B+ Positive', smartPassVerified: true },
  },
  {
    label: 'Patient (demo)',
    fullName: 'Nadia Islam',
    email: 'patient.nadia@serialsync.test',
    phone: '01700000013',
    role: 'patient',
    patientProfile: { city: 'Dhaka', bloodType: 'AB+ Positive', smartPassVerified: true },
  },
  {
    label: 'Doctor (approved, paediatrics)',
    fullName: 'Dr. Sultana Rahman',
    email: 'doctor.sultana@serialsync.test',
    phone: '01700000008',
    role: 'doctor',
    doctorApprovalStatus: 'approved',
    doctorProfile: {
      specialtyTitle: 'Pediatrician',
      specialtySlug: 'pediatrics',
      affiliations: 'Green Life Children Clinic, Gulshan',
      roomLabel: 'Room 12',
      rating: 4.7,
      isOnline: true,
    },
  },
  {
    label: 'Doctor (pending — documents submitted)',
    fullName: 'Dr. Farhan Ahmed',
    email: 'doctor.farhan@serialsync.test',
    phone: '01700000009',
    role: 'doctor',
    doctorApprovalStatus: 'pending',
    doctorProfile: { specialtyTitle: 'Ophthalmologist', specialtySlug: 'ophthalmology', affiliations: 'Eye Care Centre, Mirpur' },
  },
  {
    label: 'Doctor (rejected — can resubmit documents)',
    fullName: 'Dr. Rafiq Mia',
    email: 'doctor.rafiq@serialsync.test',
    phone: '01700000010',
    role: 'doctor',
    doctorApprovalStatus: 'rejected',
    doctorProfile: { specialtyTitle: 'Physician', specialtySlug: 'medicine', affiliations: 'City Clinic, Savar' },
  },
  {
    label: 'Clinic / queue assistant',
    fullName: 'Green Life Clinic Desk',
    email: 'clinic@serialsync.test',
    phone: '01700000006',
    role: 'assistant',
  },
  {
    label: 'Sample collector (phlebotomist)',
    fullName: 'Rahim Collector',
    email: 'collector@serialsync.test',
    phone: '01700000007',
    role: 'phlebotomist',
  },
];

/** Approved doctors get a chamber + weekly schedule for booking demos. */
const DOCTOR_DEMO_SETUP = [
  {
    email: 'doctor.nusrat@serialsync.test',
    chamber: {
      name: 'Square Hospital — Cardiology',
      area: 'Panthapath',
      city: 'Dhaka',
      address: '18/F West Panthapath',
      phone: '01700000003',
    },
    schedule: {
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      startTime: '09:00',
      endTime: '13:00',
      slotDurationMinutes: 15,
      consultationFee: 1500,
      patientsPerSlot: 8,
    },
  },
  {
    email: 'doctor.tanveer@serialsync.test',
    chamber: {
      name: 'Popular Diagnostic Centre',
      area: 'Dhanmondi',
      city: 'Dhaka',
      address: 'House 16, Road 2',
      phone: '01700000004',
    },
    schedule: {
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      startTime: '14:00',
      endTime: '18:00',
      slotDurationMinutes: 20,
      consultationFee: 1200,
      patientsPerSlot: 6,
    },
  },
];

async function upsertAccount(spec) {
  const passwordHash = await User.hashPassword(PASSWORD);
  const existing = await User.findOne({ email: spec.email.toLowerCase() });
  const payload = {
    fullName: spec.fullName,
    phone: spec.phone,
    role: spec.role,
    passwordHash,
    isActive: true,
  };
  if (spec.role === 'patient' && spec.patientProfile) {
    payload.patientProfile = spec.patientProfile;
  }
  if (spec.role === 'doctor') {
    payload.doctorApprovalStatus = spec.doctorApprovalStatus || 'pending';
    if (spec.doctorProfile) payload.doctorProfile = spec.doctorProfile;
  }
  if (existing) {
    Object.assign(existing, payload);
    await existing.save();
    return { ...spec, id: existing._id.toString(), updated: true };
  }
  const user = await User.create({ email: spec.email.toLowerCase(), ...payload });
  return { ...spec, id: user._id.toString(), updated: false };
}

async function upsertChamberAndSchedule(doctorId, { chamber, schedule }) {
  let chamberDoc = await Chamber.findOne({ doctor: doctorId, name: chamber.name });
  if (chamberDoc) {
    Object.assign(chamberDoc, chamber);
    await chamberDoc.save();
  } else {
    chamberDoc = await Chamber.create({ doctor: doctorId, ...chamber });
  }

  let scheduleDoc = await DoctorSchedule.findOne({
    doctor: doctorId,
    chamber: chamberDoc._id,
  });
  const schedulePayload = {
    doctor: doctorId,
    chamber: chamberDoc._id,
    ...schedule,
    status: 'active',
  };
  if (scheduleDoc) {
    Object.assign(scheduleDoc, schedulePayload);
    await scheduleDoc.save();
  } else {
    scheduleDoc = await DoctorSchedule.create(schedulePayload);
  }
  return {
    chamberId: chamberDoc._id.toString(),
    scheduleId: scheduleDoc._id.toString(),
  };
}

async function seedDiagnosticCatalog() {
  let count = 0;
  for (const spec of DIAGNOSTIC_TESTS) {
    await DiagnosticTest.findOneAndUpdate({ code: spec.code }, { ...spec, isActive: true }, { upsert: true });
    count += 1;
  }
  return count;
}

async function seedDoctorDemoData() {
  let count = 0;
  for (const setup of DOCTOR_DEMO_SETUP) {
    const doctor = await User.findOne({
      email: setup.email.toLowerCase(),
      role: 'doctor',
      doctorApprovalStatus: 'approved',
    });
    if (!doctor) continue;
    await upsertChamberAndSchedule(doctor._id, setup);
    count += 1;
  }
  return count;
}

function buildTxt(results) {
  const lines = [
    'SerialSync — test login accounts (local development only)',
    '========================================================',
    '',
    `Default password for all accounts: ${PASSWORD}`,
    '',
    'Frontend: http://localhost:3000/login',
    'API:      http://localhost:5050 (or PORT from backend/.env)',
    '',
    '--- Accounts ---',
    '',
  ];
  for (const r of results) {
    lines.push(`[${r.label}]`);
    lines.push(`  Name:     ${r.fullName}`);
    lines.push(`  Email:    ${r.email}`);
    lines.push(`  Password: ${PASSWORD}`);
    lines.push(`  Role:     ${r.role}`);
    if (r.role === 'doctor') {
      lines.push(`  Approval: ${r.doctorApprovalStatus || 'pending'}`);
      if (r.doctorProfile?.specialtyTitle) {
        lines.push(`  Specialty: ${r.doctorProfile.specialtyTitle}`);
      }
    }
    lines.push('');
  }
  lines.push('Notes:');
  lines.push('- Patients sign in → /home (doctor search).');
  lines.push('- Doctors/admins → /dashboard. Pending doctors cannot use schedule until admin approves.');
  lines.push('- Approve pending doctors at /dashboard/admin (sign in as admin).');
  lines.push('- Clinic = assistant role; Collector = phlebotomist role (dashboard flows in later sprints).');
  lines.push('- Approved doctors Nusrat, Tanveer & Sultana have chambers + active schedules for booking.');
  lines.push('- Demo data: patient@serialsync.test has past/today/upcoming bookings, cancelled-by-doctor and cancelled-by-patient examples,');
  lines.push('  family members, a live queue at Dr. Nusrat today (serial #5), 3 signed lab reports with trend data, a collector order en route,');
  lines.push('  notifications and shared reports. Admin sees pending/rejected doctors with uploaded documents and an audit log.');
  lines.push('- Re-run `npm run seed:test-users` any time: demo records are recreated, never duplicated.');
  lines.push('');
  return lines.join('\n');
}

async function main() {
  await mongoose.connect(env.mongodbUri);
  const results = [];
  for (const spec of ACCOUNTS) {
    results.push(await upsertAccount(spec));
  }
  const txt = buildTxt(results);
  const outPath = path.resolve(__dirname, '../../docs/TEST_LOGIN_ACCOUNTS.txt');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, txt, 'utf8');
  console.log(`Wrote ${outPath}`);
  const created = results.filter((r) => !r.updated).length;
  console.log(`Seeded ${results.length} accounts (${created} new).`);
  const demoDoctors = await seedDoctorDemoData();
  console.log(`Upserted chambers/schedules for ${demoDoctors} approved doctors.`);
  const tests = await seedDiagnosticCatalog();
  console.log(`Upserted ${tests} diagnostic tests in catalog.`);
  const demo = await seedDemoActivity();
  console.log('Demo activity:', JSON.stringify(demo));
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
