'use client';

import Link from 'next/link';
import UserAvatar from './UserAvatar';
import { CheckCircleIcon, StarIcon } from './icons';

export default function DoctorCard({ doctor }) {
  const { today } = doctor;
  const showWait = today.isLive && today.estimatedWaitMinutes != null;
  const showFee = !showWait && today.chamberFee != null;

  return (
    <article className="ss-doctor-card flex flex-col">
      <div className="flex gap-3 sm:gap-4">
        <UserAvatar
          name={doctor.fullName}
          imageUrl={doctor.avatarUrl}
          size="lg"
          showOnline={doctor.isOnline}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-ss-text sm:text-lg">{doctor.fullName}</h3>
              <p className="text-sm text-ss-primary">{doctor.specialtyTitle}</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-lg bg-ss-surface-elevated px-2 py-1 text-xs font-semibold text-ss-tertiary">
              <StarIcon className="h-3.5 w-3.5" />
              {doctor.rating.toFixed(1)}
            </span>
          </div>
          {doctor.affiliations ? (
            <p className="mt-1 line-clamp-2 text-sm text-ss-muted">{doctor.affiliations}</p>
          ) : null}
        </div>
      </div>

      {today.statusBanner ? (
        <div className="ss-doctor-banner mt-4">
          {today.statusBanner.type === 'today_chamber' ? (
            <CheckCircleIcon className="h-4 w-4 shrink-0 text-ss-secondary" />
          ) : (
            <span className="h-2 w-2 shrink-0 rounded-full bg-ss-secondary" aria-hidden />
          )}
          <span className="text-sm text-ss-text">{today.statusBanner.text}</span>
          {today.serialsLeft > 0 ? (
            <span className="ml-auto text-xs font-semibold text-ss-tertiary">
              {today.serialsLeft} Serials Left
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-3 border-t border-ss-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-ss-muted">
          {showWait ? (
            <>
              <span className="font-medium text-ss-secondary">Live Serial</span>
              <span className="text-ss-muted"> · Est. ~{today.estimatedWaitMinutes} min wait</span>
            </>
          ) : null}
          {showFee ? (
            <>
              Chamber Fee{' '}
              <span className="font-semibold text-ss-text">৳ {today.chamberFee.toLocaleString()}</span>
            </>
          ) : null}
          {!showWait && !showFee && today.hasHours ? (
            <span>Check availability for today</span>
          ) : null}
          {!today.hasHours ? <span>See weekly schedule</span> : null}
        </div>
        <Link href={`/doctors/${doctor.id}/schedule`} className="ss-btn-primary shrink-0 px-5 py-2.5 text-center text-sm">
          Book Serial
        </Link>
      </div>
    </article>
  );
}
