const mongoose = require('mongoose');
const { listDoctors } = require('../services/doctorDirectory');
const { User } = require('../models/User');
const { Chamber } = require('../models/Chamber');
const { DoctorSchedule } = require('../models/DoctorSchedule');
const { isDoctorListedPublicly } = require('../middleware/doctorApproval');

async function searchDoctors(req, res, next) {
  try {
    const { search, area, specialty } = req.query;
    const result = await listDoctors({ search, area, specialty });
    return res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function getDoctorProfile(req, res, next) {
  try {
    const { doctorId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({ success: false, message: 'Invalid doctor id' });
    }
    const doctor = await User.findById(doctorId);
    if (!isDoctorListedPublicly(doctor)) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    const [chambers, schedules] = await Promise.all([
      Chamber.find({ doctor: doctorId, isActive: true }).sort({ name: 1 }),
      DoctorSchedule.find({ doctor: doctorId, status: 'active' }).populate('chamber').sort({ startTime: 1 }),
    ]);

    const profile = doctor.doctorProfile || {};
    return res.json({
      success: true,
      doctor: {
        id: doctor._id.toString(),
        fullName: doctor.fullName,
        specialtyTitle: profile.specialtyTitle || '',
        specialtySlug: profile.specialtySlug || '',
        affiliations: profile.affiliations || '',
        rating: profile.rating ?? 4.8,
        avatarUrl: profile.avatarUrl || '',
        isOnline: profile.isOnline !== false,
      },
      chambers: chambers.map((c) => c.toPublicJSON()),
      schedules: schedules
        .filter((s) => s.chamber?.isActive !== false)
        .map((s) => s.toPublicJSON(s.chamber)),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { searchDoctors, getDoctorProfile };
