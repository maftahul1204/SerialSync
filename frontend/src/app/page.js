import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-sky-50 to-teal-50 px-4">
      <div className="max-w-lg text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">SerialSync</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">Healthcare queues, made visible</h1>
        <p className="mt-4 text-slate-600">
          Sign in or register to manage your account. Booking and live queue features arrive in the next milestone.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
