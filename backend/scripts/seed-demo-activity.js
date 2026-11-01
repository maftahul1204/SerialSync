/**
 * Demo activity seed: realistic bookings, queue, family members, lab orders with signed reports and
 * results, notifications, audit log and doctor verification documents, so every screen has data.
 * Idempotent: it removes the previous demo records for the demo accounts and recreates them.
 * Called from seed-test-users.js after the accounts, chambers and schedules exist.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { User } = require('../src/models/User');
const { Chamber } = require('../src/models/Chamber');
const { DoctorSchedule } = require('../src/models/DoctorSchedule');
const { SlotBooking } = require('../src/models/SlotBooking');
const { QueueSession } = require('../src/models/QueueSession');
const { WalkInEntry } = require('../src/models/WalkInEntry');
const { FamilyMember } = require('../src/models/FamilyMember');
const { Notification } = require('../src/models/Notification');
const { AuditLog } = require('../src/models/AuditLog');
const { DiagnosticOrder } = require('../src/models/DiagnosticOrder');
const { DiagnosticTest } = require('../src/models/DiagnosticTest');
const { DiagnosticCenter } = require('../src/models/DiagnosticCenter');
const { PACKAGES } = require('../src/utils/diagnosticPackages');
const env = require('../src/config/env');

/* ---------------- small helpers ---------------- */
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function dayOffset(n) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}
const dateOf = (n) => ymd(dayOffset(n));
const at = (n, hour = 9, minute = 0) => {
  const d = dayOffset(n);
  d.setHours(hour, minute, 0, 0);
  return d;
};
const code = () => `SS-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

/** Minimal valid one-page PDF with a few text lines. */
function makePdf(lines) {
  const esc = (s) => s.replace(/[\\()]/g, '\\$&');
  const text = lines.map((l, i) => `BT /F1 ${i === 0 ? 16 : 11} Tf 56 ${780 - i * 22} Td (${esc(l)}) Tj ET`).join('\n');
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(text)} >>\nstream\n${text}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let out = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(Buffer.byteLength(out));
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out);
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out, 'latin1');
}

/** Solid-colour PNG (used as a stand-in for scanned ID / photo). */
function makePng(w, h, [r, g, b]) {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf) => {
    let c = 0xffffffff;
    for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: w }).flatMap(() => [r, g, b]))]);
  const raw = Buffer.concat(Array.from({ length: h }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

async function insert(Model, doc) {
  // keep explicit createdAt so history looks lived-in
  return new Model(doc).save({ timestamps: false });
}

/* ---------------- demo definitions ---------------- */
const DEMO_PATIENTS = ['patient@serialsync.test', 'patient.sara@serialsync.test', 'patient.imran@serialsync.test', 'patient.nadia@serialsync.test'];
const DEMO_DOCTORS = [
  'doctor.nusrat@serialsync.test',
  'doctor.tanveer@serialsync.test',
  'doctor.sultana@serialsync.test',
  'doctor.pending@serialsync.test',
  'doctor.farhan@serialsync.test',
  'doctor.rafiq@serialsync.test',
];

const DOC_FILES = {
  bmdcCertificate: { label: 'BMDC registration certificate', ext: '.pdf', mime: 'application/pdf' },
  medicalDegree: { label: 'Medical degree certificate', ext: '.pdf', mime: 'application/pdf' },
  nationalId: { label: 'National ID', ext: '.png', mime: 'image/png', color: [226, 232, 240] },
  profilePhoto: { label: 'Professional photo', ext: '.png', mime: 'image/png', color: [56, 189, 248] },
};

function seedDoctorDocuments(doctor, types) {
  const dir = path.join(env.doctorDocsDir, doctor._id.toString());
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const docs = [];
  for (const type of types) {
    const spec = DOC_FILES[type];
    const fileName = `${type}-${crypto.randomBytes(5).toString('hex')}${spec.ext}`;
    const buffer =
      spec.ext === '.pdf'
        ? makePdf([`${spec.label.toUpperCase()}`, `Name: ${doctor.fullName}`, `BMDC No: ${doctor.doctorProfile?.bmdcNumber || 'N/A'}`, 'Demo document generated by the SerialSync seed script.'])
        : makePng(320, 200, spec.color);
    fs.writeFileSync(path.join(dir, fileName), buffer);
    docs.push({
      type,
      originalName: `${doctor.fullName.replace(/[^A-Za-z]+/g, '-').toLowerCase()}-${type}${spec.ext}`,
      fileName,
      mimeType: spec.mime,
      size: buffer.length,
      uploadedAt: at(-12),
    });
  }
  return docs;
}

const RESULT_SETS = [
  // [days ago, results]
  [
    42,
    [
      { code: 'FBS', name: 'Fasting Blood Sugar', value: 7.4, unit: 'mmol/L', refLow: 3.9, refHigh: 5.6 },
      { code: 'CBC', name: 'Haemoglobin', value: 12.6, unit: 'g/dL', refLow: 12, refHigh: 16 },
      { code: 'LIPID', name: 'Total Cholesterol', value: 228, unit: 'mg/dL', refLow: 0, refHigh: 200 },
    ],
  ],
  [
    21,
    [
      { code: 'FBS', name: 'Fasting Blood Sugar', value: 6.5, unit: 'mmol/L', refLow: 3.9, refHigh: 5.6 },
      { code: 'CBC', name: 'Haemoglobin', value: 13.4, unit: 'g/dL', refLow: 12, refHigh: 16 },
      { code: 'LIPID', name: 'Total Cholesterol', value: 205, unit: 'mg/dL', refLow: 0, refHigh: 200 },
      { code: 'HBA1C', name: 'HbA1c', value: 6.8, unit: '%', refLow: 4, refHigh: 5.7 },
    ],
  ],
  [
    6,
    [
      { code: 'FBS', name: 'Fasting Blood Sugar', value: 5.6, unit: 'mmol/L', refLow: 3.9, refHigh: 5.6 },
      { code: 'CBC', name: 'Haemoglobin', value: 13.9, unit: 'g/dL', refLow: 12, refHigh: 16 },
      { code: 'LIPID', name: 'Total Cholesterol', value: 188, unit: 'mg/dL', refLow: 0, refHigh: 200 },
      { code: 'HBA1C', name: 'HbA1c', value: 6.1, unit: '%', refLow: 4, refHigh: 5.7 },
      { code: 'TSH', name: 'TSH', value: 2.4, unit: 'mIU/L', refLow: 0.4, refHigh: 4.0 },
    ],
  ],
];

function flagFor(r) {
  if (r.refLow !== undefined && r.value < r.refLow) return 'low';
  if (r.refHigh !== undefined && r.value > r.refHigh) return 'high';
  return 'normal';
}

const STATUS_FLOW = ['pending_dispatch', 'assigned', 'en_route', 'sample_collected', 'lab_received', 'under_analysis', 'completed'];
const STATUS_NOTE = {
  pending_dispatch: 'Order placed',
  assigned: 'Phlebotomist assigned',
  en_route: 'Phlebotomist is on the way',
  sample_collected: 'Sample collected, barcode scanned',
  lab_received: 'Specimen received at the lab',
  under_analysis: 'Analysis in progress',
  completed: 'Signed report uploaded',
};

/** Diagnostic centers a patient can choose between (different prices, hours, availability). */
const CENTER_SPECS = [
  { name: 'Popular Diagnostic Centre — Dhanmondi', area: 'Dhanmondi', address: 'House 16, Road 2, Dhanmondi', phone: '09666-701701', accreditation: 'ISO 15189 accredited', rating: 4.8, reviewsCount: 1240, openFrom: '07:00', openTo: '22:00', openDays: [0, 1, 2, 3, 4, 5, 6], turnaroundHours: 24, collectionFee: 100, freeCollectionAbove: 1500, factor: 1.0 },
  { name: 'LabAid Specialized Hospital Lab', area: 'Dhanmondi', address: 'House 6, Road 4, Dhanmondi', phone: '10606', accreditation: 'CAP accredited', rating: 4.7, reviewsCount: 980, openFrom: '00:00', openTo: '23:59', openDays: [0, 1, 2, 3, 4, 5, 6], turnaroundHours: 12, collectionFee: 150, freeCollectionAbove: 2000, factor: 1.25 },
  { name: 'Green Life Clinical Lab', area: 'Gulshan', address: 'Road 45, Gulshan 2', phone: '01700-110220', accreditation: 'DGHS licensed', rating: 4.5, reviewsCount: 412, openFrom: '08:00', openTo: '20:00', openDays: [6, 0, 1, 2, 3, 4], turnaroundHours: 36, collectionFee: 80, freeCollectionAbove: 1200, factor: 0.85, skip: ['VITD', 'CRP'] },
  { name: 'Praava Health Diagnostics', area: 'Banani', address: 'House 40, Road 11, Banani', phone: '01900-555666', accreditation: 'ISO 15189 accredited', rating: 4.9, reviewsCount: 655, openFrom: '09:00', openTo: '18:00', openDays: [0, 1, 2, 3, 4, 5], turnaroundHours: 8, collectionFee: 200, freeCollectionAbove: 3000, factor: 1.4, acceptingOrders: false },
];

async function seedCenters(testsByCode) {
  const centers = {};
  for (const spec of CENTER_SPECS) {
    const { factor, skip = [], ...data } = spec;
    const prices = Object.values(testsByCode)
      .filter((t) => !skip.includes(t.code))
      .map((t) => ({ code: t.code, price: Math.round((t.price * factor) / 10) * 10 }));
    centers[spec.name] = await DiagnosticCenter.findOneAndUpdate({ name: spec.name }, { ...data, prices, isActive: true, acceptingOrders: spec.acceptingOrders !== false, homeCollection: true }, { upsert: true, new: true, setDefaultsOnInsert: true });
  }
  return centers;
}

/* ---------------- main ---------------- */
async function seedDemoActivity() {
  const byEmail = async (email) => User.findOne({ email });
  const patients = {};
  for (const e of DEMO_PATIENTS) patients[e] = await byEmail(e);
  const doctors = {};
  for (const e of DEMO_DOCTORS) doctors[e] = await byEmail(e);
  const admin = await byEmail('admin@serialsync.test');
  const assistant = await byEmail('clinic@serialsync.test');
  const collector = await byEmail('collector@serialsync.test');
  const adil = patients['patient@serialsync.test'];
  const nusrat = doctors['doctor.nusrat@serialsync.test'];
  const tanveer = doctors['doctor.tanveer@serialsync.test'];
  const sultana = doctors['doctor.sultana@serialsync.test'];
  if (!adil || !nusrat || !tanveer || !admin) {
    console.log('Demo activity skipped (base accounts missing).');
    return { skipped: true };
  }

  const demoUserIds = [...Object.values(patients), ...Object.values(doctors), admin, assistant, collector].filter(Boolean).map((u) => u._id);
  const patientIds = Object.values(patients).filter(Boolean).map((u) => u._id);
  const doctorIds = Object.values(doctors).filter(Boolean).map((u) => u._id);

  /* ---- wipe previous demo data ---- */
  const oldOrders = await DiagnosticOrder.find({ patient: { $in: patientIds } });
  for (const o of oldOrders) {
    if (o.reportFileName) fs.rmSync(path.join(env.reportsStorageDir, o.reportFileName), { force: true });
  }
  const sessions = await QueueSession.find({ doctor: { $in: doctorIds } }).select('_id');
  await Promise.all([
    SlotBooking.deleteMany({ $or: [{ patient: { $in: patientIds } }, { doctor: { $in: doctorIds } }] }),
    WalkInEntry.deleteMany({ session: { $in: sessions.map((s) => s._id) } }),
    QueueSession.deleteMany({ doctor: { $in: doctorIds } }),
    FamilyMember.deleteMany({ owner: { $in: patientIds } }),
    Notification.deleteMany({ user: { $in: demoUserIds } }),
    DiagnosticOrder.deleteMany({ patient: { $in: patientIds } }),
    AuditLog.deleteMany({ 'meta.demo': true }),
  ]);

  /* ---- doctor profiles + verification documents ---- */
  const bmdc = { nusrat: 'A-48211', tanveer: 'A-39107', sultana: 'A-51733', pending: 'A-60458', farhan: 'A-61290', rafiq: 'A-22914' };
  const profileExtra = {
    'doctor.nusrat@serialsync.test': { bmdcNumber: bmdc.nusrat, degrees: 'MBBS, FCPS (Cardiology), MD', experienceYears: 14 },
    'doctor.tanveer@serialsync.test': { bmdcNumber: bmdc.tanveer, degrees: 'MBBS, FRCS (General Surgery)', experienceYears: 11 },
    'doctor.sultana@serialsync.test': { bmdcNumber: bmdc.sultana, degrees: 'MBBS, DCH, MD (Paediatrics)', experienceYears: 9 },
    'doctor.pending@serialsync.test': { bmdcNumber: bmdc.pending, degrees: 'MBBS', experienceYears: 3 },
    'doctor.farhan@serialsync.test': { bmdcNumber: bmdc.farhan, degrees: 'MBBS, BCS (Health)', experienceYears: 5 },
    'doctor.rafiq@serialsync.test': { bmdcNumber: bmdc.rafiq, degrees: 'MBBS', experienceYears: 2 },
  };
  for (const [email, extra] of Object.entries(profileExtra)) {
    const d = doctors[email];
    if (!d) continue;
    d.doctorProfile = { ...(d.doctorProfile?.toObject?.() || d.doctorProfile || {}), ...extra };
    const types = email === 'doctor.rafiq@serialsync.test' ? ['bmdcCertificate', 'nationalId'] : ['bmdcCertificate', 'medicalDegree', 'nationalId', 'profilePhoto'];
    d.doctorDocuments = seedDoctorDocuments(d, types);
    if (email === 'doctor.rafiq@serialsync.test') {
      d.doctorApprovalStatus = 'rejected';
      d.doctorApprovalNote = 'The medical degree certificate is missing and the BMDC number could not be verified. Please upload both and resubmit.';
    }
    await d.save();
  }

  /* ---- chambers / schedules for the third approved doctor ---- */
  let sultanaChamber = null;
  let sultanaSchedule = null;
  if (sultana) {
    sultanaChamber =
      (await Chamber.findOne({ doctor: sultana._id, name: 'Green Life Children Clinic' })) ||
      (await Chamber.create({ doctor: sultana._id, name: 'Green Life Children Clinic', area: 'Gulshan', city: 'Dhaka', address: 'House 8, Road 45', phone: sultana.phone }));
    sultanaSchedule =
      (await DoctorSchedule.findOne({ doctor: sultana._id, chamber: sultanaChamber._id })) ||
      (await DoctorSchedule.create({ doctor: sultana._id, chamber: sultanaChamber._id, daysOfWeek: [0, 1, 2, 3, 4], startTime: '16:00', endTime: '20:00', slotDurationMinutes: 20, consultationFee: 1000, patientsPerSlot: 5, status: 'active' }));
  }
  const nusratChamber = await Chamber.findOne({ doctor: nusrat._id });
  const nusratSchedule = await DoctorSchedule.findOne({ doctor: nusrat._id, chamber: nusratChamber._id });
  const tanveerChamber = await Chamber.findOne({ doctor: tanveer._id });
  const tanveerSchedule = await DoctorSchedule.findOne({ doctor: tanveer._id, chamber: tanveerChamber._id });
  // a doctor-cancelled chamber day, shown in the schedule portal (matches the cancelled booking below)
  tanveerSchedule.closedDates = [{ date: dateOf(12), reason: 'Attending the National Surgery Conference' }];
  await tanveerSchedule.save();

  /* ---- family members ---- */
  const fam = {};
  for (const m of [
    { key: 'mother', fullName: 'Rahima Begum', relation: 'parent', gender: 'female', age: 62, bloodGroup: 'B+', phone: '01711000001' },
    { key: 'son', fullName: 'Zayan Rahman', relation: 'child', gender: 'male', age: 7, bloodGroup: 'O+' },
    { key: 'wife', fullName: 'Nusrat Rahman', relation: 'spouse', gender: 'female', age: 32, bloodGroup: 'A+', phone: '01711000003' },
  ]) {
    fam[m.key] = await insert(FamilyMember, { owner: adil._id, ...m, createdAt: at(-30), updatedAt: at(-30) });
  }
  await insert(FamilyMember, { owner: patients['patient.sara@serialsync.test']._id, fullName: 'Kabir Khan', relation: 'child', gender: 'male', age: 4, createdAt: at(-10), updatedAt: at(-10) });

  /* ---- bookings ---- */
  const counters = new Map();
  const nextSerial = (doctor, date) => {
    const k = `${doctor._id}|${date}`;
    counters.set(k, (counters.get(k) || 0) + 1);
    return counters.get(k);
  };
  const booked = [];
  async function book({ patient, doctor, chamber, schedule, day, start, end, status = 'confirmed', family, note, cancelledBy, cancelReason, serial }) {
    const date = dateOf(day);
    const row = await insert(SlotBooking, {
      doctor: doctor._id,
      schedule: schedule._id,
      chamber: chamber._id,
      date,
      slotStart: start,
      slotEnd: end,
      patient: patient._id,
      serialNumber: serial || nextSerial(doctor, date),
      status,
      confirmationCode: code(),
      patientNote: note || '',
      familyMember: family ? family._id : null,
      bookedForName: family ? family.fullName : '',
      cancelledBy,
      cancelReason: cancelReason || '',
      cancelledAt: cancelledBy ? at(day < 0 ? day - 1 : 0, 8) : undefined,
      createdAt: at(Math.min(day, 0) - 2, 10),
      updatedAt: at(Math.min(day, 0) - 1, 10),
    });
    booked.push(row);
    return row;
  }

  const sara = patients['patient.sara@serialsync.test'];
  const imran = patients['patient.imran@serialsync.test'];
  const nadia = patients['patient.nadia@serialsync.test'];

  // history
  await book({ patient: adil, doctor: nusrat, chamber: nusratChamber, schedule: nusratSchedule, day: -14, start: '09:15', end: '09:30', status: 'completed', note: 'Chest tightness after exercise' });
  await book({ patient: adil, doctor: nusrat, chamber: nusratChamber, schedule: nusratSchedule, day: -4, start: '10:00', end: '10:15', status: 'completed', note: 'Follow-up ECG review' });
  await book({ patient: adil, doctor: tanveer, chamber: tanveerChamber, schedule: tanveerSchedule, day: -9, start: '14:40', end: '15:00', status: 'completed', family: fam.mother, note: 'Gallbladder pain' });
  await book({ patient: adil, doctor: nusrat, chamber: nusratChamber, schedule: nusratSchedule, day: -2, start: '11:30', end: '11:45', status: 'no_show', family: fam.son });
  // cancelled examples
  await book({ patient: adil, doctor: nusrat, chamber: nusratChamber, schedule: nusratSchedule, day: -6, start: '12:00', end: '12:15', status: 'cancelled', cancelledBy: 'patient', cancelReason: 'Feeling better, will book again if needed' });
  const docCancelled = await book({ patient: adil, doctor: tanveer, chamber: tanveerChamber, schedule: tanveerSchedule, day: 12, start: '14:20', end: '14:40', status: 'cancelled', cancelledBy: 'doctor', cancelReason: 'Attending the National Surgery Conference' });

  // today's queue at Dr Nusrat (Adil is #5)
  const todayRows = [];
  const todayPlan = [
    [sara, '09:00', 'completed'],
    [imran, '09:15', 'completed'],
    [nadia, '09:30', 'confirmed'], // being served
    [sara, '09:45', 'confirmed'],
    [adil, '10:00', 'confirmed'],
    [imran, '10:15', 'confirmed'],
    [nadia, '10:30', 'confirmed'],
    [sara, '10:45', 'booked'],
  ];
  for (const [patient, start, status] of todayPlan) {
    const [h, m] = start.split(':').map(Number);
    const end = `${pad(m + 15 >= 60 ? h + 1 : h)}:${pad((m + 15) % 60)}`;
    todayRows.push(await book({ patient, doctor: nusrat, chamber: nusratChamber, schedule: nusratSchedule, day: 0, start, end, status }));
  }
  const adilToday = todayRows[4];
  // upcoming
  const upcoming = [
    { patient: adil, doctor: nusrat, chamber: nusratChamber, schedule: nusratSchedule, day: 3, start: '09:30', end: '09:45', family: fam.mother, note: 'Blood pressure check for mother' },
    { patient: adil, doctor: tanveer, chamber: tanveerChamber, schedule: tanveerSchedule, day: 6, start: '15:00', end: '15:20', note: 'Review after surgery consult' },
    { patient: sara, doctor: nusrat, chamber: nusratChamber, schedule: nusratSchedule, day: 1, start: '09:00', end: '09:15' },
    { patient: imran, doctor: nusrat, chamber: nusratChamber, schedule: nusratSchedule, day: 1, start: '09:15', end: '09:30' },
    { patient: nadia, doctor: tanveer, chamber: tanveerChamber, schedule: tanveerSchedule, day: 1, start: '14:00', end: '14:20' },
  ];
  if (sultana) {
    upcoming.push({ patient: sara, doctor: sultana, chamber: sultanaChamber, schedule: sultanaSchedule, day: 2, start: '16:00', end: '16:20', family: null, note: 'Child vaccination' });
    upcoming.push({ patient: adil, doctor: sultana, chamber: sultanaChamber, schedule: sultanaSchedule, day: 4, start: '16:20', end: '16:40', family: fam.son, note: 'Fever and cough, 3 days' });
  }
  for (const u of upcoming) await book(u);
  await book({ patient: sara, doctor: nusrat, chamber: nusratChamber, schedule: nusratSchedule, day: -3, start: '11:00', end: '11:15', status: 'completed' });

  /* ---- live queue for today at Dr Nusrat ---- */
  const session = await insert(QueueSession, {
    doctor: nusrat._id,
    chamber: nusratChamber._id,
    date: dateOf(0),
    status: 'active',
    servingIndex: 2, // items: #1,#2,#3 (serving),#4,#5,#5B walk-in,#6 ...
    delayMinutes: 10,
    delayReason: 'Emergency cath-lab consult',
    createdAt: at(0, 8, 45),
    updatedAt: at(0, 9, 40),
  });
  await insert(WalkInEntry, { session: session._id, afterSerial: 2, subSuffix: 'B', displayLabel: '2B', patientName: 'Mr. Alam (chest pain)', priority: 'emergency', reason: 'Severe chest pain, arrived by rickshaw', status: 'completed', createdAt: at(0, 9, 20), updatedAt: at(0, 9, 28) });
  await insert(WalkInEntry, { session: session._id, afterSerial: 5, subSuffix: 'B', displayLabel: '5B', patientName: 'Ms. Parveen', priority: 'urgent', reason: 'Palpitations', status: 'waiting', createdAt: at(0, 9, 35), updatedAt: at(0, 9, 35) });

  /* ---- diagnostic orders ---- */
  fs.mkdirSync(env.reportsStorageDir, { recursive: true });
  const tests = {};
  for (const t of await DiagnosticTest.find({})) tests[t.code] = t;
  const centers = await seedCenters(tests);
  const C = (needle) => Object.values(centers).find((c) => c.name.includes(needle));
  const orders = [];
  async function makeOrder({ patient, center, codes, address, phone, daysAgo, status, packageName, barcodeId, eta, note, results, shared = [] }) {
    const date = dateOf(-daysAgo);
    const pkg = packageName ? PACKAGES.find((p) => p.name === packageName) : null;
    const lines = codes.filter((c) => center.priceFor(c) !== null).map((c) => ({ testId: tests[c]._id, code: c, name: tests[c].name, price: center.priceFor(c) }));
    const subtotal = lines.reduce((sum, l) => sum + l.price, 0);
    const discount = pkg ? Math.round((subtotal * pkg.discountPercent) / 100) : 0;
    const collectionFee = subtotal - discount >= center.freeCollectionAbove ? 0 : center.collectionFee;
    const history = [];
    const upto = STATUS_FLOW.indexOf(status);
    STATUS_FLOW.slice(0, upto + 1).forEach((st, i) => history.push({ status: st, at: new Date(at(-daysAgo, 7, 30).getTime() + i * 55 * 60000), note: st === 'pending_dispatch' ? `Order placed with ${center.name}` : STATUS_NOTE[st] }));
    const order = new DiagnosticOrder({
      patient: patient._id,
      center: center._id,
      centerName: center.name,
      centerArea: center.area,
      centerPhone: center.phone,
      phlebotomist: collector?._id,
      tests: lines,
      packageName: packageName || '',
      address,
      contactPhone: phone,
      preferredDate: date,
      timeSlot: '08:00-10:00',
      status,
      barcodeId: barcodeId || '',
      subtotal,
      discount,
      collectionFee,
      totalAmount: subtotal - discount + collectionFee,
      etaMinutes: eta,
      collectionNote: note || '',
      sharedDoctorIds: shared,
      statusHistory: history,
      createdAt: at(-daysAgo, 7, 30),
      updatedAt: at(-daysAgo, 12, 0),
    });
    if (results) {
      const withFlags = results.map((r) => ({ ...r, flag: flagFor(r) }));
      order.results = withFlags;
      order.criticalFlags = withFlags.filter((r) => r.flag !== 'normal').map((r) => `${r.name}: ${r.flag}`);
      order.reportedAt = at(-daysAgo + 1, 17, 30);
      const pdf = makePdf([
        'SERIALSYNC DIAGNOSTIC REPORT',
        `Center: ${center.name}`,
        `Patient: ${patient.fullName}`,
        `Order: ${order._id.toString().slice(-6).toUpperCase()}  Date: ${date}`,
        ...withFlags.map((r) => `${r.name}: ${r.value} ${r.unit}  (ref ${r.refLow ?? '-'}-${r.refHigh ?? '-'})  ${r.flag.toUpperCase()}`),
        'Digitally signed by the laboratory (demo).',
      ]);
      const fileName = `${order._id.toString()}-${Date.now()}.pdf`;
      fs.writeFileSync(path.join(env.reportsStorageDir, fileName), pdf);
      order.reportFileName = fileName;
      order.reportSha256 = crypto.createHash('sha256').update(pdf).digest('hex');
    }
    await order.save({ timestamps: false });
    orders.push(order);
    return order;
  }
  const [r1, r2, r3] = RESULT_SETS;
  await makeOrder({ patient: adil, center: C('Popular'), codes: ['FBS', 'CBC', 'LIPID'], address: 'House 42, Road 7/A, Dhanmondi, Dhaka', phone: adil.phone, daysAgo: r1[0], status: 'completed', results: r1[1] });
  await makeOrder({ patient: adil, center: C('Green Life'), codes: ['FBS', 'CBC', 'LIPID', 'HBA1C'], address: 'House 42, Road 7/A, Dhanmondi, Dhaka', phone: adil.phone, daysAgo: r2[0], status: 'completed', packageName: 'Diabetic Profile', results: r2[1] });
  const shared = await makeOrder({ patient: adil, center: C('LabAid'), codes: ['FBS', 'CBC', 'LIPID', 'HBA1C', 'TSH'], address: 'House 42, Road 7/A, Dhanmondi, Dhaka', phone: adil.phone, daysAgo: r3[0], status: 'completed', packageName: 'Executive Health Check', results: r3[1], shared: [nusrat._id] });
  await makeOrder({ patient: adil, center: C('Popular'), codes: ['LFT', 'KFT'], address: 'House 42, Road 7/A, Dhanmondi, Dhaka', phone: adil.phone, daysAgo: 0, status: 'en_route', eta: 25 });
  await makeOrder({ patient: sara, center: C('Green Life'), codes: ['CBC', 'URINE'], address: 'Flat 5B, Gulshan Avenue, Dhaka', phone: sara.phone, daysAgo: 0, status: 'sample_collected', barcodeId: 'BC-DEMO1A', note: 'Collected at 08:35, cold chain OK' });
  await makeOrder({ patient: imran, center: C('LabAid'), codes: ['FBS', 'HBA1C'], address: 'House 9, Mirpur DOHS, Dhaka', phone: imran.phone, daysAgo: 1, status: 'lab_received', barcodeId: 'BC-DEMO2B' });
  await makeOrder({ patient: nadia, center: C('Popular'), codes: ['TSH'], address: 'Road 12, Uttara Sector 4, Dhaka', phone: nadia.phone, daysAgo: 0, status: 'assigned', eta: 45 });
  await makeOrder({ patient: nadia, center: C('Green Life'), codes: ['LIPID', 'FBS'], address: 'Road 12, Uttara Sector 4, Dhaka', phone: nadia.phone, daysAgo: 2, status: 'under_analysis', barcodeId: 'BC-DEMO3C' });

  /* ---- notifications ---- */
  const n = (user, type, title, body, link, ago, { read = false, sms = false } = {}) =>
    insert(Notification, { user: user._id, type, title, body, link, readAt: read ? at(-ago + 0, 11) : null, smsStatus: sms ? 'sent' : 'none', createdAt: at(-Math.floor(ago), 8 + ((ago * 7) % 9)), updatedAt: at(-Math.floor(ago), 9) });
  await n(adil, 'booking_confirmed', 'Serial #5 confirmed', `Dr. Nusrat Jahan today at 10:00. Code ${adilToday.confirmationCode}.`, `/bookings/${adilToday._id}`, 0, { sms: true });
  await n(adil, 'queue_turn_soon', 'Your turn is coming up', 'Serial #5 is 2 places away. Please be at the chamber.', '/queue', 0, { sms: true });
  await n(adil, 'queue_delay', 'Doctor delayed by 10 min', 'Emergency cath-lab consult. Serial #5: please plan accordingly.', '/queue', 0);
  await n(adil, 'booking_cancelled', `Serial #1 on ${dateOf(12)} was cancelled`, `Dr. Tanveer Masud cancelled: Attending the National Surgery Conference. Next available: ${dateOf(13)} 14:00 at Popular Diagnostic Centre.`, `/doctors/${tanveer._id}/schedule`, 1, { sms: true });
  await n(adil, 'report_ready', 'Your lab report is ready', 'Signed PDF available in Reports.', '/reports', 5, { read: true, sms: true });
  await n(adil, 'order_update', 'Sample order: en route', 'Your home collection order was updated. Phlebotomist ETA 25 min.', '/reports', 0, { sms: true });
  await n(adil, 'booking_confirmed', 'Serial confirmed for Rahima Begum', `Dr. Nusrat Jahan on ${dateOf(3)} at 09:30.`, '/bookings', 3, { read: true });
  await n(adil, 'system', 'Welcome to SerialSync', 'Add family members to book for them, and track your lab trends in Reports.', '/family', 30, { read: true });
  await n(nusrat, 'system', 'New serial booked', 'Serial #5 today at 10:00.', '/dashboard', 0);
  await n(nusrat, 'system', 'A patient shared a lab report with you', `Order ${shared._id.toString().slice(-6).toUpperCase()}`, '/dashboard', 5);
  await n(nusrat, 'booking_cancelled', 'Serial #1 cancelled by the patient', `${dateOf(-6)} at 12:00 is open again. Reason: Feeling better`, '/dashboard', 6, { read: true });
  await n(tanveer, 'system', 'New serial booked', `Serial #1 on ${dateOf(6)} at 15:00.`, '/dashboard', 1);
  await n(admin, 'system', 'Doctor registration waiting', 'Dr. Pending Review submitted BMDC documents.', '/dashboard/admin', 1);
  await n(admin, 'system', 'Doctor registration waiting', 'Dr. Farhan Ahmed submitted BMDC documents.', '/dashboard/admin', 0);
  if (collector) await n(collector, 'order_update', 'New home collection assigned', 'House 42, Dhanmondi. Fasting draw, 08:00-10:00.', '/dashboard/collections', 0);
  if (assistant) await n(assistant, 'system', 'Queue session is live', "Dr. Nusrat Jahan's chamber has 8 serials today.", '/dashboard/assistant', 0);
  await n(sara, 'booking_confirmed', 'Serial #1 confirmed', `Dr. Nusrat Jahan on ${dateOf(1)} at 09:00.`, '/bookings', 1, { sms: true });
  await n(imran, 'order_update', 'Sample order: lab received', 'Specimen BC-DEMO2B reached the lab.', '/reports', 1);
  await n(nadia, 'order_update', 'Sample order: assigned', 'A phlebotomist is assigned. ETA 45 min.', '/reports', 0);

  /* ---- audit log ---- */
  const audit = (actor, action, targetType, target, meta, ago) =>
    insert(AuditLog, { actor: actor._id, actorEmail: actor.email, action, targetType, targetId: String(target._id), meta: { ...meta, demo: true }, ip: '127.0.0.1', createdAt: at(-ago, 10 + (ago % 6), (ago * 11) % 60) });
  for (const c of Object.values(centers)) await audit(admin, 'center.create', 'DiagnosticCenter', c, { name: c.name }, 50);
  await audit(admin, 'center.update', 'DiagnosticCenter', C('Praava'), { fields: ['acceptingOrders'] }, 3);
  await audit(admin, 'doctor.approved', 'User', nusrat, { email: nusrat.email }, 40);
  await audit(admin, 'doctor.approved', 'User', tanveer, { email: tanveer.email }, 38);
  if (sultana) await audit(admin, 'doctor.approved', 'User', sultana, { email: sultana.email }, 25);
  const rafiq = doctors['doctor.rafiq@serialsync.test'];
  if (rafiq) await audit(admin, 'doctor.rejected', 'User', rafiq, { email: rafiq.email }, 8);
  for (const o of orders.filter((x) => x.reportFileName)) await audit(admin, 'report.upload', 'DiagnosticOrder', o, { sha256: o.reportSha256 }, Math.max(1, Math.round((Date.now() - o.reportedAt.getTime()) / 86400000)));
  for (const t of ['HBA1C', 'LIPID']) if (tests[t]) await audit(admin, 'test.update', 'DiagnosticTest', tests[t], { fields: ['price'] }, 15);
  if (tests.TSH) await audit(admin, 'test.create', 'DiagnosticTest', tests.TSH, { code: 'TSH' }, 60);

  return {
    bookings: await SlotBooking.countDocuments({ patient: { $in: patientIds } }),
    orders: orders.length,
    centers: Object.keys(centers).length,
    notifications: await Notification.countDocuments({ user: { $in: demoUserIds } }),
    audit: await AuditLog.countDocuments({ 'meta.demo': true }),
    family: await FamilyMember.countDocuments({ owner: { $in: patientIds } }),
    docCancelledBooking: docCancelled._id.toString(),
  };
}

module.exports = { seedDemoActivity, DEMO_PATIENTS, DEMO_DOCTORS };
