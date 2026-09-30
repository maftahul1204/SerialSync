async function getProfile(req, res) {
  return res.json({ success: true, user: req.user.toSafeJSON() });
}

async function updateProfile(req, res, next) {
  try {
    const { fullName, phone } = req.body;
    if (fullName !== undefined) {
      if (!fullName.trim()) {
        return res.status(400).json({ success: false, message: 'Full name cannot be empty' });
      }
      req.user.fullName = fullName.trim();
    }
    if (phone !== undefined) {
      req.user.phone = String(phone).trim();
    }

    await req.user.save();
    return res.json({ success: true, user: req.user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}

module.exports = { getProfile, updateProfile };
