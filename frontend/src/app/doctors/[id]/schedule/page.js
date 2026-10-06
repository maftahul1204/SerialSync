'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Alert from '@/components/Alert';
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
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="text-lg font-semibold text-teal-700">
            SerialSync
          </Link>
          <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900">
            Sign in
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Alert message={error} />
        {!data ? (
          <p className="text-slate-600">Loading schedule…</p>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-slate-900">{data.doctor.fullName}</h1>
            <p className="mt-1 text-slate-600">Chamber hours and open slots by date</p>

            <section className="mt-8">
              <h2 className="font-semibold text-slate-900">Chambers</h2>
              <ul className="mt-3 space-y-2">
                {data.chambers.map((c) => (
                  <li key={c.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                    <span className="font-medium">{c.name}</span>
                    {c.city ? <span className="text-slate-500"> · {c.city}</span> : null}
                    {c.address ? <p className="text-slate-500">{c.address}</p> : null}
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-8">
              <h2 className="font-semibold text-slate-900">Weekly hours</h2>
              <ul className="mt-3 space-y-2">
                {data.schedules.map((s) => (
                  <li key={s.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                    <span className="font-medium">{s.chamber?.name}</span>
                    <p className="text-slate-600">
                      {s.daysOfWeek.map((d) => DAY_LABELS[d]).join(', ')} · {s.startTime}–{s.endTime} · ৳
                      {s.consultationFee}
                    </p>
                  </li>
                ))}
                {!data.schedules.length ? <li className="text-sm text-slate-500">No active availability.</li> : null}
              </ul>
            </section>

            <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="font-semibold text-slate-900">Slots on a date</h2>
              <input
                type="date"
                className="mt-3 rounded-lg border border-slate-300 px-3 py-2"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <ul className="mt-4 space-y-2">
                {slots.map((slot) => (
                  <li key={`${slot.scheduleId}-${slot.slotStart}`} className="flex justify-between text-sm">
                    <span>
                      {slot.slotStart}–{slot.slotEnd}
                    </span>
                    <span className="text-slate-600">
                      {slot.remaining} open · ৳{slot.consultationFee}
                    </span>
                  </li>
                ))}
                {date && !slots.length ? <li className="text-sm text-slate-500">No slots this day.</li> : null}
              </ul>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
