'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Alert from '@/components/Alert';
import PatientShell from '@/components/patient/PatientShell';
import UserAvatar from '@/components/patient/UserAvatar';
import { StarIcon } from '@/components/patient/icons';
import { authApi, doctorsApi } from '@/lib/api';
import { homePathForRole } from '@/lib/authRedirect';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function DoctorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const doctorId = params.id;
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    authApi
      .me()
      .then((res) => {
        if (res.user.role === 'doctor' || res.user.role === 'admin') {
          router.replace(homePathForRole(res.user.role));
          return;
        }
        setUser(res.user);
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  useEffect(() => {
    if (!user) return;
    doctorsApi
      .getProfile(doctorId)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [doctorId, user]);

  if (!user) {
    return (
      <div className="ss-page flex min-h-screen items-center justify-center text-ss-muted">
        Loading…
      </div>
    );
  }

  const doctor = data?.doctor;

  return (
    <PatientShell user={user}>
      <Link href="/home" className="ss-link mb-4 inline-block text-sm">
        ← Back to search
      </Link>
      <Alert message={error} />
      {!doctor ? (
        <p className="text-ss-muted">Loading profile…</p>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          <section className="ss-card-pad lg:col-span-1">
            <UserAvatar name={doctor.fullName} imageUrl={doctor.avatarUrl} size="lg" showOnline={doctor.isOnline} />
            <h1 className="mt-4 text-2xl font-bold text-ss-text">{doctor.fullName}</h1>
            <p className="text-ss-primary">{doctor.specialtyTitle}</p>
            {doctor.affiliations ? <p className="mt-2 text-sm text-ss-muted">{doctor.affiliations}</p> : null}
            <span className="mt-3 inline-flex items-center gap-1 rounded-lg bg-ss-surface-elevated px-2 py-1 text-sm font-semibold text-ss-tertiary">
              <StarIcon className="h-4 w-4" />
              {doctor.rating?.toFixed(1)}
            </span>
            <Link href={`/doctors/${doctorId}/schedule`} className="ss-btn-primary mt-6 block text-center">
              Book serial
            </Link>
          </section>
          <section className="lg:col-span-2">
            <h2 className="font-semibold text-ss-text">Chambers</h2>
            <ul className="mt-3 space-y-2">
              {data.chambers.map((c) => (
                <li key={c.id} className="ss-card p-3 text-sm">
                  <span className="font-medium text-ss-text">{c.name}</span>
                  {c.area || c.city ? (
                    <span className="text-ss-muted"> · {[c.area, c.city].filter(Boolean).join(', ')}</span>
                  ) : null}
                  {c.address ? <p className="text-ss-muted">{c.address}</p> : null}
                </li>
              ))}
            </ul>
            <h2 className="mt-8 font-semibold text-ss-text">Weekly schedule</h2>
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
              {!data.schedules.length ? <li className="text-sm text-ss-muted">No active hours listed.</li> : null}
            </ul>
          </section>
        </div>
      )}
    </PatientShell>
  );
}
