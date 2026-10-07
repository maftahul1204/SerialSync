'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Alert from '@/components/Alert';
import AuthLayout from '@/components/auth/AuthLayout';
import IconField, { LockIcon, MailIcon } from '@/components/auth/IconField';
import { authApi } from '@/lib/api';
import { homePathForRole } from '@/lib/authRedirect';
import { validateLogin } from '@/lib/validation';

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('serialsync_remember_email');
    if (saved) {
      setEmail(saved);
      setRemember(true);
    }
    authApi
      .me()
      .then((data) => router.replace(homePathForRole(data.user?.role)))
      .catch(() => {});
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    const clientError = validateLogin({ email, password });
    if (clientError) {
      setError(clientError);
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await authApi.login({ email, password });
      if (remember) {
        localStorage.setItem('serialsync_remember_email', email);
      } else {
        localStorage.removeItem('serialsync_remember_email');
      }
      router.push(homePathForRole(data.user?.role));
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout role={role} onRoleChange={setRole}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Alert message={error} />
        <IconField
          label="Email address"
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="you@example.com"
          icon={<MailIcon />}
        />
        <p className="-mt-2 text-xs text-ss-muted">Sign in with the email on your account (mobile OTP later).</p>
        <IconField
          label="Password or 4-digit PIN"
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          placeholder="Enter your secret PIN"
          icon={<LockIcon />}
        />
        <div className="flex items-center justify-between text-sm">
          <label className="flex cursor-pointer items-center gap-2 text-ss-muted">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-ss-border bg-ss-surface-elevated accent-ss-primary"
            />
            Remember me
          </label>
          <Link href="/forgot-password" className="ss-link text-sm">
            Forgot PIN?
          </Link>
        </div>
        <button type="submit" disabled={loading} className="ss-btn-primary w-full">
          {loading ? 'Signing in…' : 'Continue to My Dashboard'}
          {!loading ? <span aria-hidden>→</span> : null}
        </button>
      </form>

      <p className="ss-divider">Or continue with</p>
      <Link href="/forgot-password" className="ss-btn-otp">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-ss-primary" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M21 11.5a8.4 8.4 0 01-.9 3.8 8 8 0 01-7.6 4.7 8 8 0 01-6.6-3.5L3 17" strokeLinecap="round" />
          <path d="M3 7v4h4M21 7a8 8 0 00-14.9-3" strokeLinecap="round" />
        </svg>
        One-Time SMS OTP Code
      </Link>

      <p className="mt-6 text-center text-sm text-ss-muted">
        New here?{' '}
        <Link href="/register" className="ss-link">
          Create account
        </Link>
      </p>
    </AuthLayout>
  );
}
