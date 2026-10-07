'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import BrandMark from '@/components/BrandMark';
import { authApi } from '@/lib/api';
import BottomNav from './BottomNav';
import UserAvatar from './UserAvatar';
import { NavIcon } from './icons';

const DESKTOP_NAV = [
  { href: '/home', label: 'Doctors', icon: 'doctors' },
  { href: '/bookings', label: 'Bookings', icon: 'bookings' },
  { href: '/queue', label: 'Queue', icon: 'queue' },
  { href: '/reports', label: 'Reports', icon: 'reports' },
  { href: '/profile', label: 'Profile', icon: 'profile' },
];

export default function PatientShell({ user, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const firstName = user?.fullName?.split(/\s+/)[0] || 'there';

  async function handleLogout() {
    await authApi.logout();
    router.push('/login');
  }

  return (
    <div className="ss-page min-h-screen pb-20 lg:pb-0">
      <header className="sticky top-0 z-30 border-b border-ss-border bg-ss-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <BrandMark href="/home" compact={false} />
          <div className="flex items-center gap-2 lg:hidden">
            <button type="button" onClick={handleLogout} className="ss-btn-secondary px-3 py-1.5 text-xs">
              Log out
            </button>
            <Link href="/profile" aria-label="Profile">
              <UserAvatar name={user?.fullName} size="md" />
            </Link>
          </div>
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Desktop">
            {DESKTOP_NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                    active
                      ? 'bg-ss-primary/15 text-ss-primary'
                      : 'text-ss-muted hover:bg-ss-surface hover:text-ss-text'
                  }`}
                >
                  <NavIcon name={item.icon} className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="hidden items-center gap-3 lg:flex">
            <button type="button" onClick={handleLogout} className="ss-btn-secondary px-3 py-1.5 text-sm">
              Log out
            </button>
            <Link href="/profile" aria-label="Profile">
              <UserAvatar name={user?.fullName} size="md" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>

      <BottomNav />

      <span className="sr-only">Signed in as {firstName}</span>
    </div>
  );
}
