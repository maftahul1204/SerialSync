import Link from 'next/link';

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-teal-50">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-8 lg:flex-row lg:items-center lg:gap-12 lg:px-8">
        <section className="mb-10 lg:mb-0 lg:w-1/2">
          <Link href="/" className="inline-flex items-center gap-2 text-teal-700">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-lg font-bold text-white">
              SS
            </span>
            <span className="text-xl font-semibold tracking-tight text-slate-900">SerialSync</span>
          </Link>
          <h1 className="mt-8 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
            Outpatient care, without the waiting-room guesswork
          </h1>
          <p className="mt-4 max-w-md text-slate-600">
            Book serials, track live queues, and manage your health journey across clinics — starting with secure
            access to your account.
          </p>
        </section>

        <section className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8 lg:ml-auto">
          <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          <div className="mt-6">{children}</div>
        </section>
      </div>
    </div>
  );
}
