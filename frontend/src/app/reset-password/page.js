'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import Alert from '@/components/Alert';
import AuthLayout from '@/components/auth/AuthLayout';
import IconField, { LockIcon } from '@/components/auth/IconField';
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
    <AuthLayout
      showRoles={false}
      showTrust={false}
      panelTitle="Choose new password"
      panelSubtitle="Enter the token from your reset email."
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Alert message={error} />
        <Alert type="success" message={success} />
        <FormField label="Reset token" id="token" value={token} onChange={(e) => setToken(e.target.value)} required />
        <IconField
          label="New password"
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
          icon={<LockIcon />}
        />
        <button type="submit" disabled={loading} className="ss-btn-primary w-full">
          {loading ? 'Updating…' : 'Update password'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="ss-link">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="ss-auth-bg ss-page p-8 text-center text-ss-muted">Loading…</div>}>
      <ResetForm />
    </Suspense>
  );
}
