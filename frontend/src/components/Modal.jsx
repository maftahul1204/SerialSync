'use client';

import { useEffect, useRef } from 'react';

/** Accessible modal dialog: Escape and backdrop close it, focus moves into it and returns after. */
export default function Modal({ open, onClose, title, children, wide = false }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    ref.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-ss-border bg-ss-bg shadow-2xl outline-none sm:rounded-2xl ${
          wide ? 'sm:max-w-3xl' : 'sm:max-w-md'
        }`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-ss-border bg-ss-bg/95 px-5 py-4 backdrop-blur">
          <h2 className="text-lg font-semibold text-ss-text">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-ss-muted hover:bg-ss-surface hover:text-ss-text">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
