'use client';

import Link from 'next/link';

const STATUS_LABEL = {
  booked: 'Booked',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  completed: 'Completed',
  no_show: 'No show',
};

export default function BookingCard({ appointment, onCancel, busy }) {
  const cancelled = appointment.status === 'cancelled';

  return (
    <article className={`ss-card p-4 ${cancelled ? 'opacity-70' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ss-primary">
            Serial #{appointment.serialNumber ?? '—'}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-ss-text">{appointment.doctor?.fullName}</h3>
          {appointment.bookedForName ? (
            <p className="text-xs text-ss-muted">Booked for {appointment.bookedForName}</p>
          ) : null}
          <p className="text-sm text-ss-muted">{appointment.chamber?.name}</p>
        </div>
        <span className={cancelled ? 'ss-badge-inactive' : 'ss-badge-active'}>
          {STATUS_LABEL[appointment.status] || appointment.status}
        </span>
      </div>
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-ss-muted">Date</dt>
          <dd className="font-medium text-ss-text">{appointment.date}</dd>
        </div>
        <div>
          <dt className="text-ss-muted">Time</dt>
          <dd className="font-medium text-ss-text">
            {appointment.slotStart}–{appointment.slotEnd}
          </dd>
        </div>
        {appointment.consultationFee != null ? (
          <div>
            <dt className="text-ss-muted">Fee</dt>
            <dd className="font-medium text-ss-text">৳ {appointment.consultationFee}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-ss-muted">Confirmation</dt>
          <dd className="font-mono text-xs text-ss-text">{appointment.confirmationCode}</dd>
        </div>
      </dl>
      {cancelled ? (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          <p className="font-semibold">
            Cancelled by {appointment.cancelledBy === 'doctor' ? 'the doctor' : appointment.cancelledBy === 'admin' ? 'an administrator' : 'you'}
          </p>
          {appointment.cancelReason ? <p className="mt-0.5 text-red-200/90">Reason: {appointment.cancelReason}</p> : null}
          {appointment.cancelledBy !== 'patient' ? (
            <Link href={`/doctors/${appointment.doctorId}/schedule`} className="mt-2 inline-block font-semibold text-ss-primary underline">
              Book the next available slot →
            </Link>
          ) : null}
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`/bookings/${appointment.id}`} className="ss-btn-secondary px-3 py-1.5 text-sm">
          View details
        </Link>
        {['booked', 'confirmed'].includes(appointment.status) && onCancel ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onCancel(appointment.id)}
            className="ss-btn-danger-outline px-3 py-1.5 text-sm"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </article>
  );
}
