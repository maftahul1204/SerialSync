'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Alert from '@/components/Alert';
import AppHeader from '@/components/AppHeader';
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        Loading profile…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader active="profile" onLogout={handleLogout} />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900">Account profile</h1>
        <p className="mt-1 text-sm text-slate-600">Manage your personal details for SerialSync.</p>

        <div className="mt-8 grid gap-6 lg:grid-cols-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Account</p>
            <p className="mt-3 text-lg font-semibold text-slate-900">{user.fullName}</p>
            <p className="mt-1 break-all text-sm text-slate-600">{user.email}</p>
            <span className="mt-4 inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
              {roleLabel(user.role)}
            </span>
            <dl className="mt-6 space-y-3 text-sm">
              <div>
                <dt className="text-slate-500">Member since</dt>
                <dd className="font-medium text-slate-800">{formatDate(user.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Last updated</dt>
                <dd className="font-medium text-slate-800">{formatDate(user.updatedAt)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-3">
            <h2 className="text-lg font-semibold text-slate-900">Edit details</h2>
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
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
              >
                {loading ? 'Saving…' : 'Save changes'}
              </button>
            </form>

            <div className="mt-8 border-t border-slate-100 pt-6">
              <h3 className="text-sm font-semibold text-slate-900">Password</h3>
              <p className="mt-1 text-sm text-slate-600">
                To change your password, use the secure reset flow.
              </p>
              <Link
                href="/forgot-password"
                className="mt-3 inline-block text-sm font-semibold text-teal-700 hover:text-teal-800"
              >
                Reset password →
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
