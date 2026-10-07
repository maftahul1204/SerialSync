'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Alert from '@/components/Alert';
import AuthLayout from '@/components/auth/AuthLayout';
import IconField, { LockIcon, MailIcon, PhoneIcon } from '@/components/auth/IconField';
import FormField from '@/components/FormField';
import { authApi } from '@/lib/api';
import { homePathForRole } from '@/lib/authRedirect';
import { validateRegistration } from '@/lib/validation';

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState('patient');
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    specialtySlug: 'medicine',
    affiliations: '',
  });

  const specialtyOptions = [
    { slug: 'cardiology', title: 'Cardiologist' },
    { slug: 'medicine', title: 'Physician' },
    { slug: 'pediatrics', title: 'Pediatrician' },
    { slug: 'ophthalmology', title: 'Ophthalmologist' },
  ];
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
      const payload = { ...form, role };
      if (role === 'doctor') {
        const picked = specialtyOptions.find((o) => o.slug === form.specialtySlug);
        payload.doctorProfile = {
          specialtyTitle: picked?.title || 'Specialist',
          specialtySlug: form.specialtySlug || 'medicine',
          affiliations: form.affiliations || '',
        };
      }
      const data = await authApi.register(payload);
      router.push(homePathForRole(data.user?.role));
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      role={role}
      onRoleChange={setRole}
      panelTitle="Create your account"
      panelSubtitle="Pick a role, then fill in your details."
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Alert message={error} />
        <FormField label="Full name" id="fullName" value={form.fullName} onChange={update('fullName')} required autoComplete="name" />
        <IconField
          label="Email address"
          id="email"
          type="email"
          value={form.email}
          onChange={update('email')}
          required
          autoComplete="email"
          placeholder="you@example.com"
          icon={<MailIcon />}
        />
        <IconField
          label="Mobile phone number"
          id="phone"
          type="tel"
          value={form.phone}
          onChange={update('phone')}
          autoComplete="tel"
          placeholder="017XXXXXXXX"
          icon={<PhoneIcon />}
        />
        <IconField
          label="Password"
          id="password"
          type="password"
          value={form.password}
          onChange={update('password')}
          required
          autoComplete="new-password"
          placeholder="At least 8 characters"
          icon={<LockIcon />}
        />
        {role === 'doctor' ? (
          <p className="rounded-xl border border-ss-tertiary/30 bg-ss-tertiary/10 px-3 py-2 text-xs text-ss-muted">
            Doctor accounts require administrator approval before you can manage schedules or appear in patient search.
          </p>
        ) : null}
        {role === 'doctor' ? (
          <>
            <label className="ss-label" htmlFor="specialtySlug">
              Specialty
            </label>
            <select
              id="specialtySlug"
              className="ss-input"
              value={form.specialtySlug}
              onChange={update('specialtySlug')}
            >
              {specialtyOptions.map((opt) => (
                <option key={opt.slug} value={opt.slug}>
                  {opt.title}
                </option>
              ))}
            </select>
            <FormField
              label="Hospital / chamber affiliations"
              id="affiliations"
              value={form.affiliations}
              onChange={update('affiliations')}
              placeholder="Square Hospital & Green Life"
            />
          </>
        ) : null}
        <button type="submit" disabled={loading} className="ss-btn-primary w-full">
          {loading ? 'Creating account…' : 'Continue to My Dashboard'}
          {!loading ? <span aria-hidden>→</span> : null}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ss-muted">
        Already have an account?{' '}
        <Link href="/login" className="ss-link">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
