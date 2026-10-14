'use client';

import { SpecialtyIcon } from '@/lib/specialtyIcons';

export default function SpecialtyGrid({ specialties, activeSlug, onSelect }) {
  return (
    <section aria-labelledby="specialties-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="specialties-heading" className="text-lg font-semibold text-ss-text">
          Specialties
        </h2>
        <button
          type="button"
          onClick={() => onSelect('all')}
          className="ss-link text-sm font-medium"
        >
          View all
        </button>
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-4 lg:gap-4">
        {specialties.map((item) => {
          const active = activeSlug === item.slug;
          return (
            <li key={item.slug}>
              <button
                type="button"
                onClick={() => onSelect(active ? 'all' : item.slug)}
                className={`ss-specialty-card w-full text-left transition ${active ? 'ring-2 ring-ss-primary/60' : ''}`}
              >
                <span className="ss-specialty-icon text-ss-primary">
                  <SpecialtyIcon name={item.icon} />
                </span>
                <span className="mt-3 block font-semibold text-ss-text">{item.title}</span>
                <span className="mt-0.5 block text-xs text-ss-muted">{item.subtitle}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
