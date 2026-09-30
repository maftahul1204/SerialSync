import Link from 'next/link';

export default function AppHeader({ onLogout, active }) {
  const linkClass = (key) =>
    key === active
      ? 'text-sm font-semibold text-teal-700'
      : 'text-sm font-medium text-slate-600 hover:text-slate-900';

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/dashboard" className="text-lg font-semibold text-teal-700">
          SerialSync
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/dashboard" className={linkClass('dashboard')}>
            Dashboard
          </Link>
          <Link href="/profile" className={linkClass('profile')}>
            Profile
          </Link>
          {onLogout ? (
            <button
              type="button"
              onClick={onLogout}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Log out
            </button>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
