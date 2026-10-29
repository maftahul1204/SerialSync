'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/**
 * Accessible dropdown of links. Closes on outside click, Escape and navigation.
 * `trigger` is the button content; `items` are { href, label, desc, active }.
 */
export default function MenuButton({ trigger, items, label, align = 'right', footer, triggerClassName = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        className={triggerClassName}
      >
        {trigger}
      </button>
      {open ? (
        <div
          role="menu"
          className={`absolute z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-ss-border bg-ss-surface py-1 shadow-2xl ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={`block px-4 py-2.5 transition hover:bg-ss-surface-elevated/70 ${item.active ? 'bg-ss-primary/10' : ''}`}
            >
              <span className={`block text-sm font-medium ${item.active ? 'text-ss-primary' : 'text-ss-text'}`}>{item.label}</span>
              {item.desc ? <span className="block text-xs text-ss-muted">{item.desc}</span> : null}
            </Link>
          ))}
          {footer ? <div className="border-t border-ss-border/70 px-2 pt-1">{footer(() => setOpen(false))}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
