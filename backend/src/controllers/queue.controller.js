const mongoose = require('mongoose');
const { SlotBooking } = require('../models/SlotBooking');
const queueService = require('../services/queueService');
const { buildQueueState } = require('../services/queueBuilder');
const { patientsAheadForBooking, patientsAheadForItem } = require('../services/queueBuilder');
const { getIo } = require('../realtime/socket');

function emitQueue(sessionId, state) {
  const io = getIo();
  if (io && state) {
    io.to(`queue:${sessionId}`).emit('queue_updated', state);
  }
}

async function ensureSession(req, res, next) {
  try {
    const { chamberId, date, doctorId } = req.body;
    if (!chamberId || !date || !doctorId) {
      return res.status(400).json({
        success: false,
        message: 'chamberId, doctorId, and date (YYYY-MM-DD) are required',
      });
    }
    if (!mongoose.Types.ObjectId.isValid(chamberId) || !mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({ success: false, message: 'Invalid chamber or doctor id' });
    }
    const ctx = await queueService.getOrCreateSession({ doctorId, chamberId, date });
    const state = buildQueueState(ctx.session, ctx.items);
    emitQueue(state.sessionId, state);
    return res.json({ success: true, queue: state });
  } catch (err) {
    next(err);
  }
}

async function getState(req, res, next) {
  try {
    const state = await queueService.getSessionState(req.params.id);
    if (!state) return res.status(404).json({ success: false, message: 'Queue session not found' });
    return res.json({ success: true, queue: state });
  } catch (err) {
    next(err);
  }
}

async function advance(req, res, next) {
  try {
    const state = await queueService.advanceSession(req.params.id);
    emitQueue(state.sessionId, state);
    return res.json({ success: true, queue: state });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  }
}

async function walkIn(req, res, next) {
  try {
    const { afterSerial, patientName, priority, reason } = req.body;
    if (!afterSerial || !patientName) {
      return res.status(400).json({ success: false, message: 'afterSerial and patientName are required' });
    }
    const result = await queueService.addWalkIn(req.params.id, {
      afterSerial: Number(afterSerial),
      patientName,
      priority,
      reason,
    });
    emitQueue(result.state.sessionId, result.state);
    return res.status(201).json({ success: true, walkIn: result.walkIn, queue: result.state });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  }
}

async function noShow(req, res, next) {
  try {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ success: false, message: 'bookingId is required' });
    const state = await queueService.markNoShow(req.params.id, bookingId);
    emitQueue(state.sessionId, state);
    return res.json({ success: true, queue: state });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  }
}

async function undo(req, res, next) {
  try {
    const state = await queueService.undoNoShow(req.params.id);
    emitQueue(state.sessionId, state);
    return res.json({ success: true, queue: state });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  }
}

async function delayBroadcast(req, res, next) {
  try {
    const { delayMinutes, delayReason } = req.body;
    const state = await queueService.setDelay(req.params.id, Number(delayMinutes) || 0, delayReason);
    emitQueue(state.sessionId, state);
    return res.json({ success: true, queue: state });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  }
}

async function pauseSession(req, res, next) {
  try {
    const { paused, pauseMessage } = req.body;
    const state = await queueService.setPause(req.params.id, Boolean(paused), pauseMessage);
    emitQueue(state.sessionId, state);
    return res.json({ success: true, queue: state });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  }
}

async function myQueueView(req, res, next) {
  try {
    const today = new Date();
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const booking = await SlotBooking.findOne({
      patient: req.user._id,
      date,
      status: { $in: ['booked', 'confirmed'] },
    }).sort({ slotStart: 1 });
    if (!booking) {
      return res.json({ success: true, queue: null, message: 'No active appointment today' });
    }
    const ctx = await queueService.getOrCreateSession({
      doctorId: booking.doctor.toString(),
      chamberId: booking.chamber.toString(),
      date: booking.date,
    });
    const state = buildQueueState(ctx.session, ctx.items);
    const myIndex = ctx.items.findIndex(
      (i) => i.kind === 'booking' && i.bookingId === booking._id.toString()
    );
    const ahead =
      myIndex >= 0
        ? patientsAheadForItem(ctx.items, ctx.session.servingIndex, myIndex)
        : patientsAheadForBooking(ctx.items, ctx.session.servingIndex, booking.serialNumber);
    const slotMinutes = 15;
    const etaMinutes = Math.max(0, ahead * slotMinutes + (state.delayMinutes || 0));

    return res.json({
      success: true,
      appointmentId: booking._id.toString(),
      serialNumber: booking.serialNumber,
      queue: state,
      patientsAhead: ahead,
      estimatedWaitMinutes: etaMinutes,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  ensureSession,
  getState,
  advance,
  walkIn,
  noShow,
  undo,
  delayBroadcast,
  pauseSession,
  myQueueView,
};
