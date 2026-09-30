'use client';

import Link from 'next/link';
import { useState } from 'react';
import Alert from '@/components/Alert';
import AuthShell from '@/components/AuthShell';
import FormField from '@/components/FormField';
import { authApi } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [devToken, setDevToken] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setDevToken('');
    setLoading(true);
    try {
      const data = await authApi.forgotPassword(email);
      setSuccess(data.message || 'If that email exists, reset instructions were sent.');
      if (data.resetToken) {
        setDevToken(data.resetToken);
      }
    } catch (err) {
      setError(err.message || 'Could not start reset');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Reset password" subtitle="We will email reset steps when mail is configured">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Alert message={error} />
        <Alert type="success" message={success} />
        <FormField
          label="Email"
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      {devToken ? (
        <p className="mt-4 rounded-lg bg-slate-100 p-3 text-xs text-slate-700">
          Dev reset token:{' '}
          <Link href={`/reset-password?token=${devToken}`} className="break-all font-mono text-teal-800 underline">
            use in reset form
          </Link>
        </p>
      ) : null}
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="font-medium text-teal-700 hover:text-teal-800">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
