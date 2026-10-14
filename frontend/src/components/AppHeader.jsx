import Link from 'next/link';
import BrandMark from '@/components/BrandMark';

export default function AppHeader({ onLogout, active, isAdmin = false, showSchedule = false }) {
  const linkClass = (key) =>
    key === active
      ? 'text-sm font-semibold text-ss-primary'
      : 'text-sm font-medium text-ss-muted hover:text-ss-text';

  return (
    <header className="border-b border-ss-border bg-ss-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <BrandMark href="/dashboard" />
        <nav className="flex flex-wrap items-center justify-end gap-3 sm:gap-5">
          <Link href="/dashboard" className={linkClass('dashboard')}>
            Dashboard
          </Link>
          <Link href="/profile" className={linkClass('profile')}>
            Profile
          </Link>
          {showSchedule ? (
            <Link href="/dashboard/schedule" className={linkClass('schedule')}>
              Schedule
            </Link>
          ) : null}
          {isAdmin ? (
            <Link href="/dashboard/admin" className={linkClass('admin')}>
              Admin
            </Link>
          ) : null}
          {onLogout ? (
            <button type="button" onClick={onLogout} className="ss-btn-secondary px-3 py-1.5 text-sm">
              Log out
            </button>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
