const ROLES = [
  {
    id: 'patient',
    label: 'Patient',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c0-4 3.5-6 7-6s7 2 7 6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'doctor',
    label: 'Doctor',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M6 4h12v6a6 6 0 01-12 0V4z" strokeLinejoin="round" />
        <path d="M9 20h6M12 10v10" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'assistant',
    label: 'Clinic Staff',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="4" y="7" width="16" height="13" rx="2" />
        <path d="M9 7V5a3 3 0 016 0v2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'phlebotomist',
    label: 'Collector',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="6" cy="17" r="2" />
        <circle cx="18" cy="17" r="2" />
        <path d="M6 17h5l2-8h4l2 8h1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function RoleGrid({ value, onChange }) {
  return (
    <div className="mt-6">
      <p className="text-sm font-medium text-ss-text">I am a:</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3">
        {ROLES.map((role) => {
          const active = value === role.id;
          return (
            <button
              key={role.id}
              type="button"
              onClick={() => onChange(role.id)}
              className={`flex flex-col items-center gap-2 rounded-xl border px-2 py-3 text-xs font-medium transition sm:px-3 sm:py-4 sm:text-sm ${
                active
                  ? 'border-ss-primary bg-ss-primary text-slate-900 shadow-[0_0_20px_rgba(56,189,248,0.35)]'
                  : 'border-ss-border bg-ss-surface-elevated text-ss-text hover:border-ss-muted'
              }`}
            >
              {role.icon}
              {role.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { ROLES };
