'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { authApi } from '@/lib/api';
import { homePathForRole } from '@/lib/authRedirect';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    authApi
      .me()
      .then((data) => router.replace(homePathForRole(data.user?.role)))
      .catch(() => router.replace('/login'));
  }, [router]);

  return (
    <div className="ss-page flex min-h-screen items-center justify-center text-ss-muted">
      Loading…
    </div>
  );
}
