const multer = require('multer');
const { DOCUMENT_KEYS, MAX_FILE_BYTES } = require('../utils/doctorDocuments');

const upload = multer({
  storage: multer.memoryStorage(), // files are validated first, then written to the project folder
  limits: { fileSize: MAX_FILE_BYTES, files: DOCUMENT_KEYS.length },
}).fields(DOCUMENT_KEYS.map((name) => ({ name, maxCount: 1 })));

/** Parse multipart bodies (doctor signup / document upload); leave JSON requests untouched. */
function parseDoctorDocuments(req, res, next) {
  if (!req.is('multipart/form-data')) return next();
  return upload(req, res, next);
}

/** req.files -> [[type, file]] */
function uploadedEntries(req) {
  const out = [];
  for (const [type, arr] of Object.entries(req.files || {})) {
    if (arr && arr[0]) out.push([type, arr[0]]);
  }
  return out;
}

module.exports = { parseDoctorDocuments, uploadedEntries };
