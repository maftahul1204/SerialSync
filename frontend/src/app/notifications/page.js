'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Alert from '@/components/Alert';
import AppHeader from '@/components/AppHeader';
import AppShell from '@/components/AppShell';
import PatientShell from '@/components/patient/PatientShell';
import { authApi, notificationsApi } from '@/lib/api';
import { timeAgo } from '@/lib/format';

import { ListSkeleton, PageSkeleton } from '@/components/Loading';
const TYPE_LABEL = {
  booking_confirmed: 'Booking',
  booking_cancelled: 'Booking',
  queue_turn_soon: 'Queue',
  queue_delay: 'Queue',
  order_update: 'Lab order',
  report_ready: 'Report',
  doctor_approval: 'Account',
  system: 'Update',
};

export default function NotificationsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    authApi
      .me()
      .then((res) => setUser(res.user))
      .catch(() => router.replace('/login'));
  }, [router]);

  const load = useCallback(() => {
    notificationsApi
      .list({ page, limit: 15 })
      .then((data) => {
        setItems(data.notifications);
        setUnread(data.unread);
        setPages(data.pagination.pages);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoaded(true));
  }, [page]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  async function readAll() {
    await notificationsApi.markAllRead();
    load();
  }

  if (!user) {
    return <PageSkeleton />;
  }

  const body = (
    <>
      <Alert message={error} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ss-text">Notifications</h1>
          <p className="text-sm text-ss-muted">{unread ? `${unread} unread` : 'Everything is read'}</p>
        </div>
        <button type="button" onClick={readAll} disabled={!unread} className="ss-btn-secondary text-sm disabled:opacity-40">
          Mark all read
        </button>
      </div>

      <ul className="mt-6 space-y-3">
        {items.map((n) => (
          <li key={n.id}>
            <Link
              href={n.link || '#'}
              onClick={() => !n.read && notificationsApi.markRead(n.id).then(load)}
              className={`ss-card block p-4 transition hover:border-ss-primary/50 ${n.read ? '' : 'border-ss-primary/40'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ss-primary">
                    {TYPE_LABEL[n.type] || 'Update'}
                    {n.smsStatus === 'sent' ? ' · SMS sent' : ''}
                  </p>
                  <p className="mt-1 font-medium text-ss-text">{n.title}</p>
                  {n.body ? <p className="mt-1 text-sm text-ss-muted">{n.body}</p> : null}
                </div>
                <span className="shrink-0 text-xs text-ss-muted">{timeAgo(n.createdAt)}</span>
              </div>
            </Link>
          </li>
        ))}
        {!loaded ? <ListSkeleton rows={3} lines={1} action={false} label="Loading notifications" /> : null}
        {loaded && !items.length ? <p className="text-ss-muted">No notifications yet.</p> : null}
      </ul>

      {pages > 1 ? (
        <div className="mt-6 flex items-center justify-center gap-3 text-sm">
          <button type="button" className="ss-btn-secondary px-3 py-1.5" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span className="text-ss-muted">
            Page {page} of {pages}
          </span>
          <button type="button" className="ss-btn-secondary px-3 py-1.5" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      ) : null}
    </>
  );

  if (user.role === 'patient') return <PatientShell user={user}>{body}</PatientShell>;
  return (
    <AppShell header={<AppHeader active="notifications" isAdmin={user.role === 'admin'} />} width="4xl">
      {body}
    </AppShell>
  );
}
