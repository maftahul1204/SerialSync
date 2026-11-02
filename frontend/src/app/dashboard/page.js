'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Alert from '@/components/Alert';
import AppHeader from '@/components/AppHeader';
import AppShell from '@/components/AppShell';
import DoctorDay from '@/components/doctor/DoctorDay';
import DocumentsPanel from '@/components/doctor/DocumentsPanel';
import { authApi } from '@/lib/api';

import { PageSkeleton } from '@/components/Loading';
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
      <PageSkeleton />
    );
  }

  const isAdmin = user.role === 'admin';
  const isDoctor = user.role === 'doctor';
  const isAssistant = user.role === 'assistant';
  const isPhlebotomist = user.role === 'phlebotomist';
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
            Your doctor account was not approved.
          </p>
          {user.doctorApprovalNote ? (
            <p className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
              <span className="font-semibold">Reason from the administrator:</span> {user.doctorApprovalNote}
            </p>
          ) : null}
          <p className="mt-2 text-sm text-ss-muted">Upload corrected documents below and your registration goes back for review.</p>
        </div>
      ) : null}

      {isDoctor && approval !== 'approved' ? <DocumentsPanel user={user} onUpdated={setUser} /> : null}

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
          <>
            <Link href="/dashboard/admin/diagnostics" className="ss-card block p-5 transition hover:border-ss-primary/50">
              <h2 className="font-semibold text-ss-text">Lab reports &amp; catalogue</h2>
              <p className="mt-1 text-sm text-ss-muted">Upload signed reports and manage tests and prices</p>
            </Link>
            <Link href="/dashboard/admin/audit" className="ss-card block p-5 transition hover:border-ss-primary/50">
              <h2 className="font-semibold text-ss-text">Audit log</h2>
              <p className="mt-1 text-sm text-ss-muted">Who approved, uploaded or changed what</p>
            </Link>
          </>
        ) : null}
        {isAdmin ? (
          <Link href="/dashboard/admin" className="ss-card block p-5 transition hover:border-ss-primary/50">
            <h2 className="font-semibold text-ss-text">Doctor approvals</h2>
            <p className="mt-1 text-sm text-ss-muted">Review pending registrations and approve specialists</p>
          </Link>
        ) : null}
        {isAssistant || isAdmin ? (
          <Link href="/dashboard/assistant" className="ss-card block p-5 transition hover:border-ss-primary/50">
            <h2 className="font-semibold text-ss-text">Queue console</h2>
            <p className="mt-1 text-sm text-ss-muted">Advance serials, walk-ins, delays</p>
          </Link>
        ) : null}
        {isPhlebotomist || isAdmin ? (
          <Link href="/dashboard/collections" className="ss-card block p-5 transition hover:border-ss-primary/50">
            <h2 className="font-semibold text-ss-text">Home collections</h2>
            <p className="mt-1 text-sm text-ss-muted">Phlebotomist dispatch and barcodes</p>
          </Link>
        ) : null}
        {!isDoctor && !isAdmin && !isAssistant && !isPhlebotomist ? (
          <>
            <Link href="/home" className="ss-card block p-5 transition hover:border-ss-primary/50">
              <h2 className="font-semibold text-ss-text">Find doctors</h2>
              <p className="mt-1 text-sm text-ss-muted">Search specialists and book serials</p>
            </Link>
            <Link href="/diagnostics" className="ss-card block p-5 transition hover:border-ss-primary/50">
              <h2 className="font-semibold text-ss-text">Home diagnostics</h2>
              <p className="mt-1 text-sm text-ss-muted">Book tests and view lab reports</p>
            </Link>
          </>
        ) : null}
      </div>

      {isDoctor && approval === 'approved' ? <DoctorDay /> : null}
    </AppShell>
  );
}
