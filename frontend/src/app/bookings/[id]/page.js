'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Alert from '@/components/Alert';
import PatientShell from '@/components/patient/PatientShell';
import { appointmentsApi, authApi } from '@/lib/api';

export default function BookingConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [appointment, setAppointment] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    authApi
      .me()
      .then((res) => {
        if (res.user.role !== 'patient' && res.user.role !== 'admin') {
          router.replace('/dashboard');
          return;
        }
        setUser(res.user);
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  useEffect(() => {
    if (!user) return;
    appointmentsApi
      .get(params.id)
      .then((data) => setAppointment(data.appointment))
      .catch((err) => setError(err.message));
  }, [params.id, user]);

  if (!user) {
    return (
      <div className="ss-page flex min-h-screen items-center justify-center text-ss-muted">
        Loading…
      </div>
    );
  }

  return (
    <PatientShell user={user}>
      <Alert message={error} />
      {!appointment ? (
        <p className="text-ss-muted">Loading confirmation…</p>
      ) : (
        <div className="mx-auto max-w-lg">
          <div className="ss-card-pad text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-ss-secondary">Appointment confirmed</p>
            <p className="mt-4 text-4xl font-bold text-ss-primary">#{appointment.serialNumber}</p>
            <p className="mt-2 text-sm text-ss-muted">Your chamber serial for {appointment.date}</p>
            <div className="mt-6 rounded-xl border border-dashed border-ss-border bg-ss-surface-elevated/50 p-4 text-left text-sm">
              <p className="font-semibold text-ss-text">{appointment.doctor?.fullName}</p>
              <p className="text-ss-muted">{appointment.chamber?.name}</p>
              <p className="mt-2 text-ss-text">
                {appointment.slotStart}–{appointment.slotEnd}
              </p>
              <p className="mt-2 font-mono text-xs text-ss-muted">Code: {appointment.confirmationCode}</p>
            </div>
            <p className="mt-4 text-xs text-ss-muted">Show this serial at the chamber desk. QR check-in comes in a later sprint.</p>
          </div>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link href="/bookings" className="ss-btn-primary text-center">
              My bookings
            </Link>
            <Link href="/home" className="ss-btn-secondary text-center">
              Find another doctor
            </Link>
          </div>
        </div>
      )}
    </PatientShell>
  );
}
