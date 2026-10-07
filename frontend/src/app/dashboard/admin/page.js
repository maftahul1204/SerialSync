'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Alert from '@/components/Alert';
import AppHeader from '@/components/AppHeader';
import AppShell from '@/components/AppShell';
import { adminApi, authApi } from '@/lib/api';

const TABS = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All' },
];

function statusBadge(status) {
  if (status === 'approved') return 'ss-badge-active';
  if (status === 'rejected') return 'ss-badge-inactive';
  return 'inline-flex rounded-full bg-ss-tertiary/20 px-2.5 py-0.5 text-xs font-semibold text-ss-tertiary';
}

export default function AdminDoctorsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('pending');
  const [doctors, setDoctors] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await adminApi.listDoctors(tab);
      setDoctors(data.doctors);
      setCounts(data.counts || { pending: 0, approved: 0, rejected: 0 });
    } catch (err) {
      setError(err.message || 'Failed to load doctors');
    }
  }, [tab]);

  useEffect(() => {
    authApi
      .me()
      .then((data) => {
        if (data.user.role !== 'admin') {
          router.replace('/dashboard');
          return;
        }
        setUser(data.user);
        return load();
      })
      .catch(() => router.replace('/login'));
  }, [router, load]);

  async function handleLogout() {
    await authApi.logout();
    router.push('/login');
  }

  async function setApproval(doctorId, status) {
    setBusyId(doctorId);
    setError('');
    try {
      await adminApi.setDoctorApproval(doctorId, status);
      await load();
    } catch (err) {
      setError(err.message || 'Update failed');
    } finally {
      setBusyId('');
    }
  }

  if (!user) {
    return (
      <div className="ss-page flex min-h-screen items-center justify-center text-ss-muted">
        Loading admin panel…
      </div>
    );
  }

  return (
    <AppShell header={<AppHeader active="admin" onLogout={handleLogout} isAdmin showSchedule />}>
      <p className="text-xs font-semibold uppercase tracking-wide text-ss-primary">Administration</p>
      <h1 className="mt-1 text-2xl font-bold text-ss-text">Doctor approvals</h1>
      <p className="mt-1 max-w-2xl text-sm text-ss-muted">
        New doctor registrations stay pending until you approve them. Only approved doctors appear in patient search
        and can manage chambers and schedules.
      </p>

      <Alert message={error} />

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={tab === t.id ? 'ss-pill ss-pill-active' : 'ss-pill'}
          >
            {t.label}
            {t.id === 'pending' && counts.pending ? ` (${counts.pending})` : ''}
          </button>
        ))}
      </div>

      <ul className="mt-8 space-y-3">
        {doctors.map((doc) => (
          <li key={doc.id} className="ss-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-semibold text-ss-text">{doc.fullName}</p>
              <p className="text-sm text-ss-muted">{doc.email}</p>
              {doc.doctorProfile?.specialtyTitle ? (
                <p className="mt-1 text-sm text-ss-primary">{doc.doctorProfile.specialtyTitle}</p>
              ) : null}
              {doc.doctorProfile?.affiliations ? (
                <p className="text-sm text-ss-muted">{doc.doctorProfile.affiliations}</p>
              ) : null}
              <span className={`${statusBadge(doc.doctorApprovalStatus)} mt-2`}>
                {doc.doctorApprovalStatus || 'pending'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {doc.doctorApprovalStatus !== 'approved' ? (
                <button
                  type="button"
                  disabled={busyId === doc.id}
                  onClick={() => setApproval(doc.id, 'approved')}
                  className="ss-btn-primary px-4 py-2 text-sm"
                >
                  Approve
                </button>
              ) : null}
              {doc.doctorApprovalStatus !== 'rejected' ? (
                <button
                  type="button"
                  disabled={busyId === doc.id}
                  onClick={() => setApproval(doc.id, 'rejected')}
                  className="ss-btn-danger-outline px-4 py-2 text-sm"
                >
                  Reject
                </button>
              ) : null}
              {doc.doctorApprovalStatus === 'rejected' ? (
                <button
                  type="button"
                  disabled={busyId === doc.id}
                  onClick={() => setApproval(doc.id, 'approved')}
                  className="ss-btn-secondary px-4 py-2 text-sm"
                >
                  Approve anyway
                </button>
              ) : null}
            </div>
          </li>
        ))}
        {!doctors.length ? (
          <li className="ss-card p-6 text-sm text-ss-muted">No doctors in this list.</li>
        ) : null}
      </ul>
    </AppShell>
  );
}
