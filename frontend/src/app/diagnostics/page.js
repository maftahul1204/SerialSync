'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Alert from '@/components/Alert';
import PatientShell from '@/components/patient/PatientShell';
import { authApi, diagnosticsApi } from '@/lib/api';

import { ListSkeleton, PageSkeleton } from '@/components/Loading';
export default function DiagnosticsCatalogPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tests, setTests] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [packages, setPackages] = useState([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    authApi
      .me()
      .then((res) => {
        if (res.user.role !== 'patient' && res.user.role !== 'admin') {
          router.replace('/dashboard');
          return;
        }
        setUser(res.user);
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  useEffect(() => {
    if (!user) return;
    Promise.all([diagnosticsApi.listTests({ search }), diagnosticsApi.listPackages()])
      .then(([t, p]) => {
        setTests(t.tests || []);
        setPackages(p.packages || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoaded(true));
  }, [user, search]);

  if (!user) {
    return (
      <PageSkeleton />
    );
  }

  return (
    <PatientShell user={user}>
      <Alert message={error} />
      <h1 className="text-2xl font-bold text-ss-text">Home diagnostics</h1>
      <p className="mt-1 text-sm text-ss-muted">Book sample collection at your address</p>
      <input
        className="ss-input mt-4 w-full"
        placeholder="Search tests…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <section className="mt-8">
        <h2 className="font-semibold text-ss-text">Health packages</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {!loaded ? <ListSkeleton rows={3} label="Loading tests" action={false} /> : null}
          {packages.map((pkg) => (
            <Link
              key={pkg.id}
              href={`/diagnostics/book?package=${encodeURIComponent(pkg.id)}`}
              className="ss-card block p-4 hover:border-ss-primary/50"
            >
              <p className="font-medium text-ss-text">{pkg.name}</p>
              <p className="mt-1 text-xs text-ss-muted">{pkg.discountPercent}% package discount</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-semibold text-ss-text">Test catalog</h2>
        <ul className="mt-3 space-y-3">
          {tests.map((test) => (
            <li key={test.id} className="ss-card flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-medium text-ss-text">{test.name}</p>
                <p className="text-xs text-ss-muted">
                  {test.category} · ৳{test.price}
                  {test.fastingRequired ? ' · Fasting required' : ''}
                </p>
              </div>
              <Link
                href={`/diagnostics/book?test=${encodeURIComponent(test.id)}`}
                className="ss-btn-secondary shrink-0 text-sm"
              >
                Book
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </PatientShell>
  );
}
