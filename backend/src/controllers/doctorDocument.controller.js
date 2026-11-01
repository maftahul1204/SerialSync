const fs = require('fs');
const mongoose = require('mongoose');
const { User } = require('../models/User');
const { Chamber } = require('../models/Chamber');
const { DoctorSchedule } = require('../models/DoctorSchedule');
const { uploadedEntries } = require('../middleware/doctorUpload');
const {
  DOCUMENT_TYPES,
  validateDocumentFile,
  labelFor,
  saveDocuments,
  removeStoredFile,
  documentPath,
} = require('../utils/doctorDocuments');
const { notify } = require('../services/notificationService');

/** Stream one stored document of `owner` (inline so images/PDFs open in the browser). */
function streamDocument(res, owner, docId) {
  if (!mongoose.Types.ObjectId.isValid(docId)) {
    return res.status(400).json({ success: false, message: 'Invalid document id' });
  }
  const doc = (owner.doctorDocuments || []).find((d) => d._id.toString() === docId);
  if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
  const filePath = documentPath(owner._id, doc.fileName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'Document file is missing on the server' });
  }
  res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.originalName || doc.fileName)}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');
  return fs.createReadStream(filePath).pipe(res);
}

/** Doctor adds or replaces verification documents (for example after a rejection). */
async function uploadMine(req, res, next) {
  try {
    const entries = uploadedEntries(req);
    if (!entries.length) {
      return res.status(400).json({ success: false, message: 'Attach at least one document' });
    }
    for (const [, file] of entries) {
      const fileError = validateDocumentFile(file);
      if (fileError) return res.status(400).json({ success: false, message: fileError });
    }
    const saved = saveDocuments(req.user._id, entries);
    for (const doc of saved) {
      const old = req.user.doctorDocuments.filter((d) => d.type === doc.type);
      old.forEach((o) => removeStoredFile(req.user._id, o.fileName));
      req.user.doctorDocuments = req.user.doctorDocuments.filter((d) => d.type !== doc.type);
      req.user.doctorDocuments.push(doc);
    }
    let resubmitted = false;
    if (req.user.doctorApprovalStatus === 'rejected') {
      req.user.doctorApprovalStatus = 'pending';
      resubmitted = true;
    }
    await req.user.save();
    if (resubmitted) {
      const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
      await Promise.all(
        admins.map((a) =>
          notify(a._id, {
            type: 'system',
            title: 'Doctor resubmitted documents',
            body: `${req.user.fullName} updated their documents for review.`,
            link: '/dashboard/admin',
          })
        )
      );
    }
    return res.json({ success: true, user: req.user.toSafeJSON(), resubmitted });
  } catch (err) {
    next(err);
  }
}

async function downloadMine(req, res, next) {
  try {
    return streamDocument(res, req.user, req.params.docId);
  } catch (err) {
    next(err);
  }
}

/** Admin: everything about a doctor needed to decide on approval. */
async function getDoctorDetails(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid doctor id' });
    }
    const doctor = await User.findById(req.params.id);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }
    const [chambers, schedules] = await Promise.all([
      Chamber.countDocuments({ doctor: doctor._id }),
      DoctorSchedule.countDocuments({ doctor: doctor._id }),
    ]);
    const json = doctor.toSafeJSON();
    json.documents = json.documents.map((d) => ({
      ...d,
      label: labelFor(d.type),
      url: `/api/admin/doctors/${doctor._id}/documents/${d.id}`,
    }));
    const have = new Set(json.documents.map((d) => d.type));
    return res.json({
      success: true,
      doctor: json,
      isActive: doctor.isActive,
      stats: { chambers, schedules },
      requiredDocuments: DOCUMENT_TYPES.filter((d) => d.required).map((d) => ({
        type: d.key,
        label: d.label,
        provided: have.has(d.key),
      })),
    });
  } catch (err) {
    next(err);
  }
}

async function downloadForAdmin(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid doctor id' });
    }
    const doctor = await User.findById(req.params.id);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }
    return streamDocument(res, doctor, req.params.docId);
  } catch (err) {
    next(err);
  }
}

module.exports = { uploadMine, downloadMine, getDoctorDetails, downloadForAdmin };
