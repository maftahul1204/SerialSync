const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const env = require('../config/env');

/** Documents a doctor must provide at signup (BMDC verification, SRS FR-28). */
const DOCUMENT_TYPES = [
  { key: 'bmdcCertificate', label: 'BMDC registration certificate', required: true },
  { key: 'medicalDegree', label: 'Medical degree certificate (MBBS / postgraduate)', required: true },
  { key: 'nationalId', label: 'National ID or passport', required: true },
  { key: 'profilePhoto', label: 'Professional photo', required: false },
  { key: 'otherDocument', label: 'Other supporting document', required: false },
];
const DOCUMENT_KEYS = DOCUMENT_TYPES.map((d) => d.key);
const REQUIRED_KEYS = DOCUMENT_TYPES.filter((d) => d.required).map((d) => d.key);
const MAX_FILE_BYTES = 5 * 1024 * 1024;

const ALLOWED = {
  'application/pdf': { ext: '.pdf', magic: (b) => b.slice(0, 4).toString() === '%PDF' },
  'image/jpeg': { ext: '.jpg', magic: (b) => b[0] === 0xff && b[1] === 0xd8 },
  'image/png': { ext: '.png', magic: (b) => b.slice(1, 4).toString() === 'PNG' },
};

function labelFor(type) {
  return DOCUMENT_TYPES.find((d) => d.key === type)?.label || type;
}

/** Returns an error message, or null when the file is an acceptable PDF/JPG/PNG. */
function validateDocumentFile(file) {
  const rule = ALLOWED[file.mimetype];
  if (!rule) return `${file.originalname}: only PDF, JPG or PNG files are allowed`;
  if (file.size > MAX_FILE_BYTES) return `${file.originalname}: file is larger than 5 MB`;
  if (!rule.magic(file.buffer)) return `${file.originalname}: file content does not match its type`;
  return null;
}

function missingRequiredTypes(existingTypes) {
  return REQUIRED_KEYS.filter((k) => !existingTypes.includes(k));
}

function userDir(userId) {
  return path.join(env.doctorDocsDir, String(userId));
}

/** Write uploaded files (already validated) to storage/doctor-documents/<userId>/ and return metadata. */
function saveDocuments(userId, files) {
  const dir = userDir(userId);
  fs.mkdirSync(dir, { recursive: true });
  const saved = [];
  for (const [type, file] of files) {
    const fileName = `${type}-${crypto.randomBytes(6).toString('hex')}${ALLOWED[file.mimetype].ext}`;
    fs.writeFileSync(path.join(dir, fileName), file.buffer);
    saved.push({
      type,
      originalName: path.basename(file.originalname).slice(0, 200),
      fileName,
      mimeType: file.mimetype,
      size: file.size,
    });
  }
  return saved;
}

function removeStoredFile(userId, fileName) {
  try {
    fs.unlinkSync(path.join(userDir(userId), path.basename(fileName)));
  } catch {
    /* already gone */
  }
}

function removeUserDocuments(userId) {
  try {
    fs.rmSync(userDir(userId), { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

/** Absolute path of a stored document; basename() blocks any path traversal. */
function documentPath(userId, fileName) {
  return path.join(userDir(userId), path.basename(fileName));
}

module.exports = {
  DOCUMENT_TYPES,
  DOCUMENT_KEYS,
  REQUIRED_KEYS,
  MAX_FILE_BYTES,
  labelFor,
  validateDocumentFile,
  missingRequiredTypes,
  saveDocuments,
  removeStoredFile,
  removeUserDocuments,
  documentPath,
};
