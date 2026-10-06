'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Alert from '@/components/Alert';
import AppHeader from '@/components/AppHeader';
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        Loading dashboard…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader active="dashboard" onLogout={handleLogout} />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <Alert message={error} />
        <h1 className="text-2xl font-bold text-slate-900">Welcome, {user.fullName}</h1>
        <p className="mt-2 text-slate-600">
          Signed in as <span className="font-medium capitalize">{user.role}</span> · {user.email}
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/profile"
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-300"
          >
            <h2 className="font-semibold text-slate-900">Profile</h2>
            <p className="mt-1 text-sm text-slate-500">View and update your account details</p>
          </Link>
          {(user.role === 'doctor' || user.role === 'admin') && (
            <Link
              href="/dashboard/schedule"
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-300"
            >
              <h2 className="font-semibold text-slate-900">Schedule</h2>
              <p className="mt-1 text-sm text-slate-500">Chambers, fees, and weekly availability</p>
            </Link>
          )}
          <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-5 text-sm text-slate-500">
            Queue tracker and full booking flow still to do in later sprints.
          </div>
        </div>
      </main>
    </div>
  );
}
