'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { notificationsApi } from '@/lib/api';
import { timeAgo } from '@/lib/format';

import { Skeleton } from '@/components/Loading';
const POLL_MS = 30000;

export default function NotificationBell({ className = '' }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const boxRef = useRef(null);

  const load = useCallback(() => {
    notificationsApi
      .list({ limit: 6 })
      .then((data) => {
        setItems(data.notifications || []);
        setUnread(data.unread || 0);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!open) return undefined;
    function onDown(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function readAll() {
    await notificationsApi.markAllRead().catch(() => {});
    load();
  }

  async function openItem(n) {
    if (!n.read) await notificationsApi.markRead(n.id).catch(() => {});
    setOpen(false);
    load();
  }

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-ss-border bg-ss-surface transition hover:border-ss-primary/50"
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-ss-text" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unread ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-ss-secondary px-1 text-[11px] font-bold text-slate-900 ring-2 ring-ss-bg">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-ss-border bg-ss-surface shadow-2xl">
          <div className="flex items-center justify-between border-b border-ss-border px-4 py-3">
            <p className="text-sm font-semibold text-ss-text">Notifications</p>
            <button type="button" onClick={readAll} disabled={!unread} className="text-xs font-medium text-ss-primary disabled:opacity-40">
              Mark all read
            </button>
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.map((n) => (
              <li key={n.id}>
                <Link
                  href={n.link || '/notifications'}
                  onClick={() => openItem(n)}
                  className={`block border-b border-ss-border/60 px-4 py-3 transition hover:bg-ss-surface-elevated/60 ${n.read ? '' : 'bg-ss-primary/5'}`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ss-primary" aria-hidden /> : null}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ss-text">{n.title}</p>
                      {n.body ? <p className="mt-0.5 line-clamp-2 text-xs text-ss-muted">{n.body}</p> : null}
                      <p className="mt-1 text-[11px] text-ss-muted">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
            {!loaded ? (
              <li className="space-y-2 p-4" role="status">
                <span className="sr-only">Loading notifications</span>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
              </li>
            ) : null}
            {loaded && !items.length ? <li className="px-4 py-8 text-center text-sm text-ss-muted">You are all caught up.</li> : null}
          </ul>
          <Link href="/notifications" onClick={() => setOpen(false)} className="block px-4 py-3 text-center text-sm font-medium text-ss-primary hover:bg-ss-surface-elevated/60">
            View all
          </Link>
        </div>
      ) : null}
    </div>
  );
}
