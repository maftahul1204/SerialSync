'use client';

const ALL_LABEL = 'All Dhaka';

export default function LocationPills({ areas, value, onChange }) {
  const options = [{ id: 'all', label: ALL_LABEL }, ...areas.map((a) => ({ id: a, label: a }))];

  return (
    <div className="ss-scroll-x -mx-4 px-4 sm:mx-0 sm:px-0">
      <ul className="flex gap-2 pb-1" role="list">
        {options.map((opt) => {
          const active = value === opt.id;
          return (
            <li key={opt.id} className="shrink-0">
              <button
                type="button"
                onClick={() => onChange(opt.id)}
                className={active ? 'ss-pill ss-pill-active' : 'ss-pill'}
              >
                {opt.label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
