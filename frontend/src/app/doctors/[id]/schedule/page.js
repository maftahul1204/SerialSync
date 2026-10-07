'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Alert from '@/components/Alert';
import PatientShell from '@/components/patient/PatientShell';
import { authApi, scheduleApi } from '@/lib/api';
import { homePathForRole } from '@/lib/authRedirect';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function DoctorSchedulePage() {
  const params = useParams();
  const router = useRouter();
  const doctorId = params.id;
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [slots, setSlots] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [date, setDate] = useState('');
  const [bookingId, setBookingId] = useState('');

  useEffect(() => {
    authApi
      .me()
      .then((res) => {
        if (res.user.role === 'doctor') {
          router.replace('/dashboard');
          return;
        }
        if (res.user.role === 'admin') {
          router.replace('/dashboard');
          return;
        }
        setUser(res.user);
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  useEffect(() => {
    if (!user) return;
    scheduleApi
      .getDoctorSchedule(doctorId)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [doctorId, user]);

  useEffect(() => {
    if (!date || !doctorId || !user) return;
    scheduleApi
      .getDoctorSlots(doctorId, date, date)
      .then((res) => setSlots(res.slots))
      .catch((err) => setError(err.message));
  }, [doctorId, date, user]);

  useEffect(() => {
    if (!date) {
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      setDate(`${y}-${m}-${d}`);
    }
  }, [date]);

  async function handleBook(slot) {
    if (user.role !== 'patient') {
      setError('Only patients can book serials from this screen.');
      return;
    }
    setBookingId(`${slot.scheduleId}-${slot.slotStart}`);
    setError('');
    setSuccess('');
    try {
      await scheduleApi.bookSlot({
        scheduleId: slot.scheduleId,
        date: slot.date,
        slotStart: slot.slotStart,
      });
      setSuccess(`Booked ${slot.slotStart}–${slot.slotEnd} successfully.`);
      const res = await scheduleApi.getDoctorSlots(doctorId, date, date);
      setSlots(res.slots);
    } catch (err) {
      setError(err.message || 'Booking failed');
    } finally {
      setBookingId('');
    }
  }

  if (!user) {
    return (
      <div className="ss-page flex min-h-screen items-center justify-center text-ss-muted">
        Loading schedule…
      </div>
    );
  }

  return (
    <PatientShell user={user}>
      <Link href={homePathForRole('patient')} className="ss-link mb-4 inline-block text-sm">
        ← Back to doctors
      </Link>
      <Alert message={error} />
      <Alert type="success" message={success} />
      {!data ? (
        <p className="text-ss-muted">Loading schedule…</p>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h1 className="text-2xl font-bold text-ss-text">{data.doctor.fullName}</h1>
            <p className="mt-1 text-ss-muted">Chamber hours and open serial slots</p>

            <section className="mt-8">
              <h2 className="font-semibold text-ss-text">Chambers</h2>
              <ul className="mt-3 space-y-2">
                {data.chambers.map((c) => (
                  <li key={c.id} className="ss-card p-3 text-sm">
                    <span className="font-medium text-ss-text">{c.name}</span>
                    {c.area || c.city ? (
                      <span className="text-ss-muted">
                        {' '}
                        · {[c.area, c.city].filter(Boolean).join(', ')}
                      </span>
                    ) : null}
                    {c.address ? <p className="text-ss-muted">{c.address}</p> : null}
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-8">
              <h2 className="font-semibold text-ss-text">Weekly hours</h2>
              <ul className="mt-3 space-y-2">
                {data.schedules.map((s) => (
                  <li key={s.id} className="ss-card p-3 text-sm">
                    <span className="font-medium text-ss-text">{s.chamber?.name}</span>
                    <p className="text-ss-muted">
                      {s.daysOfWeek.map((d) => DAY_LABELS[d]).join(', ')} · {s.startTime}–{s.endTime} · ৳
                      {s.consultationFee}
                    </p>
                  </li>
                ))}
                {!data.schedules.length ? <li className="text-sm text-ss-muted">No active availability.</li> : null}
              </ul>
            </section>
          </div>

          <section className="ss-card-pad lg:sticky lg:top-24 lg:self-start">
            <h2 className="font-semibold text-ss-text">Book a serial</h2>
            <label className="ss-label mt-4" htmlFor="slot-date">
              Date
            </label>
            <input
              id="slot-date"
              type="date"
              className="ss-input mt-2 max-w-xs"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <ul className="mt-4 space-y-2">
              {slots.map((slot) => {
                const key = `${slot.scheduleId}-${slot.slotStart}`;
                const canBook = slot.remaining > 0;
                return (
                  <li
                    key={key}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ss-border bg-ss-surface-elevated/50 px-3 py-2 text-sm"
                  >
                    <span className="text-ss-text">
                      {slot.slotStart}–{slot.slotEnd}
                    </span>
                    <span className="text-ss-muted">
                      {slot.remaining} open · ৳{slot.consultationFee}
                    </span>
                    {canBook ? (
                      <button
                        type="button"
                        disabled={bookingId === key}
                        onClick={() => handleBook(slot)}
                        className="ss-btn-primary px-3 py-1.5 text-xs"
                      >
                        {bookingId === key ? 'Booking…' : 'Book'}
                      </button>
                    ) : (
                      <span className="text-xs text-ss-muted">Full</span>
                    )}
                  </li>
                );
              })}
              {date && !slots.length ? <li className="text-sm text-ss-muted">No slots this day.</li> : null}
            </ul>
          </section>
        </div>
      )}
    </PatientShell>
  );
}
