async function getProfile(req, res) {
  return res.json({ success: true, user: req.user.toSafeJSON() });
}

async function updateProfile(req, res, next) {
  try {
    const { fullName, phone, doctorProfile } = req.body;
    if (fullName !== undefined) {
      if (!fullName.trim()) {
        return res.status(400).json({ success: false, message: 'Full name cannot be empty' });
      }
      req.user.fullName = fullName.trim();
    }
    if (phone !== undefined) {
      req.user.phone = String(phone).trim();
    }
    if (doctorProfile && req.user.role === 'doctor') {
      req.user.doctorProfile = req.user.doctorProfile || {};
      const fields = [
        'specialtyTitle',
        'specialtySlug',
        'affiliations',
        'roomLabel',
        'avatarUrl',
      ];
      for (const key of fields) {
        if (doctorProfile[key] !== undefined) {
          req.user.doctorProfile[key] = String(doctorProfile[key]).trim();
        }
      }
      if (doctorProfile.rating !== undefined) {
        const rating = Number(doctorProfile.rating);
        if (!Number.isNaN(rating)) req.user.doctorProfile.rating = Math.min(5, Math.max(0, rating));
      }
      if (doctorProfile.isOnline !== undefined) {
        req.user.doctorProfile.isOnline = Boolean(doctorProfile.isOnline);
      }
    }

    await req.user.save();
    return res.json({ success: true, user: req.user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}

module.exports = { getProfile, updateProfile };
