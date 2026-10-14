'use client';

import { FilterIcon, SearchIcon } from './icons';

export default function SearchBar({ value, onChange, onOpenFilters }) {
  return (
    <div className="relative flex items-center gap-2">
      <div className="relative min-w-0 flex-1">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ss-muted" />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search doctor, specialty, or hospital…"
          className="ss-input w-full py-3 pl-10 pr-4"
          aria-label="Search doctors"
        />
      </div>
      <button
        type="button"
        onClick={onOpenFilters}
        className="ss-btn-secondary flex h-[46px] w-[46px] shrink-0 items-center justify-center p-0 lg:hidden"
        aria-label="Filter options"
      >
        <FilterIcon />
      </button>
    </div>
  );
}
