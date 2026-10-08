'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Alert from '@/components/Alert';
import BrandMark from '@/components/BrandMark';
import { scheduleApi } from '@/lib/api';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function DoctorPublicSchedulePage() {
  const params = useParams();
  const doctorId = params.id;
  const [data, setData] = useState(null);
  const [slots, setSlots] = useState([]);
  const [error, setError] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    scheduleApi
      .getDoctorSchedule(doctorId)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [doctorId]);

  useEffect(() => {
    if (!date || !doctorId) return;
    scheduleApi
      .getDoctorSlots(doctorId, date, date)
      .then((res) => setSlots(res.slots))
      .catch((err) => setError(err.message));
  }, [doctorId, date]);

  return (
    <div className="ss-page">
      <header className="border-b border-ss-border bg-ss-surface/80 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <BrandMark href="/" />
          <Link href="/login" className="ss-link text-sm">
            Sign in
          </Link>
        </div>
      </header>
      <main className="mx-auto grid max-w-4xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
        <Alert message={error} />
        {!data ? (
          <p className="text-ss-muted">Loading schedule…</p>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-ss-text">{data.doctor.fullName}</h1>
            <p className="mt-1 text-ss-muted">Chamber hours and open slots by date</p>

            <section className="mt-8 lg:mt-0">
              <h2 className="font-semibold text-ss-text">Chambers</h2>
              <ul className="mt-3 space-y-2">
                {data.chambers.map((c) => (
                  <li key={c.id} className="ss-card p-3 text-sm">
                    <span className="font-medium text-ss-text">{c.name}</span>
                    {c.city ? <span className="text-ss-muted"> · {c.city}</span> : null}
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

            <section className="ss-card-pad mt-8 lg:col-span-2">
              <h2 className="font-semibold text-ss-text">Slots on a date</h2>
              <input type="date" className="ss-input mt-3 max-w-xs" value={date} onChange={(e) => setDate(e.target.value)} />
              <ul className="mt-4 space-y-2">
                {slots.map((slot) => (
                  <li key={`${slot.scheduleId}-${slot.slotStart}`} className="flex justify-between text-sm">
                    <span className="text-ss-text">
                      {slot.slotStart}–{slot.slotEnd}
                    </span>
                    <span className="text-ss-muted">
                      {slot.remaining} open · ৳{slot.consultationFee}
                    </span>
                  </li>
                ))}
                {date && !slots.length ? <li className="text-sm text-ss-muted">No slots this day.</li> : null}
              </ul>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
