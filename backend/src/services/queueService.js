const { QueueSession } = require('../models/QueueSession');
const { WalkInEntry } = require('../models/WalkInEntry');
const { SlotBooking } = require('../models/SlotBooking');
const { buildQueueItems, buildQueueState } = require('./queueBuilder');
const { notify } = require('./notificationService');

function sessionNotFound() {
  const err = new Error('Queue session not found');
  err.status = 404;
  return err;
}

async function loadSessionContext(sessionId) {
  const session = await QueueSession.findById(sessionId);
  if (!session) return null;
  const [bookings, walkIns] = await Promise.all([
    SlotBooking.find({
      chamber: session.chamber,
      date: session.date,
      status: { $nin: ['cancelled'] },
    }).sort({ serialNumber: 1 }),
    WalkInEntry.find({ session: session._id }).sort({ createdAt: 1 }),
  ]);
  const items = buildQueueItems(bookings, walkIns);
  return { session, bookings, walkIns, items };
}

async function getOrCreateSession({ doctorId, chamberId, date }) {
  let session = await QueueSession.findOne({ chamber: chamberId, date });
  if (!session) {
    session = await QueueSession.create({
      doctor: doctorId,
      chamber: chamberId,
      date,
      status: 'active',
    });
  }
  return loadSessionContext(session._id);
}

async function getSessionState(sessionId) {
  const ctx = await loadSessionContext(sessionId);
  if (!ctx) return null;
  return buildQueueState(ctx.session, ctx.items);
}

async function advanceSession(sessionId) {
  const ctx = await loadSessionContext(sessionId);
  if (!ctx) throw sessionNotFound();
  const { session, items } = ctx;
  if (session.status === 'closed') {
    const err = new Error('Session is closed');
    err.status = 400;
    throw err;
  }
  const nextIndex = session.servingIndex + 1;
  if (nextIndex >= items.length) {
    const err = new Error('No more patients in queue');
    err.status = 400;
    throw err;
  }
  session.servingIndex = nextIndex;
  session.undo = undefined;
  const current = items[nextIndex];
  if (current.kind === 'booking') {
    await SlotBooking.findByIdAndUpdate(current.bookingId, { status: 'confirmed' });
  } else {
    await WalkInEntry.findByIdAndUpdate(current.walkInId, { status: 'serving' });
  }
  await session.save();

  // FR-13: tell the patient who is now two places away from being served.
  const target = items[nextIndex + 2];
  if (target && target.kind === 'booking') {
    await notify(target.patientId, {
      type: 'queue_turn_soon',
      title: 'Your turn is coming up',
      body: `Serial #${target.label} is 2 places away. Please be at the chamber.`,
      link: '/queue',
      sms: true,
    });
  }
  return getSessionState(sessionId);
}

async function addWalkIn(sessionId, { afterSerial, patientName, priority, reason }) {
  const ctx = await loadSessionContext(sessionId);
  if (!ctx) throw sessionNotFound();
  const subSuffix = 'B';
  const displayLabel = `${afterSerial}${subSuffix}`;
  const walkIn = await WalkInEntry.create({
    session: sessionId,
    afterSerial,
    subSuffix,
    displayLabel,
    patientName,
    priority: priority || 'urgent',
    reason: reason || '',
  });
  return { walkIn, state: await getSessionState(sessionId) };
}

async function markNoShow(sessionId, bookingId) {
  const ctx = await loadSessionContext(sessionId);
  if (!ctx) throw sessionNotFound();
  const booking = ctx.bookings.find((b) => b._id.toString() === bookingId);
  if (!booking) {
    const err = new Error('Booking not found in this session');
    err.status = 404;
    throw err;
  }
  const previousStatus = booking.status;
  booking.status = 'no_show';
  await booking.save();
  ctx.session.undo = {
    bookingId: booking._id,
    previousStatus,
    expiresAt: new Date(Date.now() + 60_000),
  };
  await ctx.session.save();
  return getSessionState(sessionId);
}

async function undoNoShow(sessionId) {
  const ctx = await loadSessionContext(sessionId);
  if (!ctx) throw sessionNotFound();
  if (!ctx.session.undo?.bookingId) {
    const err = new Error('Nothing to undo');
    err.status = 400;
    throw err;
  }
  if (ctx.session.undo.expiresAt < new Date()) {
    ctx.session.undo = undefined;
    await ctx.session.save();
    const err = new Error('Undo window expired');
    err.status = 400;
    throw err;
  }
  await SlotBooking.findByIdAndUpdate(ctx.session.undo.bookingId, {
    status: ctx.session.undo.previousStatus,
  });
  ctx.session.undo = undefined;
  await ctx.session.save();
  return getSessionState(sessionId);
}

async function setDelay(sessionId, delayMinutes, delayReason) {
  const session = await QueueSession.findByIdAndUpdate(
    sessionId,
    { delayMinutes, delayReason: delayReason || '' },
    { new: true }
  );
  if (!session) throw sessionNotFound();
  if (delayMinutes > 0) {
    const waiting = await SlotBooking.find({
      chamber: session.chamber,
      date: session.date,
      status: { $in: ['booked', 'confirmed'] },
    }).select('patient serialNumber');
    await Promise.all(
      waiting.map((b) =>
        notify(b.patient, {
          type: 'queue_delay',
          title: `Doctor delayed by ${delayMinutes} min`,
          body: delayReason || `Serial #${b.serialNumber}: please plan accordingly.`,
          link: '/queue',
        })
      )
    );
  }
  return getSessionState(sessionId);
}

async function setPause(sessionId, paused, pauseMessage) {
  const session = await QueueSession.findByIdAndUpdate(
    sessionId,
    {
      status: paused ? 'paused' : 'active',
      pauseMessage: paused ? pauseMessage || 'Session temporarily paused' : '',
    },
    { new: true }
  );
  if (!session) throw sessionNotFound();
  return getSessionState(sessionId);
}

module.exports = {
  getOrCreateSession,
  getSessionState,
  advanceSession,
  addWalkIn,
  markNoShow,
  undoNoShow,
  setDelay,
  setPause,
  loadSessionContext,
};
