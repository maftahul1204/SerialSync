'use client';

import Link from 'next/link';
import { timeGreeting, patientDisplayId } from '@/lib/greeting';

export default function HomeHero({ user, queuePreview }) {
  const profile = user.patientProfile || {};
  const city = profile.city || 'Dhaka';
  const bloodType = profile.bloodType || 'O+ Positive';
  const smartPass = profile.smartPassVerified !== false;

  return (
    <section className="ss-hero-panel">
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ss-secondary">
        <span className="h-2 w-2 rounded-full bg-ss-secondary shadow-[0_0_8px_rgba(16,185,129,0.9)]" aria-hidden />
        Live chamber synchronization active
      </div>

      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <h1 className="text-2xl font-bold leading-tight text-ss-text sm:text-3xl lg:text-4xl">
          {timeGreeting()}, {user.fullName}
        </h1>
        <ul className="flex flex-wrap gap-2">
          <li className="ss-hero-badge">{patientDisplayId(user.id)}</li>
          {bloodType ? (
            <li className="ss-hero-badge ss-hero-badge--blood">
              <span aria-hidden>🩸</span> {bloodType}
            </li>
          ) : null}
          {smartPass ? (
            <li className="ss-hero-badge ss-hero-badge--pass">
              <span aria-hidden>✓</span> SmartPass verified
            </li>
          ) : null}
        </ul>
      </div>

      {queuePreview?.serialNumber ? (
        <div className="ss-token-card mt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ss-muted">Your token</p>
              <p className="mt-1 text-5xl font-bold tabular-nums text-ss-primary">{queuePreview.serialNumber}</p>
              <p className="mt-2 text-sm font-medium text-ss-secondary">
                {queuePreview.patientsAhead > 0 ? 'In waiting' : 'You are next — proceed to chamber'}
              </p>
            </div>
            <div className="text-sm text-ss-muted">
              {queuePreview.patientsAhead != null ? (
                <p>
                  <span className="font-semibold text-ss-text">{queuePreview.patientsAhead}</span> patients ahead · ~
                  {queuePreview.estimatedWaitMinutes ?? 0} min
                </p>
              ) : null}
              <Link href="/queue" className="ss-link mt-2 inline-block text-sm">
                Open live queue hub →
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <p className="mt-3 text-xs text-ss-muted">Primary location · {city}</p>
    </section>
  );
}
