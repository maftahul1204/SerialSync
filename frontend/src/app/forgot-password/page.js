'use client';

import Link from 'next/link';
import { useState } from 'react';
import Alert from '@/components/Alert';
import AuthLayout from '@/components/auth/AuthLayout';
import IconField, { MailIcon } from '@/components/auth/IconField';
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
    <AuthLayout
      showRoles={false}
      showTrust={false}
      panelTitle="Reset your PIN"
      panelSubtitle="We will email reset steps when mail is configured."
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Alert message={error} />
        <Alert type="success" message={success} />
        <IconField
          label="Email address"
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          icon={<MailIcon />}
        />
        <button type="submit" disabled={loading} className="ss-btn-primary w-full">
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      {devToken ? (
        <p className="mt-4 rounded-xl border border-ss-border bg-ss-surface-elevated p-3 text-xs text-ss-muted">
          Dev reset token:{' '}
          <Link href={`/reset-password?token=${devToken}`} className="ss-link break-all font-mono">
            use in reset form
          </Link>
        </p>
      ) : null}
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="ss-link">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
