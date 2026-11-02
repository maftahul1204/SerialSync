'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@/components/Alert';
import AppHeader from '@/components/AppHeader';
import AppShell from '@/components/AppShell';
import FieldLabel from '@/components/FieldLabel';
import { authApi, queueApi, scheduleApi } from '@/lib/api';
import { createQueueSocket } from '@/lib/socket';

import { PageSkeleton } from '@/components/Loading';
function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AssistantConsolePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [chambers, setChambers] = useState([]);
  const [chamberId, setChamberId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [queue, setQueue] = useState(null);
  const [walkName, setWalkName] = useState('');
  const [afterSerial, setAfterSerial] = useState('');

  useEffect(() => {
    authApi
      .me()
      .then((res) => {
        if (!['assistant', 'admin'].includes(res.user.role)) {
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
      .listChamberDirectory()
      .then((data) => setChambers(data.chambers || []))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!queue?.sessionId) return;
    const socket = createQueueSocket();
    socket.emit('join_queue', { sessionId: queue.sessionId });
    socket.on('queue_updated', setQueue);
    return () => socket.disconnect();
  }, [queue?.sessionId]);

  async function openSession() {
    setError('');
    if (!chamberId || !doctorId) {
      setError('Select chamber and enter doctor user id');
      return;
    }
    try {
      const data = await queueApi.openSession({
        chamberId,
        doctorId,
        date: todayYmd(),
      });
      setQueue(data.queue);
    } catch (err) {
      setError(err.message);
    }
  }

  async function act(fn) {
    setError('');
    try {
      const data = await fn();
      setQueue(data.queue);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!user) {
    return (
      <PageSkeleton />
    );
  }

  return (
    <AppShell header={<AppHeader active="dashboard" isAdmin={user.role === 'admin'} showSchedule={false} />}>
      <Alert message={error} />
      <h1 className="text-2xl font-bold text-ss-text">Queue assistant console</h1>
      <p className="mt-1 text-sm text-ss-muted">Call next serial, walk-ins (#11B), no-show, delay & pause</p>

      {!queue ? (
        <div className="ss-card mt-6 max-w-lg space-y-4 p-5">
          <label className="block text-sm">
            <FieldLabel required className="text-ss-muted">Chamber</FieldLabel>
            <select
              required
              className="ss-input mt-1 w-full"
              value={chamberId}
              onChange={(e) => {
                const id = e.target.value;
                setChamberId(id);
                const c = chambers.find((x) => x.id === id);
                if (c?.doctorId) setDoctorId(c.doctorId);
              }}
            >
              <option value="">Select…</option>
              {chambers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.area})
                </option>
              ))}
            </select>
          </label>
          <p className="rounded-xl border border-ss-border bg-ss-surface-elevated/60 px-3 py-2 text-sm text-ss-muted">
            Doctor:{' '}
            <span className="font-medium text-ss-text">
              {chambers.find((c) => c.id === chamberId)?.doctorName || 'select a chamber'}
            </span>
          </p>
          <button type="button" className="ss-btn-primary w-full" onClick={openSession}>
            Open today&apos;s session
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="ss-card p-6 text-center">
            <p className="text-xs uppercase text-ss-muted">Now serving</p>
            <p className="text-5xl font-bold text-ss-primary">{queue.nowServing?.label || '—'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="ss-btn-primary min-h-12 flex-1" onClick={() => act(() => queueApi.advance(queue.sessionId))}>
              Call next
            </button>
            <button type="button" className="ss-btn-secondary" onClick={() => act(() => queueApi.undo(queue.sessionId))}>
              Undo (60s)
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {[15, 30, 45].map((m) => (
              <button
                key={m}
                type="button"
                className="ss-btn-secondary text-sm"
                onClick={() => act(() => queueApi.delay(queue.sessionId, { delayMinutes: m, delayReason: 'Doctor delayed' }))}
              >
                +{m}m delay
              </button>
            ))}
            <button
              type="button"
              className="ss-btn-secondary text-sm"
              onClick={() => act(() => queueApi.pause(queue.sessionId, { paused: true, pauseMessage: 'Prayer / lunch break' }))}
            >
              Pause
            </button>
            <button
              type="button"
              className="ss-btn-secondary text-sm"
              onClick={() => act(() => queueApi.pause(queue.sessionId, { paused: false }))}
            >
              Resume
            </button>
          </div>
          <div className="ss-card space-y-3 p-4">
            <p className="font-semibold text-ss-text">Emergency walk-in</p>
            <label className="block text-sm">
              <FieldLabel required className="text-ss-muted">Patient name</FieldLabel>
            <input
              className="ss-input mt-1 w-full"
              required
              placeholder="Patient name"
              value={walkName}
              onChange={(e) => setWalkName(e.target.value)}
            />
            </label>
            <label className="block text-sm">
              <FieldLabel required className="text-ss-muted">After serial</FieldLabel>
            <input
              className="ss-input mt-1 w-full"
              required
              inputMode="numeric"
              placeholder="e.g. 11"
              value={afterSerial}
              onChange={(e) => setAfterSerial(e.target.value)}
            />
            </label>
            <button
              type="button"
              className="ss-btn-secondary w-full"
              onClick={() =>
                act(() =>
                  queueApi.walkIn(queue.sessionId, {
                    patientName: walkName,
                    afterSerial: Number(afterSerial),
                    priority: 'emergency',
                  })
                )
              }
            >
              Insert walk-in (#{afterSerial}B)
            </button>
          </div>
          <ul className="ss-card divide-y divide-ss-border p-2 text-sm">
            {queue.items?.map((item) => (
              <li key={item.id} className="flex items-center justify-between py-2 px-2">
                <span>#{item.label}</span>
                {item.kind === 'booking' ? (
                  <button
                    type="button"
                    className="text-xs text-red-300"
                    onClick={() => act(() => queueApi.noShow(queue.sessionId, item.id))}
                  >
                    No-show
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </AppShell>
  );
}
