'use client';

import { useState } from 'react';

export default function IconField({
  label,
  id,
  type = 'text',
  value,
  onChange,
  required,
  autoComplete,
  placeholder,
  icon,
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && show ? 'text' : type;

  return (
    <label htmlFor={id} className="block">
      <span className="ss-label">{label}</span>
      <div className="relative mt-1.5">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ss-muted">{icon}</span>
        <input
          id={id}
          name={id}
          type={inputType}
          value={value}
          onChange={onChange}
          required={required}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="ss-input py-3 pl-10 pr-10"
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ss-muted hover:text-ss-text"
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              {show ? (
                <>
                  <path d="M3 3l18 18" strokeLinecap="round" />
                  <path d="M10.7 10.7A3 3 0 0012 15a3 3 0 002.3-4.3M6.7 6.7C4.6 8 3 10 3 12s3 6 9 6c1.6 0 3-.4 4.3-1M17 9.3C18.2 10.2 19 11.5 19 12c0 2-3 6-9 6-1 0-2-.2-2.8-.5" />
                </>
              ) : (
                <>
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              )}
            </svg>
          </button>
        ) : null}
      </div>
    </label>
  );
}

export function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path d="M11 18h2" strokeLinecap="round" />
    </svg>
  );
}

export function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" strokeLinejoin="round" />
    </svg>
  );
}

export function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" strokeLinecap="round" />
    </svg>
  );
}
