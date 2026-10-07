/**
 * Local dev only — creates or updates test users and writes docs/TEST_LOGIN_ACCOUNTS.txt
 * Run: node scripts/seed-test-users.js (from backend/)
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { User } = require('../src/models/User');
const env = require('../src/config/env');

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
    lines.push(`  User ID:  ${r.id}`);
    lines.push('');
  }
  lines.push('Notes:');
  lines.push('- Patients sign in → /home (doctor search).');
  lines.push('- Doctors/admins → /dashboard. Pending doctors cannot use schedule until admin approves.');
  lines.push('- Approve pending doctors at /dashboard/admin (sign in as admin).');
  lines.push('- Clinic = assistant role; Collector = phlebotomist role (dashboard flows in later sprints).');
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
  console.log(`Seeded ${results.length} accounts (${results.filter((r) => !r.updated).length} new).`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
