const { AuditLog } = require('../models/AuditLog');

/** Record a privileged action. Never throws. */
async function recordAudit(req, action, { targetType, targetId, meta } = {}) {
  try {
    await AuditLog.create({
      actor: req.user._id,
      actorEmail: req.user.email,
      action,
      targetType,
      targetId: targetId ? String(targetId) : undefined,
      meta,
      ip: req.ip,
    });
  } catch (err) {
    console.error('audit failed:', err.message);
  }
}

module.exports = { recordAudit };
