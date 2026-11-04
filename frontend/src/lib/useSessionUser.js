'use client';

import { useEffect, useState } from 'react';
import { authApi } from '@/lib/api';

let cached = null;
let inflight = null;

export function clearSessionUserCache() {
  cached = null;
  inflight = null;
}

/** Signed-in user for chrome that must know the role (headers, menus). Cached per page load. */
export function useSessionUser() {
  const [user, setUser] = useState(cached);
  useEffect(() => {
    if (cached) return undefined;
    let alive = true;
    inflight = inflight || authApi.me().then((res) => (cached = res.user)).catch(() => null);
    inflight.then((u) => {
      if (alive && u) setUser(u);
    });
    return () => {
      alive = false;
    };
  }, []);
  return user;
}
