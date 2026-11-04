const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actorEmail: { type: String, trim: true },
    action: { type: String, required: true, trim: true, index: true },
    targetType: { type: String, trim: true },
    targetId: { type: String, trim: true },
    meta: { type: mongoose.Schema.Types.Mixed },
    ip: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
module.exports = { AuditLog };
