import BrandMark from '@/components/BrandMark';
import AuthFooter from '@/components/auth/AuthFooter';
import RoleGrid from '@/components/auth/RoleGrid';
import TrustPanel from '@/components/auth/TrustPanel';

export default function AuthLayout({
  children,
  role,
  onRoleChange,
  showRoles = true,
  showTrust = true,
  panelTitle = 'Sign in to your account',
  panelSubtitle = 'Works on phone, tablet, and desktop.',
}) {
  return (
    <div className="ss-auth-bg ss-page min-h-screen px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1.05fr_minmax(0,420px)] lg:items-start lg:gap-14 xl:gap-20">
        <aside className="lg:sticky lg:top-10 lg:pt-4">
          <BrandMark href="/login" />
          <h1 className="mt-8 text-3xl font-bold tracking-tight text-ss-text sm:text-4xl lg:text-left lg:text-[2.5rem] lg:leading-tight">
            Welcome to SerialSync
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-ss-muted lg:text-base">
            Find your doctor, book your serial, and skip the crowded waiting room.
          </p>
          {showTrust ? (
            <div className="mt-10 hidden lg:block">
              <TrustPanel />
            </div>
          ) : null}
          <div className="mt-10 hidden lg:block">
            <AuthFooter />
          </div>
        </aside>

        <div className="ss-card mx-auto w-full max-w-md p-6 sm:p-8 lg:mx-0 lg:max-w-none lg:shadow-[0_0_40px_rgba(0,0,0,0.35)]">
          <div className="flex justify-center lg:hidden">
            <BrandMark href="/login" centered compact />
          </div>
          <h2 className="mt-6 text-center text-lg font-semibold text-ss-text lg:mt-0 lg:text-left">{panelTitle}</h2>
          <p className="mt-1 text-center text-xs text-ss-muted sm:text-sm lg:text-left">{panelSubtitle}</p>

          {showRoles && role && onRoleChange ? <RoleGrid value={role} onChange={onRoleChange} /> : null}

          <div className="mt-6">{children}</div>
        </div>

        {showTrust ? (
          <div className="mx-auto w-full max-w-md lg:hidden">
            <TrustPanel />
          </div>
        ) : null}
        <div className="mx-auto w-full max-w-md pb-6 lg:hidden">
          <AuthFooter />
        </div>
      </div>
    </div>
  );
}
