'use client';

import { io } from 'socket.io-client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050';

export function createQueueSocket() {
  return io(API_BASE, {
    path: '/socket.io',
    withCredentials: true,
    transports: ['websocket', 'polling'],
  });
}
