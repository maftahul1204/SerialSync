export function SpecialtyIcon({ name, className = 'h-5 w-5' }) {
  const props = { className, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, viewBox: '0 0 24 24' };
  switch (name) {
    case 'heart':
      return (
        <svg {...props} aria-hidden>
          <path d="M12 20s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0112 6a4 4 0 017 2.5c0 5.5-7 11.5-7 11.5z" strokeLinecap="round" />
        </svg>
      );
    case 'stethoscope':
      return (
        <svg {...props} aria-hidden>
          <path d="M4.5 8.5V11a7.5 7.5 0 0015 0V8.5M9 4v4M15 4v4M12 18v2" strokeLinecap="round" />
          <circle cx="18" cy="6" r="2.5" />
        </svg>
      );
    case 'child':
      return (
        <svg {...props} aria-hidden>
          <circle cx="12" cy="7" r="3" />
          <path d="M6 20v-1a6 6 0 0112 0v1M9 12h6" strokeLinecap="round" />
        </svg>
      );
    case 'eye':
      return (
        <svg {...props} aria-hidden>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      );
    default:
      return (
        <svg {...props} aria-hidden>
          <path d="M12 6v12M6 12h12" strokeLinecap="round" />
        </svg>
      );
  }
}
