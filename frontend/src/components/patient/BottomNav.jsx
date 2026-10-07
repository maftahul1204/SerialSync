'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavIcon } from './icons';

const ITEMS = [
  { href: '/home', label: 'Doctors', icon: 'doctors' },
  { href: '/bookings', label: 'Bookings', icon: 'bookings' },
  { href: '/queue', label: 'Queue', icon: 'queue' },
  { href: '/reports', label: 'Reports', icon: 'reports' },
  { href: '/profile', label: 'Profile', icon: 'profile' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ss-border bg-ss-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      aria-label="Primary"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-2 pt-2">
        {ITEMS.map((item) => {
          const active = pathname === item.href || (item.href === '/home' && pathname === '/');
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-1 px-1 py-2 text-[10px] font-medium sm:text-xs ${
                  active ? 'text-ss-primary' : 'text-ss-muted hover:text-ss-text'
                }`}
              >
                <NavIcon name={item.icon} className="h-5 w-5" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
