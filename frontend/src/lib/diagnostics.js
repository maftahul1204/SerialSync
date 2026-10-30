/** Helpers for choosing a diagnostic center and describing an order's progress. */

export const SLOT_OPTIONS = ['08:00-10:00', '10:00-12:00', '12:00-14:00', '14:00-16:00', '16:00-18:00'];

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Collection slots that fall inside a center's opening hours on a given date (YYYY-MM-DD). */
export function slotsForCenter(center, dateYmd) {
  if (!center) return [];
  if (dateYmd) {
    const [y, m, d] = dateYmd.split('-').map(Number);
    const dow = new Date(y, m - 1, d).getDay();
    if (!center.openDays.includes(dow)) return [];
  }
  const open = toMinutes(center.openFrom);
  const close = toMinutes(center.openTo);
  return SLOT_OPTIONS.filter((slot) => {
    const [from, to] = slot.split('-').map(toMinutes);
    return from >= open && to <= close;
  });
}

/** One status badge for a center: { tone, label }. */
export function centerStatus(center) {
  if (!center.isActive) return { tone: 'red', label: 'Unavailable' };
  if (!center.acceptingOrders) return { tone: 'red', label: 'Not accepting orders' };
  if (!center.homeCollection) return { tone: 'red', label: 'No home collection' };
  if (center.openNow) return { tone: 'green', label: 'Open now' };
  return { tone: 'amber', label: `Closed now · opens ${center.openFrom}` };
}

export function canOrderFrom(center) {
  return Boolean(center.isActive && center.acceptingOrders && center.homeCollection && center.quote?.offersAll);
}

export const ORDER_STEPS = [
  { status: 'pending_dispatch', label: 'Order placed' },
  { status: 'assigned', label: 'Phlebotomist assigned' },
  { status: 'en_route', label: 'On the way' },
  { status: 'sample_collected', label: 'Sample collected' },
  { status: 'lab_received', label: 'Received at lab' },
  { status: 'under_analysis', label: 'Analysis' },
  { status: 'completed', label: 'Report ready' },
];

/** Steps annotated with done/current/upcoming and the time each was reached. */
export function buildTimeline(order) {
  const reached = new Map((order.statusHistory || []).map((h) => [h.status, h]));
  const currentIndex = ORDER_STEPS.findIndex((s) => s.status === order.status);
  return ORDER_STEPS.map((step, i) => ({
    ...step,
    state: order.status === 'cancelled' ? 'upcoming' : i < currentIndex || (i === currentIndex && order.status === 'completed') ? 'done' : i === currentIndex ? 'current' : 'upcoming',
    at: reached.get(step.status)?.at || null,
    note: reached.get(step.status)?.note || '',
  }));
}

export function statusLabel(status) {
  return ORDER_STEPS.find((s) => s.status === status)?.label || String(status || '').replace(/_/g, ' ');
}
