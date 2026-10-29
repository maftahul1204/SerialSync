const mongoose = require('mongoose');
const { Notification } = require('../models/Notification');
const { parsePagination, pageMeta } = require('../utils/pagination');

async function listMine(req, res, next) {
  try {
    const pg = parsePagination(req.query);
    const query = { user: req.user._id };
    if (req.query.unread === 'true') query.readAt = null;
    const [rows, total, unread] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit),
      Notification.countDocuments(query),
      Notification.countDocuments({ user: req.user._id, readAt: null }),
    ]);
    return res.json({
      success: true,
      notifications: rows.map((n) => n.toPublicJSON()),
      unread,
      pagination: pageMeta(pg, total),
    });
  } catch (err) {
    next(err);
  }
}

async function markRead(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid notification id' });
    }
    const doc = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { readAt: new Date() },
      { new: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Notification not found' });
    return res.json({ success: true, notification: doc.toPublicJSON() });
  } catch (err) {
    next(err);
  }
}

async function markAllRead(req, res, next) {
  try {
    const result = await Notification.updateMany({ user: req.user._id, readAt: null }, { readAt: new Date() });
    return res.json({ success: true, updated: result.modifiedCount });
  } catch (err) {
    next(err);
  }
}

module.exports = { listMine, markRead, markAllRead };
