'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Alert from '@/components/Alert';
import FormField from '@/components/FormField';
import { userApi } from '@/lib/api';

export default function ProfilePage() {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: '', phone: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    userApi
      .getProfile()
      .then((data) => {
        setForm({ fullName: data.user.fullName || '', phone: data.user.phone || '' });
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const data = await userApi.updateProfile(form);
      setForm({ fullName: data.user.fullName, phone: data.user.phone || '' });
      setSuccess('Profile saved');
    } catch (err) {
      setError(err.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link href="/dashboard" className="text-sm font-medium text-teal-700 hover:text-teal-800">
          ← Dashboard
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Your profile</h1>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
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
            label="Phone"
            id="phone"
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
          >
            {loading ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
