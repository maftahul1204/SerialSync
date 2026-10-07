'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Alert from '@/components/Alert';
import AppHeader from '@/components/AppHeader';
import AppShell from '@/components/AppShell';
import { authApi } from '@/lib/api';

function doctorApproved(user) {
  return user?.role !== 'doctor' || user.doctorApprovalStatus === 'approved';
}

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

  const isAdmin = user.role === 'admin';
  const isDoctor = user.role === 'doctor';
  const approval = user.doctorApprovalStatus || 'pending';
  const canUseSchedule = (isDoctor && approval === 'approved') || isAdmin;

  return (
    <AppShell
      header={
        <AppHeader
          active="dashboard"
          onLogout={handleLogout}
          isAdmin={isAdmin}
          showSchedule={canUseSchedule}
        />
      }
    >
      <Alert message={error} />
      <h1 className="text-2xl font-bold text-ss-text">Welcome, {user.fullName}</h1>
      <p className="mt-2 text-ss-muted">
        Signed in as <span className="font-medium capitalize text-ss-text">{user.role}</span> · {user.email}
      </p>

      {isDoctor && approval === 'pending' ? (
        <div className="ss-card mt-6 border-ss-tertiary/40 bg-ss-tertiary/10 p-5">
          <h2 className="font-semibold text-ss-text">Awaiting admin approval</h2>
          <p className="mt-2 text-sm text-ss-muted">
            Your doctor profile was submitted successfully. A SerialSync administrator will review your registration
            before you can add chambers, publish schedules, or appear in patient search.
          </p>
        </div>
      ) : null}

      {isDoctor && approval === 'rejected' ? (
        <div className="ss-card mt-6 border-red-500/40 bg-red-500/10 p-5">
          <h2 className="font-semibold text-red-200">Registration not approved</h2>
          <p className="mt-2 text-sm text-ss-muted">
            Your doctor account was not approved. Contact your clinic administrator or SerialSync support for help.
          </p>
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/profile" className="ss-card block p-5 transition hover:border-ss-primary/50">
          <h2 className="font-semibold text-ss-text">Profile</h2>
          <p className="mt-1 text-sm text-ss-muted">View and update your account details</p>
        </Link>
        {canUseSchedule ? (
          <Link href="/dashboard/schedule" className="ss-card block p-5 transition hover:border-ss-primary/50">
            <h2 className="font-semibold text-ss-text">Schedule portal</h2>
            <p className="mt-1 text-sm text-ss-muted">Chambers, fees, and weekly availability</p>
          </Link>
        ) : null}
        {isAdmin ? (
          <Link href="/dashboard/admin" className="ss-card block p-5 transition hover:border-ss-primary/50">
            <h2 className="font-semibold text-ss-text">Doctor approvals</h2>
            <p className="mt-1 text-sm text-ss-muted">Review pending registrations and approve specialists</p>
          </Link>
        ) : null}
        {!isDoctor && !isAdmin ? (
          <Link href="/home" className="ss-card block p-5 transition hover:border-ss-primary/50">
            <h2 className="font-semibold text-ss-text">Find doctors</h2>
            <p className="mt-1 text-sm text-ss-muted">Search specialists and book serials</p>
          </Link>
        ) : null}
      </div>
    </AppShell>
  );
}
