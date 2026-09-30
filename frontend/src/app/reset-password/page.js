'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import Alert from '@/components/Alert';
import AuthShell from '@/components/AuthShell';
import FormField from '@/components/FormField';
import { authApi } from '@/lib/api';

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [token, setToken] = useState(params.get('token') || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await authApi.resetPassword({ token, password });
      setSuccess('Password updated. You can sign in now.');
      setTimeout(() => router.push('/login'), 1500);
    } catch (err) {
      setError(err.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Choose new password" subtitle="Enter the token from your reset email">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Alert message={error} />
        <Alert type="success" message={success} />
        <FormField label="Reset token" id="token" value={token} onChange={(e) => setToken(e.target.value)} required />
        <FormField
          label="New password"
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {loading ? 'Updating…' : 'Update password'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="font-medium text-teal-700">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-600">Loading…</div>}>
      <ResetForm />
    </Suspense>
  );
}
