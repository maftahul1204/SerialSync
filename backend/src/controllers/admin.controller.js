const { User, DOCTOR_APPROVAL_STATUSES } = require('../models/User');

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

    doctor.doctorApprovalStatus = status;
    await doctor.save();

    return res.json({ success: true, doctor: doctor.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}

module.exports = { listDoctorsForAdmin, setDoctorApproval };
