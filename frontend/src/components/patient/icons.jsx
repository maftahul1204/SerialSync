export function SearchIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

export function FilterIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
    </svg>
  );
}

export function StarIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
    </svg>
  );
}

export function CheckCircleIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12l2.5 2.5L16 9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function NavIcon({ name, className = 'h-5 w-5' }) {
  const props = { className, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, viewBox: '0 0 24 24' };
  switch (name) {
    case 'doctors':
      return (
        <svg {...props} aria-hidden>
          <path d="M5 20v-2a4 4 0 014-4h6a4 4 0 014 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" strokeLinecap="round" />
        </svg>
      );
    case 'bookings':
      return (
        <svg {...props} aria-hidden>
          <rect x="4" y="5" width="16" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M4 11h16" strokeLinecap="round" />
        </svg>
      );
    case 'queue':
      return (
        <svg {...props} aria-hidden>
          <path d="M6 4v16M6 8h8l-2 4h6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'reports':
      return (
        <svg {...props} aria-hidden>
          <path d="M9 4h6v16H9zM5 8h4v12H5zM15 10h4v10h-4z" strokeLinejoin="round" />
        </svg>
      );
    case 'profile':
      return (
        <svg {...props} aria-hidden>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20v-1a7 7 0 0114 0v1" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}
