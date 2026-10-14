const APPROVAL_MESSAGES = {
  pending: 'Your doctor account is pending admin approval. You will be notified once an administrator reviews it.',
  rejected: 'Your doctor registration was not approved. Contact support if you believe this is an error.',
};

function requireApprovedDoctor(req, res, next) {
  if (req.user.role === 'admin') {
    return next();
  }
  if (req.user.role !== 'doctor') {
    return res.status(403).json({ success: false, message: 'Insufficient permissions' });
  }
  const status = req.user.doctorApprovalStatus || 'pending';
  if (status === 'approved') {
    return next();
  }
  const message = APPROVAL_MESSAGES[status] || APPROVAL_MESSAGES.pending;
  return res.status(403).json({
    success: false,
    message,
    code: status === 'rejected' ? 'DOCTOR_REJECTED' : 'DOCTOR_PENDING',
    doctorApprovalStatus: status,
  });
}

function isDoctorListedPublicly(user) {
  if (!user || user.role !== 'doctor' || !user.isActive) {
    return false;
  }
  return user.doctorApprovalStatus === 'approved';
}

module.exports = { requireApprovedDoctor, isDoctorListedPublicly, APPROVAL_MESSAGES };
