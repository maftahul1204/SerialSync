'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Alert from '@/components/Alert';
import BookingCard from '@/components/booking/BookingCard';
import PatientShell from '@/components/patient/PatientShell';
import { appointmentsApi, authApi } from '@/lib/api';

export default function BookingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await appointmentsApi.listMine();
      setAppointments(data.appointments);
    } catch (err) {
      setError(err.message || 'Could not load bookings');
    }
  }, []);

  useEffect(() => {
    authApi
      .me()
      .then((res) => {
        if (res.user.role !== 'patient' && res.user.role !== 'admin') {
          router.replace('/dashboard');
          return;
        }
        setUser(res.user);
        return load();
      })
      .catch(() => router.replace('/login'));
  }, [router, load]);

  async function handleCancel(id) {
    if (!window.confirm('Cancel this appointment? The slot will be released.')) return;
    setBusyId(id);
    setError('');
    try {
      await appointmentsApi.cancel(id);
      await load();
    } catch (err) {
      setError(err.message || 'Cancel failed');
    } finally {
      setBusyId('');
    }
  }

  if (!user) {
    return (
      <div className="ss-page flex min-h-screen items-center justify-center text-ss-muted">
        Loading bookings…
      </div>
    );
  }

  const upcoming = appointments.filter((a) => a.status !== 'cancelled' && a.status !== 'completed');

  return (
    <PatientShell user={user}>
      <h1 className="text-2xl font-bold text-ss-text">My bookings</h1>
      <p className="mt-1 text-sm text-ss-muted">Upcoming chamber visits and serial numbers.</p>
      <Alert message={error} />
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {upcoming.map((a) => (
          <BookingCard key={a.id} appointment={a} onCancel={handleCancel} busy={busyId === a.id} />
        ))}
        {!upcoming.length ? (
          <p className="ss-card p-6 text-sm text-ss-muted lg:col-span-2">
            No upcoming bookings. Find a doctor on the home screen to book a serial.
          </p>
        ) : null}
      </div>
      {appointments.some((a) => a.status === 'cancelled') ? (
        <section className="mt-10">
          <h2 className="font-semibold text-ss-text">Cancelled</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {appointments
              .filter((a) => a.status === 'cancelled')
              .map((a) => (
                <BookingCard key={a.id} appointment={a} />
              ))}
          </div>
        </section>
      ) : null}
    </PatientShell>
  );
}
