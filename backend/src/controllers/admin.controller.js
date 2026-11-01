const { User, DOCTOR_APPROVAL_STATUSES } = require('../models/User');
const { AuditLog } = require('../models/AuditLog');
const { notify } = require('../services/notificationService');
const { recordAudit } = require('../utils/audit');
const { parsePagination, pageMeta } = require('../utils/pagination');
const { missingRequiredTypes, labelFor } = require('../utils/doctorDocuments');

async function listDoctorsForAdmin(req, res, next) {
  try {
    const status = req.query.status || 'pending';
    const query = { role: 'doctor' };
    if (status !== 'all') {
      if (!DOCTOR_APPROVAL_STATUSES.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status filter' });
      }
      if (status === 'pending') {
        query.$or = [
          { doctorApprovalStatus: 'pending' },
          { doctorApprovalStatus: { $exists: false } },
          { doctorApprovalStatus: null },
        ];
      } else {
        query.doctorApprovalStatus = status;
      }
    }

    const doctors = await User.find(query).sort({ createdAt: -1 }).limit(200);
    const counts = await User.aggregate([
      { $match: { role: 'doctor' } },
      { $group: { _id: '$doctorApprovalStatus', count: { $sum: 1 } } },
    ]);
    const countByStatus = { pending: 0, approved: 0, rejected: 0 };
    for (const row of counts) {
      const key = row._id && DOCTOR_APPROVAL_STATUSES.includes(row._id) ? row._id : 'pending';
      countByStatus[key] += row.count;
    }

    return res.json({
      success: true,
      doctors: doctors.map((d) => d.toSafeJSON()),
      counts: countByStatus,
    });
  } catch (err) {
    next(err);
  }
}

async function setDoctorApproval(req, res, next) {
  try {
    const { status } = req.body;
    const note = typeof req.body.note === 'string' ? req.body.note.trim().slice(0, 500) : '';
    if (!DOCTOR_APPROVAL_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${DOCTOR_APPROVAL_STATUSES.join(', ')}`,
      });
    }

    const doctor = await User.findById(req.params.id);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    if (status === 'rejected' && !note) {
      return res.status(400).json({ success: false, message: 'Please give a reason when rejecting a doctor' });
    }
    if (status === 'approved') {
      const missing = missingRequiredTypes((doctor.doctorDocuments || []).map((d) => d.type));
      if (missing.length) {
        return res.status(409).json({
          success: false,
          code: 'DOCS_MISSING',
          message: `Cannot approve: missing ${missing.map(labelFor).join(', ')}`,
        });
      }
    }

    doctor.doctorApprovalStatus = status;
    doctor.doctorApprovalNote = status === 'approved' ? '' : note;
    await doctor.save();
    await recordAudit(req, `doctor.${status}`, { targetType: 'User', targetId: doctor._id, meta: { email: doctor.email } });
    await notify(doctor._id, {
      type: 'doctor_approval',
      title: status === 'approved' ? 'Your doctor account was approved' : `Your doctor account is ${status}`,
      body:
        status === 'approved'
          ? 'You can now publish chambers and schedules.'
          : note || 'Please contact the administrator for details.',
      link: '/dashboard',
      sms: true,
    });

    return res.json({ success: true, doctor: doctor.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}

async function listAuditLog(req, res, next) {
  try {
    const pg = parsePagination(req.query);
    const query = req.query.action ? { action: req.query.action } : {};
    const [rows, total] = await Promise.all([
      AuditLog.find(query).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit),
      AuditLog.countDocuments(query),
    ]);
    return res.json({
      success: true,
      entries: rows.map((r) => ({
        id: r._id.toString(),
        actorEmail: r.actorEmail,
        action: r.action,
        targetType: r.targetType,
        targetId: r.targetId,
        meta: r.meta,
        at: r.createdAt,
      })),
      pagination: pageMeta(pg, total),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { listDoctorsForAdmin, setDoctorApproval, listAuditLog };
