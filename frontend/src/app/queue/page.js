'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@/components/Alert';
import PatientShell from '@/components/patient/PatientShell';
import { authApi, queueApi } from '@/lib/api';
import { createQueueSocket } from '@/lib/socket';

import { ListSkeleton, PageSkeleton } from '@/components/Loading';
export default function QueuePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [view, setView] = useState(null);

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
    queueApi
      .myToday()
      .then((data) => setView(data))
      .catch((err) => setError(err.message));
  }, [user]);

  useEffect(() => {
    if (!view?.queue?.sessionId) return;
    const socket = createQueueSocket();
    const sessionId = view.queue.sessionId;
    socket.emit('join_queue', { sessionId });
    socket.on('queue_updated', (queue) => {
      setView((prev) => (prev ? { ...prev, queue } : prev));
    });
    socket.on('delay_broadcast', () => {});
    return () => {
      socket.emit('leave_queue', { sessionId });
      socket.disconnect();
    };
  }, [view?.queue?.sessionId]);

  useEffect(() => {
    if (!view?.queue || view.patientsAhead === undefined) return;
    if (view.patientsAhead <= 2 && view.patientsAhead > 0 && typeof window !== 'undefined') {
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.value = 0.08;
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } catch {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chime should fire only when the position or now-serving label changes
  }, [view?.patientsAhead, view?.queue?.nowServing?.label]);

  if (!user) {
    return (
      <PageSkeleton />
    );
  }

  const queue = view?.queue;

  return (
    <PatientShell user={user}>
      <Alert message={error} />
      <h1 className="text-2xl font-bold text-ss-text">Live queue</h1>
      <p className="mt-1 text-sm text-ss-muted">Real-time chamber progress (Socket.io)</p>

      {!view ? (
        <div className="mt-8"><ListSkeleton rows={2} lines={3} label="Loading your queue" action={false} /></div>
      ) : !queue ? (
        <div className="ss-card mt-8 p-6">
          <p className="text-ss-text">{view.message || 'No appointment today'}</p>
          <p className="mt-2 text-sm text-ss-muted">Book a serial from Home, then return on your visit day.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {queue.status === 'paused' ? (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
              {queue.pauseMessage || 'Session paused temporarily'}
            </div>
          ) : null}
          {queue.delayMinutes > 0 ? (
            <div className="rounded-xl border border-ss-tertiary/40 bg-ss-tertiary/10 p-4 text-sm">
              Doctor delayed ~{queue.delayMinutes} minutes
              {queue.delayReason ? ` — ${queue.delayReason}` : ''}
            </div>
          ) : null}

          <div className="ss-token-card text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-ss-muted">Now serving</p>
            <p className="mt-2 text-5xl font-bold tabular-nums text-ss-primary">
              {queue.nowServing?.label || '—'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="ss-token-card p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-ss-muted">Your token</p>
              <p className="mt-1 text-4xl font-bold tabular-nums text-ss-primary">{view.serialNumber}</p>
              <p className="mt-1 text-sm font-medium text-ss-secondary">In waiting</p>
            </div>
            <div className="ss-card p-4 text-center">
              <p className="text-xs text-ss-muted">Patients ahead</p>
              <p className="mt-1 text-2xl font-semibold text-ss-text">{view.patientsAhead ?? '—'}</p>
            </div>
          </div>

          <div className="ss-card p-4">
            <p className="text-sm text-ss-muted">
              Estimated wait ~{view.estimatedWaitMinutes ?? 0} min (15 min per patient + delays)
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              {queue.upNext?.map((item) => (
                <li key={item.id} className="flex justify-between border-b border-ss-border/50 pb-2">
                  <span className="font-medium text-ss-text">#{item.label}</span>
                  <span className="text-ss-muted capitalize">{item.kind}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </PatientShell>
  );
}
