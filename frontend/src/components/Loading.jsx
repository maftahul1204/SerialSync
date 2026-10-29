/**
 * Loading building blocks: shimmer skeletons that mirror the real layout, a spinner for buttons,
 * and a branded full-page placeholder. All announce themselves politely to screen readers.
 */

export function Spinner({ className = 'h-4 w-4', label }) {
  return (
    <span role={label ? 'status' : undefined} className="inline-flex items-center">
      <svg viewBox="0 0 24 24" className={`animate-spin ${className}`} fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
        <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}

export function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={`ss-skeleton rounded-lg ${className}`} />;
}

/** Skeleton that looks like a standard card with a title, two lines and an action. */
export function CardSkeleton({ lines = 2, action = true }) {
  return (
    <div className="ss-card space-y-3 p-4" aria-hidden="true">
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${i === lines - 1 ? 'w-3/5' : 'w-full'}`} />
      ))}
      {action ? <Skeleton className="h-9 w-28" /> : null}
    </div>
  );
}

/** A list of card skeletons with a screen-reader status message. */
export function ListSkeleton({ rows = 3, label = 'Loading', columns = 1, lines = 2, action = true }) {
  return (
    <div role="status" aria-live="polite" className={columns > 1 ? 'grid gap-4 lg:grid-cols-2' : 'space-y-3'}>
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <CardSkeleton key={i} lines={lines} action={action} />
      ))}
    </div>
  );
}

export function StatSkeletons({ count = 4 }) {
  return (
    <div role="status" className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <span className="sr-only">Loading figures</span>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="ss-card space-y-2 p-4" aria-hidden="true">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-7 w-2/3" />
        </div>
      ))}
    </div>
  );
}

/** Whole-page placeholder: header bar + title + card list. Shown until the signed-in user is known. */
export function PageSkeleton({ label = 'Loading' }) {
  return (
    <div className="ss-page min-h-screen" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="border-b border-ss-border bg-ss-surface/90">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="ss-skeleton-pulse flex h-11 w-11 items-center justify-center rounded-xl border border-ss-primary/40 bg-ss-primary/10">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-ss-primary" fill="none" aria-hidden>
                <path d="M4 12h3l2-7 4 14 2-7h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <Skeleton className="hidden h-4 w-28 sm:block" />
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
      </div>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-3 h-4 w-96 max-w-full" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
