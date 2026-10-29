'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import BrandMark from '@/components/BrandMark';
import MenuButton from '@/components/MenuButton';
import NotificationBell from '@/components/notifications/NotificationBell';
import UserAvatar from '@/components/patient/UserAvatar';
import { authApi } from '@/lib/api';
import { isActivePath, staffNav } from '@/lib/navigation';
import { clearSessionUserCache, useSessionUser } from '@/lib/useSessionUser';

/**
 * Header for every non-patient workspace. The links shown depend on the signed-in role, so each
 * role can reach every page it is allowed to use without typing a URL.
 */
export default function AppHeader({ onLogout }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useSessionUser();
  const { core, portals, account } = staffNav(user);

  async function logout() {
    if (onLogout) return onLogout();
    await authApi.logout();
    clearSessionUserCache();
    router.push('/login');
    return undefined;
  }

  const link = (item) => {
    const active = isActivePath(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? 'page' : undefined}
        className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm transition ${
          active ? 'font-semibold text-ss-primary' : 'font-medium text-ss-muted hover:text-ss-text'
        }`}
      >
        {item.label}
      </Link>
    );
  };

  // Up to three portals fit inline; more (admin) collapse into a "Portals" menu.
  const inline = portals.length <= 2;
  const portalActive = portals.some((p) => isActivePath(pathname, p.href));

  return (
    <header className="sticky top-0 z-30 border-b border-ss-border bg-ss-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
        <BrandMark href="/dashboard" />
        <nav className="flex flex-wrap items-center justify-end gap-1 sm:gap-2" aria-label="Primary">
          {core.map(link)}
          {inline ? portals.map(link) : null}
          {!inline ? (
            <MenuButton
              label="Portals"
              triggerClassName={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium transition ${
                portalActive ? 'text-ss-primary' : 'text-ss-muted hover:text-ss-text'
              }`}
              trigger={
                <>
                  Portals
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
                    <path d="M5.5 7.5l4.5 5 4.5-5z" />
                  </svg>
                </>
              }
              items={portals.map((p) => ({ ...p, active: isActivePath(pathname, p.href) }))}
            />
          ) : null}
          <NotificationBell />
          <MenuButton
            label="Account menu"
            triggerClassName="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-ss-primary"
            trigger={<UserAvatar name={user?.fullName} size="sm" />}
            items={[
              ...(account || []).map((a) => ({ ...a, active: isActivePath(pathname, a.href) })),
            ]}
            footer={(close) => (
              <button
                type="button"
                onClick={() => {
                  close();
                  logout();
                }}
                className="my-1 w-full rounded-lg px-2 py-2 text-left text-sm font-medium text-red-300 hover:bg-red-500/10"
              >
                Log out
              </button>
            )}
          />
        </nav>
      </div>
    </header>
  );
}
