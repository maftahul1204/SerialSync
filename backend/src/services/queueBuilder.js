function walkInSortKey(afterSerial, subSuffix) {
  const suffixMap = { B: 0.5, A: 0.4, C: 0.6 };
  return afterSerial + (suffixMap[subSuffix] || 0.55);
}

function buildQueueItems(bookings, walkIns) {
  const items = [];
  for (const b of bookings) {
    if (b.status === 'cancelled') continue;
    items.push({
      kind: 'booking',
      id: b._id.toString(),
      bookingId: b._id.toString(),
      label: String(b.serialNumber),
      sortKey: b.serialNumber,
      serialNumber: b.serialNumber,
      patientId: b.patient.toString(),
      status: b.status,
    });
  }
  for (const w of walkIns) {
    if (w.status === 'completed' || w.status === 'no_show') continue;
    items.push({
      kind: 'walkin',
      id: w._id.toString(),
      walkInId: w._id.toString(),
      label: w.displayLabel,
      sortKey: walkInSortKey(w.afterSerial, w.subSuffix),
      patientName: w.patientName,
      priority: w.priority,
      status: w.status,
    });
  }
  items.sort((a, b) => a.sortKey - b.sortKey);
  return items;
}

function buildQueueState(session, items) {
  const servingIndex = session.servingIndex;
  const nowServing = servingIndex >= 0 && items[servingIndex] ? items[servingIndex] : null;
  const upNext =
    servingIndex + 1 < items.length ? items.slice(servingIndex + 1, servingIndex + 4) : [];

  return {
    sessionId: session._id.toString(),
    doctorId: session.doctor.toString(),
    chamberId: session.chamber.toString(),
    date: session.date,
    status: session.status,
    delayMinutes: session.delayMinutes || 0,
    delayReason: session.delayReason || '',
    pauseMessage: session.pauseMessage || '',
    nowServing: nowServing
      ? { label: nowServing.label, kind: nowServing.kind, id: nowServing.id }
      : null,
    servingIndex,
    queueLength: items.length,
    upNext: upNext.map((i) => ({ label: i.label, kind: i.kind, id: i.id })),
    items: items.map((i, index) => ({
      index,
      label: i.label,
      kind: i.kind,
      id: i.id,
      status: i.status,
      waiting: index > servingIndex,
    })),
  };
}

function patientsAheadForBooking(items, servingIndex, serialNumber) {
  return items.filter(
    (item, idx) =>
      idx > servingIndex &&
      item.kind === 'booking' &&
      item.serialNumber > serialNumber &&
      item.status !== 'no_show'
  ).length;
}

function patientsAheadForItem(items, servingIndex, itemIndex) {
  if (itemIndex <= servingIndex) return 0;
  let count = 0;
  for (let i = servingIndex + 1; i < itemIndex; i += 1) {
    if (items[i].status !== 'no_show') count += 1;
  }
  return count;
}

module.exports = {
  buildQueueItems,
  buildQueueState,
  patientsAheadForBooking,
  patientsAheadForItem,
  walkInSortKey,
};
