const ITEMS = [
  {
    title: 'BMDC Verified Doctors',
    body: 'Officially registered medical specialists across top clinics in Dhaka.',
    className: 'bg-ss-secondary/15 text-ss-secondary',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3l7 4v5c0 5-3.5 9-7 11-3.5-2-7-6-7-11V7l7-4z" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Private & Secure',
    body: 'Your prescription and health history are strictly encrypted end-to-end.',
    className: 'bg-ss-primary/15 text-ss-primary',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3l8 4v6c0 4.5-3.5 8.5-8 10-4.5-1.5-8-5.5-8-10V7l8-4z" />
      </svg>
    ),
  },
  {
    title: 'Real-time Hospital Sync',
    body: 'Live chamber queuing integrated with Green Life, Square, and LabAid.',
    className: 'bg-ss-surface-elevated text-ss-muted',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 12a8 8 0 0116 0" strokeLinecap="round" />
        <path d="M12 4v4M12 16v4M4 12H8M16 12h4" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function TrustPanel() {
  return (
    <ul className="mt-8 space-y-4 border-t border-ss-border pt-8">
      {ITEMS.map((item) => (
        <li key={item.title} className="flex gap-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${item.className}`}
          >
            {item.icon}
          </span>
          <div>
            <p className="text-sm font-semibold text-ss-text">{item.title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-ss-muted">{item.body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
