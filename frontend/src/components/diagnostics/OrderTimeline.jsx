import { buildTimeline } from '@/lib/diagnostics';

/** Vertical progress timeline for a home-collection order. */
export default function OrderTimeline({ order, compact = false }) {
  const steps = buildTimeline(order);
  const visible = compact ? steps.filter((s) => s.state !== 'upcoming' || s.status === steps.find((x) => x.state === 'upcoming')?.status) : steps;
  return (
    <ol className="space-y-0" aria-label="Order progress">
      {visible.map((step, i) => (
        <li key={step.status} className="relative flex gap-3 pb-4 last:pb-0">
          {i < visible.length - 1 ? (
            <span className={`absolute left-[11px] top-6 h-[calc(100%-1.25rem)] w-0.5 ${step.state === 'done' ? 'bg-ss-secondary/60' : 'bg-ss-border'}`} aria-hidden />
          ) : null}
          <span
            className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold ${
              step.state === 'done'
                ? 'border-ss-secondary bg-ss-secondary text-slate-900'
                : step.state === 'current'
                  ? 'border-ss-primary bg-ss-primary/20 text-ss-primary ss-skeleton-pulse'
                  : 'border-ss-border bg-ss-bg text-ss-muted'
            }`}
          >
            {step.state === 'done' ? '✓' : i + 1}
          </span>
          <div className="min-w-0">
            <p className={`text-sm font-medium ${step.state === 'upcoming' ? 'text-ss-muted' : 'text-ss-text'}`}>
              {step.label}
              {step.state === 'current' ? <span className="ml-2 rounded-full bg-ss-primary/15 px-2 py-0.5 text-[11px] font-semibold text-ss-primary">Now</span> : null}
            </p>
            {step.at ? (
              <p className="text-xs text-ss-muted">
                {new Date(step.at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                {step.note ? ` · ${step.note}` : ''}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
