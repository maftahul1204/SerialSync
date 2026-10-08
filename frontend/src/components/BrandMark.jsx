import Link from 'next/link';

function PulseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" aria-hidden>
      <path
        d="M4 12h3l2-7 4 14 2-7h5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function BrandMark({ href = '/', centered = false, compact = false }) {
  const wrap = centered ? 'justify-center' : '';
  return (
    <Link href={href} className={`inline-flex items-center gap-3 ${wrap}`}>
      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-ss-primary/40 bg-gradient-to-br from-ss-primary/30 to-ss-secondary/20 shadow-[0_0_24px_rgba(56,189,248,0.25)]">
        <PulseIcon />
      </span>
      {!compact ? (
        <span className="text-xl font-semibold tracking-tight">
          <span className="text-ss-text">Serial</span>
          <span className="text-ss-primary">Sync</span>
        </span>
      ) : null}
    </Link>
  );
}
