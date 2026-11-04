'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import BrandMark from '@/components/BrandMark';
import { authApi } from '@/lib/api';
import MenuButton from '@/components/MenuButton';
import NotificationBell from '@/components/notifications/NotificationBell';
import { PATIENT_MENU } from '@/lib/navigation';
import BottomNav from './BottomNav';
import UserAvatar from './UserAvatar';

/** Labels match Figma top nav (1280×80). */
const DESKTOP_NAV = [
  { href: '/home', label: 'Find Doctors & Chambers' },
  { href: '/bookings', label: 'My Serial Bookings' },
  { href: '/queue', label: 'Live Queue Hub' },
  { href: '/reports', label: 'Diagnostic Reports' },
  { href: '/family', label: 'Family Care' },
];

export default function PatientShell({ user, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const city = user?.patientProfile?.city || 'Dhaka';

  async function handleLogout() {
    await authApi.logout();
    router.push('/login');
  }

  return (
    <div className="ss-page min-h-screen pb-20 lg:pb-0">
      <header className="sticky top-0 z-30 border-b border-ss-border bg-ss-bg/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-3 px-4 sm:px-6 lg:h-20 lg:px-8">
          <BrandMark href="/home" compact={false} />

          <nav className="hidden flex-1 items-center justify-center gap-1 xl:flex" aria-label="Primary">
            {DESKTOP_NAV.map((item) => {
              const active = pathname === item.href || (item.href === '/home' && pathname === '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded-lg px-2.5 py-2 text-[13px] font-medium transition lg:px-3 lg:text-sm ${
                    active ? 'text-ss-primary' : 'text-ss-text/90 hover:text-ss-primary'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationBell />
            <div className="hidden text-right sm:block">
              <p className="max-w-[140px] truncate text-sm font-semibold text-ss-text lg:max-w-[180px]">
                {user?.fullName}
              </p>
              <p className="flex items-center justify-end gap-1 text-xs text-ss-muted">
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden>
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" />
                </svg>
                {city}
              </p>
            </div>
            <MenuButton
              label="Account menu"
              triggerClassName="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-ss-primary"
              trigger={<UserAvatar name={user?.fullName} size="md" />}
              items={PATIENT_MENU.map((i) => ({ ...i, active: pathname === i.href }))}
              footer={(close) => (
                <button
                  type="button"
                  onClick={() => {
                    close();
                    handleLogout();
                  }}
                  className="my-1 w-full rounded-lg px-2 py-2 text-left text-sm font-medium text-red-300 hover:bg-red-500/10"
                >
                  Log out
                </button>
              )}
            />
            <button type="button" onClick={handleLogout} className="ss-btn-secondary hidden px-3 py-1.5 text-xs lg:inline-flex">
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>

      <BottomNav />
    </div>
  );
}
