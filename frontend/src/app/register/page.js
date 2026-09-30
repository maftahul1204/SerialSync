'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Alert from '@/components/Alert';
import AuthShell from '@/components/AuthShell';
import FormField from '@/components/FormField';
import { authApi } from '@/lib/api';
import { validateRegistration } from '@/lib/validation';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const clientError = validateRegistration(form);
    if (clientError) {
      setError(clientError);
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authApi.register(form);
      router.push('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Create account" subtitle="Register as a patient to book serials and track queues">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Alert message={error} />
        <FormField
          label="Full name"
          id="fullName"
          value={form.fullName}
          onChange={update('fullName')}
          required
          autoComplete="name"
        />
        <FormField
          label="Email"
          id="email"
          type="email"
          value={form.email}
          onChange={update('email')}
          required
          autoComplete="email"
        />
        <FormField
          label="Phone (optional)"
          id="phone"
          value={form.phone}
          onChange={update('phone')}
          autoComplete="tel"
        />
        <FormField
          label="Password"
          id="password"
          type="password"
          value={form.password}
          onChange={update('password')}
          required
          autoComplete="new-password"
          placeholder="At least 8 characters"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
        >
          {loading ? 'Creating account…' : 'Register'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-teal-700 hover:text-teal-800">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
