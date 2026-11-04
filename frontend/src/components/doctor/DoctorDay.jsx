'use client';

import { useCallback, useEffect, useState } from 'react';
import Alert from '@/components/Alert';
import { appointmentsApi, scheduleApi } from '@/lib/api';
import { formatTaka, todayYmd } from '@/lib/format';

import { ListSkeleton, StatSkeletons } from '@/components/Loading';
import ReasonDialog from '@/components/ReasonDialog';
import CancelDayDialog from '@/components/doctor/CancelDayDialog';
const STATUS_STYLE = {
  booked: 'border-ss-primary/40 text-ss-primary',
  confirmed: 'border-ss-primary/40 text-ss-primary',
  completed: 'border-ss-secondary/40 text-ss-secondary',
  no_show: 'border-ss-tertiary/40 text-ss-tertiary',
  cancelled: 'border-red-500/40 text-red-300',
};

function Stat({ label, value, tone = 'text-ss-text' }) {
  return (
    <div className="ss-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ss-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

/** FR-15: the doctor's day itinerary and end-of-day summary. */
export default function DoctorDay() {
  const [date, setDate] = useState(todayYmd());
  const [appointments, setAppointments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [dayTarget, setDayTarget] = useState(null);
  const [info, setInfo] = useState('');
  const [mySchedules, setMySchedules] = useState([]);

  const load = useCallback(() => {
    setError('');
    Promise.all([appointmentsApi.doctorDay(date), appointmentsApi.doctorSummary(date)])
      .then(([day, sum]) => {
        setAppointments(day.appointments);
        setSummary(sum.summary);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoaded(true));
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    scheduleApi
      .listMySchedules()
      .then((res) => setMySchedules(res.schedules))
      .catch(() => {});
  }, [date]);

  async function mark(id, status) {
    setBusyId(id);
    try {
      await appointmentsApi.setStatus(id, status);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  }

  return (
    <section className="mt-10" aria-labelledby="doctor-day-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="doctor-day-title" className="text-xl font-bold text-ss-text">
            Day itinerary
          </h2>
          <p className="text-sm text-ss-muted">Serials booked for the selected day and an end-of-day summary.</p>
        </div>
        <label className="text-sm text-ss-muted">
          Date
          <input type="date" className="ss-input mt-1" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>

      <div className="mt-4">
        <Alert message={error} />
      </div>

      {!loaded ? <div className="mt-4"><StatSkeletons count={8} /></div> : null}
      {summary ? (
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Booked" value={summary.totalBooked} />
          <Stat label="Completed" value={`${summary.completed} (${summary.completionRate}%)`} tone="text-ss-secondary" />
          <Stat label="No-shows" value={summary.noShow} tone="text-ss-tertiary" />
          <Stat label="Walk-ins" value={summary.walkIns} tone="text-ss-primary" />
          <Stat label="Pending" value={summary.pending} />
          <Stat label="Cancelled" value={summary.cancelled} tone="text-red-300" />
          <Stat label="Fees collected" value={formatTaka(summary.feesCollected)} tone="text-ss-secondary" />
          <Stat label="Fees expected" value={formatTaka(summary.feesExpected)} />
        </div>
      ) : null}

      {summary?.chambers?.length ? (
        <p className="mt-3 text-xs text-ss-muted">
          By chamber: {summary.chambers.map((c) => `${c.name} (${c.patients})`).join(' · ')}
        </p>
      ) : null}

      <Alert type="success" message={info} />
      {(() => {
        const dow = new Date(`${date}T00:00:00`).getDay();
        const running = mySchedules.filter(
          (s) => s.status === 'active' && s.daysOfWeek.includes(dow) && !(s.closedDates || []).some((c) => c.date === date)
        );
        const closed = mySchedules.filter((s) => (s.closedDates || []).some((c) => c.date === date));
        if (date < todayYmd() || (!running.length && !closed.length)) return null;
        return (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-ss-border bg-ss-surface/60 px-4 py-3 text-sm">
            <span className="text-ss-muted">Chamber sessions on this day:</span>
            {running.map((s) => (
              <button key={s.id} type="button" onClick={() => setDayTarget(s)} className="ss-btn-danger-outline px-3 py-1.5 text-xs">
                Cancel {s.chamber?.name} ({s.startTime}-{s.endTime})
              </button>
            ))}
            {closed.map((s) => (
              <span key={s.id} className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs text-red-200">
                {s.chamber?.name} cancelled
              </span>
            ))}
          </div>
        );
      })()}

      <ul className="mt-6 space-y-3">
        {appointments.map((a) => {
          const open = a.status === 'booked' || a.status === 'confirmed';
          return (
            <li key={a.id} className="ss-card flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-ss-primary/30 bg-ss-primary/10 text-lg font-bold text-ss-primary">
                  #{a.serialNumber}
                </span>
                <div>
                  <p className="font-medium text-ss-text">
                    {a.slotStart}-{a.slotEnd}
                    {a.bookedForName ? <span className="ml-2 text-sm text-ss-muted">for {a.bookedForName}</span> : null}
                  </p>
                  <p className="text-xs text-ss-muted">
                    {a.chamber?.name || 'Chamber'} · code {a.confirmationCode}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLE[a.status] || ''}`}>
                  {a.status.replace('_', ' ')}
                </span>
                {open ? (
                  <>
                    <button type="button" disabled={busyId === a.id} onClick={() => mark(a.id, 'completed')} className="ss-btn-primary px-3 py-1.5 text-xs">
                      Complete
                    </button>
                    <button type="button" disabled={busyId === a.id} onClick={() => mark(a.id, 'no_show')} className="ss-btn-secondary px-3 py-1.5 text-xs">
                      No-show
                    </button>
                    <button type="button" disabled={busyId === a.id} onClick={() => setCancelTarget(a)} className="ss-btn-danger-outline px-3 py-1.5 text-xs">
                      Cancel
                    </button>
                  </>
                ) : null}
              </div>
            </li>
          );
        })}
        {!loaded ? <ListSkeleton rows={2} lines={1} action={false} label="Loading itinerary" /> : null}
        {loaded && !appointments.length ? <p className="text-sm text-ss-muted">No serials booked for this day.</p> : null}
      </ul>
      <ReasonDialog
        open={Boolean(cancelTarget)}
        title={`Cancel serial #${cancelTarget?.serialNumber ?? ''}`}
        message="The patient is told your reason by notification and SMS, and is shown the next available slot to rebook."
        confirmLabel="Cancel appointment"
        placeholder="e.g. Emergency surgery, please rebook"
        onConfirm={async (reason) => {
          await appointmentsApi.setStatus(cancelTarget.id, 'cancelled', reason);
          setCancelTarget(null);
          setInfo('Appointment cancelled and the patient was notified');
          load();
        }}
        onClose={() => setCancelTarget(null)}
      />
      {dayTarget ? (
        <CancelDayDialog
          schedule={dayTarget}
          date={date}
          onClose={() => setDayTarget(null)}
          onDone={(res) => {
            setDayTarget(null);
            setInfo(`${res.date} cancelled; ${res.cancelledBookings} patient${res.cancelledBookings === 1 ? '' : 's'} notified`);
            load();
            scheduleApi.listMySchedules().then((r) => setMySchedules(r.schedules));
          }}
        />
      ) : null}
    </section>
  );
}
