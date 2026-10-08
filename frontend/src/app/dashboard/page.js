'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Alert from '@/components/Alert';
import AppHeader from '@/components/AppHeader';
import AppShell from '@/components/AppShell';
import { authApi } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    authApi
      .me()
      .then((data) => setUser(data.user))
      .catch(() => {
        setError('Please sign in to continue');
        router.replace('/login');
      });
  }, [router]);

  async function handleLogout() {
    await authApi.logout();
    router.push('/login');
  }

  if (!user) {
    return (
      <div className="ss-page flex items-center justify-center text-ss-muted">
        Loading dashboard…
      </div>
    );
  }

  return (
    <AppShell header={<AppHeader active="dashboard" onLogout={handleLogout} />}>
        <Alert message={error} />
        <h1 className="text-2xl font-bold text-ss-text">Welcome, {user.fullName}</h1>
        <p className="mt-2 text-ss-muted">
          Signed in as <span className="font-medium capitalize text-ss-text">{user.role}</span> · {user.email}
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/profile"
            className="ss-card block p-5 transition hover:border-ss-primary/50"
          >
            <h2 className="font-semibold text-ss-text">Profile</h2>
            <p className="mt-1 text-sm text-ss-muted">View and update your account details</p>
          </Link>
          {(user.role === 'doctor' || user.role === 'admin') && (
            <Link
              href="/dashboard/schedule"
              className="ss-card block p-5 transition hover:border-ss-primary/50"
            >
              <h2 className="font-semibold text-ss-text">Schedule portal</h2>
              <p className="mt-1 text-sm text-ss-muted">Chambers, fees, and weekly availability</p>
            </Link>
          )}
          <div className="rounded-xl border border-dashed border-ss-border bg-ss-surface/50 p-5 text-sm text-ss-muted lg:col-span-3">
            Queue tracker and full booking flow still to do in later sprints.
          </div>
        </div>
    </AppShell>
  );
}
