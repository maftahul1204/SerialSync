'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Alert from '@/components/Alert';
import AppHeader from '@/components/AppHeader';
import AppShell from '@/components/AppShell';
import FormField from '@/components/FormField';
import { authApi, userApi } from '@/lib/api';

function roleLabel(role) {
  const labels = {
    patient: 'Patient',
    doctor: 'Doctor',
    assistant: 'Queue assistant',
    phlebotomist: 'Phlebotomist',
    admin: 'Administrator',
  };
  return labels[role] || role;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-BD', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ fullName: '', phone: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    userApi
      .getProfile()
      .then((data) => {
        setUser(data.user);
        setForm({ fullName: data.user.fullName || '', phone: data.user.phone || '' });
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  async function handleLogout() {
    await authApi.logout();
    router.push('/login');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const data = await userApi.updateProfile(form);
      setUser(data.user);
      setForm({ fullName: data.user.fullName, phone: data.user.phone || '' });
      setSuccess('Profile updated successfully.');
    } catch (err) {
      setError(err.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="ss-page flex items-center justify-center text-ss-muted">
        Loading profile…
      </div>
    );
  }

  return (
    <AppShell header={<AppHeader active="profile" onLogout={handleLogout} />} width="5xl">
        <h1 className="text-2xl font-bold text-ss-text">Account profile</h1>
        <p className="mt-1 text-sm text-ss-muted">Manage your personal details for SerialSync.</p>

        <div className="mt-8 grid gap-6 lg:grid-cols-5">
          <section className="ss-card-pad lg:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-ss-muted">Account</p>
            <p className="mt-3 text-lg font-semibold text-ss-text">{user.fullName}</p>
            <p className="mt-1 break-all text-sm text-ss-muted">{user.email}</p>
            <span className="ss-badge-active mt-4">{roleLabel(user.role)}</span>
            <dl className="mt-6 space-y-3 text-sm">
              <div>
                <dt className="text-ss-muted">Member since</dt>
                <dd className="font-medium text-ss-text">{formatDate(user.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-ss-muted">Last updated</dt>
                <dd className="font-medium text-ss-text">{formatDate(user.updatedAt)}</dd>
              </div>
            </dl>
          </section>

          <section className="ss-card-pad lg:col-span-3">
            <h2 className="text-lg font-semibold text-ss-text">Edit details</h2>
            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              <Alert message={error} />
              <Alert type="success" message={success} />
              <FormField
                label="Full name"
                id="fullName"
                value={form.fullName}
                onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                required
              />
              <FormField
                label="Phone number"
                id="phone"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="01XXXXXXXXX"
              />
              <button type="submit" disabled={loading} className="ss-btn-primary w-full">
                {loading ? 'Saving…' : 'Save changes'}
              </button>
            </form>

            <div className="mt-8 border-t border-ss-border pt-6">
              <h3 className="text-sm font-semibold text-ss-text">Password</h3>
              <p className="mt-1 text-sm text-ss-muted">To change your password, use the secure reset flow.</p>
              <Link href="/forgot-password" className="ss-link mt-3 inline-block text-sm">
                Reset password →
              </Link>
            </div>
          </section>
        </div>
    </AppShell>
  );
}
