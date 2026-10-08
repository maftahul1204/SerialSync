import Link from 'next/link';
import BrandMark from '@/components/BrandMark';

export default function Home() {
  return (
    <div className="ss-auth-bg ss-page flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-4xl gap-10 text-center lg:grid-cols-2 lg:text-left">
        <div className="flex flex-col justify-center">
          <BrandMark href="/" />
          <h1 className="mt-8 text-3xl font-bold text-ss-text sm:text-4xl lg:mt-10">Healthcare queues, made visible</h1>
          <p className="mt-4 text-ss-muted lg:max-w-md">
            Sign in or register to manage your account. Same Figma look on phone and desktop — booking and live queue
            screens come in later sprints.
          </p>
        </div>
        <div className="ss-card flex flex-col justify-center p-8">
          <p className="text-sm font-medium text-ss-text">Get started</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Link href="/login" className="ss-btn-primary px-6 text-center">
              Sign in
            </Link>
            <Link href="/register" className="ss-btn-secondary px-6 text-center">
              Register
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
