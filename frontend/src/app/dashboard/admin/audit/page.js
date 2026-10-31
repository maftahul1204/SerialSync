'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Alert from '@/components/Alert';
import AppHeader from '@/components/AppHeader';
import AppShell from '@/components/AppShell';
import { adminApi, authApi } from '@/lib/api';

import { ListSkeleton, PageSkeleton } from '@/components/Loading';
const ACTIONS = ['', 'doctor.approved', 'doctor.rejected', 'doctor.pending', 'report.upload', 'test.create', 'test.update'];

export default function AuditLogPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [entries, setEntries] = useState([]);
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    authApi
      .me()
      .then((res) => {
        if (res.user.role !== 'admin') {
          router.replace('/dashboard');
          return;
        }
        setUser(res.user);
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  useEffect(() => {
    if (!user) return;
    adminApi
      .audit({ page, limit: 20, action })
      .then((data) => {
        setEntries(data.entries);
        setPages(data.pagination.pages);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoaded(true));
  }, [user, page, action]);

  async function logout() {
    await authApi.logout();
    router.push('/login');
  }

  if (!user) return <PageSkeleton />;

  return (
    <AppShell header={<AppHeader active="audit" isAdmin onLogout={logout} />}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ss-text">Audit log</h1>
          <p className="text-sm text-ss-muted">Every privileged change, newest first.</p>
        </div>
        <label className="text-sm text-ss-muted">
          Action
          <select className="ss-input mt-1" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a || 'All actions'}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-4">
        <Alert message={error} />
      </div>
      <div className="ss-card mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-ss-border text-xs uppercase tracking-wide text-ss-muted">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Who</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Target</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-ss-border/60 last:border-0">
                <td className="whitespace-nowrap px-4 py-3 text-ss-muted">{new Date(e.at).toLocaleString()}</td>
                <td className="px-4 py-3 text-ss-text">{e.actorEmail}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full border border-ss-primary/30 bg-ss-primary/10 px-2 py-0.5 font-mono text-xs text-ss-primary">{e.action}</span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-ss-muted">
                  {e.targetType} {e.targetId ? `· ${e.targetId.slice(-6)}` : ''}
                </td>
              </tr>
            ))}
            {!loaded ? (
              <tr>
                <td colSpan={4} className="p-4">
                  <ListSkeleton rows={3} lines={0} action={false} label="Loading audit log" />
                </td>
              </tr>
            ) : null}
            {loaded && !entries.length ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-ss-muted">
                  No entries yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {pages > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <button type="button" className="ss-btn-secondary px-3 py-1.5" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <span className="text-ss-muted">Page {page} of {pages}</span>
          <button type="button" className="ss-btn-secondary px-3 py-1.5" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      ) : null}
    </AppShell>
  );
}
