'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import Alert from '@/components/Alert';
import PatientShell from '@/components/patient/PatientShell';
import TrendChart from '@/components/charts/TrendChart';
import OrderTimeline from '@/components/diagnostics/OrderTimeline';
import { statusLabel } from '@/lib/diagnostics';
import { formatTaka } from '@/lib/format';
import { appointmentsApi, authApi, diagnosticsApi } from '@/lib/api';

import { ListSkeleton, PageSkeleton } from '@/components/Loading';
function ReportsContent() {
  const params = useSearchParams();
  const highlight = params.get('order');
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [trends, setTrends] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [doctors, setDoctors] = useState([]);

  useEffect(() => {
    authApi
      .me()
      .then((res) => setUser(res.user))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'patient' || user.role === 'admin') {
      diagnosticsApi
        .listMyOrders()
        .then((data) => setOrders(data.orders || []))
        .catch((err) => setError(err.message))
        .finally(() => setLoaded(true));
    }
    if (user.role === 'patient') {
      diagnosticsApi
        .trends()
        .then((data) => setTrends(data.series || []))
        .catch(() => {});
      appointmentsApi
        .listMine()
        .then((data) => {
          const seen = new Map();
          (data.appointments || []).forEach((a) => {
            if (a.doctor && !seen.has(a.doctor.id)) seen.set(a.doctor.id, a.doctor);
          });
          setDoctors([...seen.values()]);
        })
        .catch(() => {});
    }
  }, [user]);

  if (!user) {
    return (
      <PageSkeleton />
    );
  }

  return (
    <PatientShell user={user}>
      <Alert message={error} />
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ss-text">Lab reports</h1>
          <p className="text-sm text-ss-muted">Track collection and download verified PDFs</p>
        </div>
        <Link href="/diagnostics" className="ss-btn-secondary text-sm">
          Book tests
        </Link>
      </div>

      {trends.length ? (
        <section className="mt-8" aria-labelledby="trends-title">
          <h2 id="trends-title" className="text-lg font-semibold text-ss-text">
            Health trends
          </h2>
          <p className="text-sm text-ss-muted">Your results over time, with the normal range shaded.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trends.map((series) => (
              <TrendChart key={series.code} series={series} />
            ))}
          </div>
        </section>
      ) : null}

      <ul className="mt-8 space-y-4">
        {orders.map((order) => (
          <li
            key={order.id}
            className={`ss-card p-4 ${highlight === order.id ? 'border-ss-primary' : ''}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-ss-text">
                  {order.packageName || order.tests.map((t) => t.code).join(', ')}
                </p>
                {order.center ? (
                  <p className="text-sm text-ss-primary">
                    {order.center.name}
                    {order.center.area ? <span className="text-ss-muted"> · {order.center.area}</span> : null}
                  </p>
                ) : null}
                <p className="text-xs text-ss-muted">
                  {order.preferredDate} · {order.timeSlot} · {formatTaka(order.totalAmount)}
                </p>
                <p className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-ss-secondary">
                  <span className={`h-2 w-2 rounded-full ${order.status === 'completed' ? 'bg-ss-secondary' : 'bg-ss-primary ss-skeleton-pulse'}`} aria-hidden />
                  {statusLabel(order.status)}
                </p>
              </div>
              {order.reportAvailable ? (
                <div className="flex flex-wrap items-center gap-2">
                  <OrderDownload orderId={order.id} />
                  <ShareControl order={order} doctors={doctors} />
                </div>
              ) : (
                <span className="text-xs text-ss-muted">Report pending</span>
              )}
            </div>
            <details className="mt-3 rounded-xl border border-ss-border bg-ss-bg/50 px-3 py-2" open={highlight === order.id || order.status !== 'completed'}>
              <summary className="cursor-pointer text-sm font-medium text-ss-primary">Order details, price and progress</summary>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ss-muted">Price</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {order.tests.map((t) => (
                      <li key={t.code} className="flex justify-between gap-3">
                        <span className="text-ss-muted">{t.name}</span>
                        <span className="text-ss-text">{formatTaka(t.price)}</span>
                      </li>
                    ))}
                    {order.discount ? (
                      <li className="flex justify-between text-ss-secondary">
                        <span>Package discount</span>
                        <span>-{formatTaka(order.discount)}</span>
                      </li>
                    ) : null}
                    <li className="flex justify-between">
                      <span className="text-ss-muted">Home collection</span>
                      <span className="text-ss-text">{order.collectionFee ? formatTaka(order.collectionFee) : 'Free'}</span>
                    </li>
                    <li className="flex justify-between border-t border-ss-border pt-1 font-semibold">
                      <span className="text-ss-text">Total</span>
                      <span className="text-ss-primary">{formatTaka(order.totalAmount)}</span>
                    </li>
                  </ul>
                  {order.center?.phone ? <p className="mt-3 text-xs text-ss-muted">Center helpline: {order.center.phone}</p> : null}
                  {order.barcodeId ? <p className="text-xs text-ss-muted">Specimen barcode: <span className="font-mono">{order.barcodeId}</span></p> : null}
                  {order.etaMinutes && order.status !== 'completed' ? <p className="text-xs text-ss-muted">Phlebotomist ETA ~{order.etaMinutes} min</p> : null}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ss-muted">Progress</p>
                  <div className="mt-2">
                    <OrderTimeline order={order} />
                  </div>
                </div>
              </div>
            </details>
            {order.criticalFlags?.length ? (
              <p className="mt-2 text-sm font-medium text-red-300">
                Critical values flagged: {order.criticalFlags.join(', ')}
              </p>
            ) : null}
          </li>
        ))}
        {!loaded ? <ListSkeleton rows={2} lines={2} label="Loading your lab orders" /> : null}
        {loaded && !orders.length ? <p className="text-ss-muted">No diagnostic orders yet.</p> : null}
      </ul>
    </PatientShell>
  );
}

function ShareControl({ order, doctors }) {
  const [doctorId, setDoctorId] = useState('');
  const [shared, setShared] = useState(order.sharedDoctorIds || []);
  const [msg, setMsg] = useState('');

  if (!doctors.length) return null;

  async function share() {
    if (!doctorId) return;
    try {
      const res = await diagnosticsApi.shareDoctor(order.id, doctorId);
      setShared(res.order.sharedDoctorIds);
      setMsg('Shared with doctor');
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select className="ss-input max-w-[180px] py-1.5 text-sm" value={doctorId} onChange={(e) => setDoctorId(e.target.value)} aria-label="Share report with doctor">
        <option value="">Share with…</option>
        {doctors.map((d) => (
          <option key={d.id} value={d.id}>
            {d.fullName}
            {shared.includes(d.id) ? ' ✓' : ''}
          </option>
        ))}
      </select>
      <button type="button" onClick={share} disabled={!doctorId} className="ss-btn-secondary px-3 py-1.5 text-sm disabled:opacity-40">
        Share
      </button>
      {msg ? <span className="text-xs text-ss-secondary">{msg}</span> : null}
    </div>
  );
}

function OrderDownload({ orderId }) {
  const [href, setHref] = useState('');

  useEffect(() => {
    diagnosticsApi.getOrder(orderId).then((data) => {
      if (data.order.downloadToken) {
        setHref(diagnosticsApi.downloadUrl(orderId, data.order.downloadToken));
      }
    });
  }, [orderId]);

  if (!href) return <span className="text-xs text-ss-muted">Preparing link…</span>;
  return (
    <a href={href} className="ss-btn-primary text-sm" target="_blank" rel="noreferrer">
      Download PDF
    </a>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ReportsContent />
    </Suspense>
  );
}
