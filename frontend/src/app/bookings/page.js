'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Alert from '@/components/Alert';
import BookingCard from '@/components/booking/BookingCard';
import PatientShell from '@/components/patient/PatientShell';
import { appointmentsApi, authApi } from '@/lib/api';

import { ListSkeleton, PageSkeleton } from '@/components/Loading';
import ReasonDialog from '@/components/ReasonDialog';
export default function BookingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await appointmentsApi.listMine();
      setAppointments(data.appointments);
    } catch (err) {
      setError(err.message || 'Could not load bookings');
    } finally {
      setLoaded(true);
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

  function handleCancel(id) {
    setCancelTarget(appointments.find((x) => x.id === id) || null);
  }

  if (!user) {
    return (
      <PageSkeleton />
    );
  }

  const upcoming = appointments.filter((a) => a.status === 'booked' || a.status === 'confirmed');
  const past = appointments.filter((a) => a.status === 'completed' || a.status === 'no_show');

  return (
    <PatientShell user={user}>
      <h1 className="text-2xl font-bold text-ss-text">My bookings</h1>
      <p className="mt-1 text-sm text-ss-muted">Upcoming chamber visits and serial numbers.</p>
      <Alert message={error} />
      {!loaded ? <div className="mt-6"><ListSkeleton rows={2} columns={2} label="Loading your bookings" /></div> : null}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {upcoming.map((a) => (
          <BookingCard key={a.id} appointment={a} onCancel={handleCancel} busy={busyId === a.id} />
        ))}
        {loaded && !upcoming.length ? (
          <p className="ss-card p-6 text-sm text-ss-muted lg:col-span-2">
            No upcoming bookings. Find a doctor on the home screen to book a serial.
          </p>
        ) : null}
      </div>
      {past.length ? (
        <section className="mt-10">
          <h2 className="font-semibold text-ss-text">Past visits</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {past.map((a) => (
              <BookingCard key={a.id} appointment={a} />
            ))}
          </div>
        </section>
      ) : null}
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
      <ReasonDialog
        open={Boolean(cancelTarget)}
        title="Cancel this appointment?"
        message="Your slot is released for other patients and the doctor is informed."
        confirmLabel="Cancel appointment"
        required={false}
        placeholder="Tell the doctor why (optional)"
        onConfirm={async (reason) => {
          await appointmentsApi.cancel(cancelTarget.id, reason);
          setCancelTarget(null);
          await load();
        }}
        onClose={() => setCancelTarget(null)}
      />
    </PatientShell>
  );
}
