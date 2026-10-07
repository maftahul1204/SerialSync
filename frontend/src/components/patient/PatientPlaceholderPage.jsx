'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import PatientShell from '@/components/patient/PatientShell';
import { authApi } from '@/lib/api';
import { homePathForRole } from '@/lib/authRedirect';

export default function PatientPlaceholderPage({ title, description }) {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    authApi
      .me()
      .then((data) => {
        if (data.user.role === 'doctor' || data.user.role === 'admin') {
          router.replace('/dashboard');
          return;
        }
        setUser(data.user);
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  if (!user) {
    return (
      <div className="ss-page flex min-h-screen items-center justify-center text-ss-muted">
        Loading…
      </div>
    );
  }

  return (
    <PatientShell user={user}>
      <h1 className="text-2xl font-bold text-ss-text">{title}</h1>
      <p className="mt-2 max-w-xl text-ss-muted">{description}</p>
      <p className="mt-6 text-sm text-ss-muted">
        Use <Link href={homePathForRole('patient')} className="ss-link">Doctors</Link> to search and book serials
        today.
      </p>
    </PatientShell>
  );
}
