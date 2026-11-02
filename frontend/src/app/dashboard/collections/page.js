'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@/components/Alert';
import AppHeader from '@/components/AppHeader';
import AppShell from '@/components/AppShell';
import { authApi, diagnosticsApi } from '@/lib/api';

import { ListSkeleton, PageSkeleton } from '@/components/Loading';
export default function PhlebotomistCollectionsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    authApi
      .me()
      .then((res) => {
        if (!['phlebotomist', 'admin'].includes(res.user.role)) {
          router.replace('/dashboard');
          return;
        }
        setUser(res.user);
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  useEffect(() => {
    if (!user) return;
    diagnosticsApi
      .assignedOrders()
      .then((data) => setOrders(data.orders || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoaded(true));
  }, [user]);

  async function updateStatus(id, status, extra = {}) {
    setError('');
    try {
      await diagnosticsApi.updateStatus(id, { status, ...extra });
      const data = await diagnosticsApi.assignedOrders();
      setOrders(data.orders || []);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!user) {
    return (
      <PageSkeleton />
    );
  }

  return (
    <AppShell header={<AppHeader active="dashboard" isAdmin={user.role === 'admin'} showSchedule={false} />}>
      <Alert message={error} />
      <h1 className="text-2xl font-bold text-ss-text">Collection route</h1>
      <p className="text-sm text-ss-muted">Barcode, chain-of-custody, and lab handoff</p>
      {!loaded ? <div className="mt-6"><ListSkeleton rows={2} lines={3} label="Loading collection route" /></div> : null}
      <ul className="mt-6 space-y-4">
        {loaded && !orders.length ? (
          <li className="ss-card p-6 text-sm text-ss-muted">No home collections are assigned to you right now.</li>
        ) : null}
        {orders.map((order) => (
          <li key={order.id} className="ss-card space-y-3 p-4">
            <p className="font-medium text-ss-text">{order.address}</p>
            <p className="text-sm text-ss-muted">
              {order.preferredDate} · {order.contactPhone}
            </p>
            <p className="text-sm capitalize">{order.status.replace(/_/g, ' ')}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="ss-btn-secondary text-xs" onClick={() => updateStatus(order.id, 'en_route', { etaMinutes: 20 })}>
                En route
              </button>
              <button
                type="button"
                className="ss-btn-secondary text-xs"
                onClick={() =>
                  updateStatus(order.id, 'sample_collected', {
                    barcodeId: `BC-${Date.now().toString(36).toUpperCase()}`,
                  })
                }
              >
                Sample collected
              </button>
              <button type="button" className="ss-btn-secondary text-xs" onClick={() => updateStatus(order.id, 'lab_received')}>
                At lab
              </button>
              <button type="button" className="ss-btn-secondary text-xs" onClick={() => updateStatus(order.id, 'under_analysis')}>
                Under analysis
              </button>
            </div>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
