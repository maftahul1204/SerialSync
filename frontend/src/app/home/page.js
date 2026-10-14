'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Alert from '@/components/Alert';
import DoctorCard from '@/components/patient/DoctorCard';
import LocationPills from '@/components/patient/LocationPills';
import PatientShell from '@/components/patient/PatientShell';
import SearchBar from '@/components/patient/SearchBar';
import SpecialtyGrid from '@/components/patient/SpecialtyGrid';
import { authApi, doctorsApi } from '@/lib/api';
import { homePathForRole } from '@/lib/authRedirect';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

const DEFAULT_SPECIALTIES = [
  { slug: 'cardiology', title: 'Cardiology', subtitle: 'Heart Care', icon: 'heart' },
  { slug: 'medicine', title: 'Medicine', subtitle: 'Medicine', icon: 'stethoscope' },
  { slug: 'pediatrics', title: 'Child Care', subtitle: 'Child Care', icon: 'child' },
  { slug: 'ophthalmology', title: 'Eye Care', subtitle: 'Eye Care', icon: 'eye' },
];

export default function PatientHomePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [area, setArea] = useState('all');
  const [specialty, setSpecialty] = useState('all');
  const [doctors, setDoctors] = useState([]);
  const [meta, setMeta] = useState({ specialties: DEFAULT_SPECIALTIES, areas: [] });
  const [loading, setLoading] = useState(true);

  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    authApi
      .me()
      .then((data) => {
        if (data.user.role === 'doctor' || data.user.role === 'admin') {
          router.replace(homePathForRole(data.user.role));
          return;
        }
        setUser(data.user);
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  const loadDoctors = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const data = await doctorsApi.search({
        search: debouncedSearch,
        area,
        specialty,
      });
      setDoctors(data.doctors);
      if (data.meta) setMeta(data.meta);
    } catch (err) {
      setError(err.message || 'Could not load doctors');
    } finally {
      setLoading(false);
    }
  }, [user, debouncedSearch, area, specialty]);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  function scrollToFilters() {
    document.getElementById('home-filters')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (!user) {
    return (
      <div className="ss-page flex min-h-screen items-center justify-center text-ss-muted">
        Loading…
      </div>
    );
  }

  const firstName = user.fullName.split(/\s+/)[0];
  const liveCount = doctors.filter((d) => d.today?.isLive).length;

  return (
    <PatientShell user={user}>
      <Alert message={error} />

      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-ss-text sm:text-3xl">
          Hello, {firstName} <span aria-hidden>👋</span>
        </h1>
        <p className="text-sm text-ss-muted sm:text-base">Find a specialist doctor in Dhaka</p>
      </header>

      <div className="mt-6 space-y-4" id="home-filters">
        <SearchBar value={search} onChange={setSearch} onOpenFilters={scrollToFilters} />
        <LocationPills areas={meta.areas} value={area} onChange={setArea} />
      </div>

      <div className="mt-8">
        <SpecialtyGrid
          specialties={meta.specialties?.length ? meta.specialties : DEFAULT_SPECIALTIES}
          activeSlug={specialty === 'all' ? '' : specialty}
          onSelect={setSpecialty}
        />
      </div>

      <section className="mt-10" aria-labelledby="top-specialists-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="top-specialists-heading" className="text-lg font-semibold text-ss-text sm:text-xl">
            Top Specialists Today
          </h2>
          {liveCount > 0 ? (
            <span className="ss-live-badge">
              <span className="h-2 w-2 rounded-full bg-ss-secondary" aria-hidden />
              Live Queue
            </span>
          ) : null}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2 lg:gap-6">
          {loading ? <p className="text-sm text-ss-muted lg:col-span-2">Loading specialists…</p> : null}
          {!loading && !doctors.length ? (
            <div className="ss-card p-6 text-sm text-ss-muted lg:col-span-2">
              No doctors match your search. Try another area or specialty.
            </div>
          ) : null}
          {!loading ? doctors.map((doctor) => <DoctorCard key={doctor.id} doctor={doctor} />) : null}
        </div>
      </section>
    </PatientShell>
  );
}
