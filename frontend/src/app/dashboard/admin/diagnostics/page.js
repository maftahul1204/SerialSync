'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Alert from '@/components/Alert';
import AppHeader from '@/components/AppHeader';
import AppShell from '@/components/AppShell';
import FieldLabel from '@/components/FieldLabel';
import { authApi, diagnosticsApi } from '@/lib/api';
import { formatTaka } from '@/lib/format';

import { ListSkeleton, PageSkeleton } from '@/components/Loading';
const STATUSES = ['', 'pending_dispatch', 'assigned', 'en_route', 'sample_collected', 'lab_received', 'under_analysis', 'completed'];
const EMPTY_TEST = { code: '', name: '', category: '', price: '' };

/** One editable row of numeric results for a single test (drives abnormal flags + trends). */
function ResultsEditor({ order, rows, setRows }) {
  const update = (i, key, value) => setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [key]: value } : row)));
  return (
    <div className="mt-3 space-y-2">
      {rows.map((row, i) => (
        <div key={row.code} className="grid grid-cols-2 items-end gap-2 sm:grid-cols-5">
          <p className="col-span-2 text-sm font-medium text-ss-text sm:col-span-1">{row.name}</p>
          <label className="text-xs text-ss-muted">
            Value
            <input className="ss-input mt-1" inputMode="decimal" value={row.value} onChange={(e) => update(i, 'value', e.target.value)} aria-label={`${row.name} value`} />
          </label>
          <label className="text-xs text-ss-muted">
            Unit
            <input className="ss-input mt-1" value={row.unit} onChange={(e) => update(i, 'unit', e.target.value)} />
          </label>
          <label className="text-xs text-ss-muted">
            Ref low
            <input className="ss-input mt-1" inputMode="decimal" value={row.refLow} onChange={(e) => update(i, 'refLow', e.target.value)} />
          </label>
          <label className="text-xs text-ss-muted">
            Ref high
            <input className="ss-input mt-1" inputMode="decimal" value={row.refHigh} onChange={(e) => update(i, 'refHigh', e.target.value)} />
          </label>
        </div>
      ))}
      {!order.tests.length ? <p className="text-xs text-ss-muted">No tests on this order.</p> : null}
    </div>
  );
}

function OrderRow({ order, onDone }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState(() =>
    order.tests.map((t) => ({ code: t.code, name: t.name, value: '', unit: '', refLow: '', refHigh: '' }))
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: 'error', text: '' });

  async function submit(e) {
    e.preventDefault();
    if (!file) {
      setMsg({ type: 'error', text: 'Choose the signed PDF report first' });
      return;
    }
    const results = rows
      .filter((r) => r.value !== '')
      .map((r) => ({ code: r.code, name: r.name, value: Number(r.value), unit: r.unit, refLow: r.refLow === '' ? undefined : Number(r.refLow), refHigh: r.refHigh === '' ? undefined : Number(r.refHigh) }));
    if (results.some((r) => !Number.isFinite(r.value))) {
      setMsg({ type: 'error', text: 'Result values must be numbers' });
      return;
    }
    setBusy(true);
    try {
      const res = await diagnosticsApi.uploadReport(order.id, file, results);
      setMsg({ type: 'success', text: `Report uploaded. SHA-256 ${res.reportSha256.slice(0, 12)}…` });
      setOpen(false);
      onDone();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="ss-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-ss-text">{order.packageName || order.tests.map((t) => t.code).join(', ')}</p>
          <p className="text-xs text-ss-muted">
            {order.preferredDate} · {order.timeSlot} · {formatTaka(order.totalAmount)} · #{order.id.slice(-6).toUpperCase()}
          </p>
          <p className="mt-1 text-sm capitalize text-ss-secondary">{order.status.replace(/_/g, ' ')}</p>
          {order.criticalFlags.length ? <p className="text-xs text-red-300">Flagged: {order.criticalFlags.join(', ')}</p> : null}
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)} className="ss-btn-secondary px-3 py-1.5 text-sm" aria-expanded={open}>
          {order.reportAvailable ? 'Replace report' : 'Upload report'}
        </button>
      </div>
      <Alert type={msg.type} message={msg.text} />
      {open ? (
        <form onSubmit={submit} className="mt-4 border-t border-ss-border pt-4">
          <p className="mb-3 text-xs text-ss-muted">
            Fields marked <span className="text-ss-tertiary">*</span> are required.
          </p>
          <label className="block text-sm text-ss-muted">
            <FieldLabel required className="">Signed PDF</FieldLabel>
            <input type="file" accept="application/pdf" required className="ss-input mt-1" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
          <p className="mt-4 text-sm font-medium text-ss-text">Results (optional, drives abnormal flags and patient trends)</p>
          <ResultsEditor order={order} rows={rows} setRows={setRows} />
          <button type="submit" disabled={busy} className="ss-btn-primary mt-4">
            {busy ? 'Uploading…' : 'Upload and notify patient'}
          </button>
        </form>
      ) : null}
    </li>
  );
}

export default function AdminDiagnosticsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [tests, setTests] = useState([]);
  const [newTest, setNewTest] = useState(EMPTY_TEST);
  const [centers, setCenters] = useState([]);
  const [newCenter, setNewCenter] = useState({ name: '', area: '', address: '', phone: '', openFrom: '08:00', openTo: '20:00' });
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    authApi
      .me()
      .then((res) => {
        if (res.user.role !== 'admin') {
          router.replace('/dashboard');
          return;
        }
        setUser(res.user);
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  const loadOrders = useCallback(() => {
    diagnosticsApi
      .listAllOrders({ page, limit: 10, status })
      .then((data) => {
        setOrders(data.orders);
        setPages(data.pagination.pages);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoaded(true));
  }, [page, status]);

  const loadTests = useCallback(() => {
    diagnosticsApi
      .listTests()
      .then((data) => setTests(data.tests))
      .catch((err) => setError(err.message));
  }, []);

  const loadCenters = useCallback(() => {
    diagnosticsApi
      .listCenters({ all: 'true' })
      .then((data) => setCenters(data.centers))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!user) return;
    loadOrders();
    loadTests();
    loadCenters();
  }, [user, loadOrders, loadTests, loadCenters]);

  async function addCenter(e) {
    e.preventDefault();
    setError('');
    try {
      await diagnosticsApi.createCenter(newCenter);
      setNewCenter({ name: '', area: '', address: '', phone: '', openFrom: '08:00', openTo: '20:00' });
      loadCenters();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleCenter(c, field) {
    try {
      await diagnosticsApi.updateCenter(c.id, { [field]: !c[field] });
      loadCenters();
    } catch (err) {
      setError(err.message);
    }
  }

  async function addTest(e) {
    e.preventDefault();
    setError('');
    try {
      await diagnosticsApi.createTest({ ...newTest, price: Number(newTest.price) });
      setNewTest(EMPTY_TEST);
      loadTests();
    } catch (err) {
      setError(err.message);
    }
  }

  async function changePrice(test) {
    const value = window.prompt(`New price for ${test.name} (BDT)`, String(test.price));
    if (value === null) return;
    try {
      await diagnosticsApi.updateTest(test.id, { price: Number(value) });
      loadTests();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deactivate(test) {
    try {
      await diagnosticsApi.updateTest(test.id, { isActive: false });
      loadTests();
    } catch (err) {
      setError(err.message);
    }
  }

  async function logout() {
    await authApi.logout();
    router.push('/login');
  }

  if (!user) return <PageSkeleton />;

  return (
    <AppShell header={<AppHeader active="diagnostics" isAdmin onLogout={logout} />}>
      <h1 className="text-2xl font-bold text-ss-text">Lab reports &amp; catalogue</h1>
      <p className="mt-1 text-sm text-ss-muted">Upload signed PDF reports (HMAC-protected for patients) and manage the test catalogue.</p>
      <div className="mt-4">
        <Alert message={error} />
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="orders-title">
          <div className="flex items-end justify-between gap-3">
            <h2 id="orders-title" className="text-lg font-semibold text-ss-text">
              Orders
            </h2>
            <label className="text-sm text-ss-muted">
              Status
              <select className="ss-input mt-1" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s ? s.replace(/_/g, ' ') : 'All'}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <ul className="mt-4 space-y-3">
            {orders.map((o) => (
              <OrderRow key={o.id} order={o} onDone={loadOrders} />
            ))}
            {!loaded ? <ListSkeleton rows={2} lines={2} label="Loading orders" /> : null}
            {loaded && !orders.length ? <p className="text-sm text-ss-muted">No orders match.</p> : null}
          </ul>
          {pages > 1 ? (
            <div className="mt-4 flex items-center justify-center gap-3 text-sm">
              <button type="button" className="ss-btn-secondary px-3 py-1.5" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <span className="text-ss-muted">Page {page} of {pages}</span>
              <button type="button" className="ss-btn-secondary px-3 py-1.5" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          ) : null}
        </section>

        <section aria-labelledby="centers-title" className="lg:col-span-2">
          <h2 id="centers-title" className="text-lg font-semibold text-ss-text">
            Diagnostic centers
          </h2>
          <p className="text-sm text-ss-muted">Patients choose a center when booking. Stop accepting orders temporarily without deleting anything.</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <ul className="space-y-2">
              {centers.map((c) => (
                <li key={c.id} className="ss-card flex flex-wrap items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ss-text">{c.name}</p>
                    <p className="text-xs text-ss-muted">
                      {c.area} · {c.testsOffered} tests · {c.openFrom}-{c.openTo} · fee {formatTaka(c.collectionFee)} (free above {formatTaka(c.freeCollectionAbove)})
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={() => toggleCenter(c, 'acceptingOrders')} className={c.acceptingOrders ? 'ss-btn-secondary px-3 py-1 text-xs' : 'ss-btn-danger-outline px-3 py-1 text-xs'} aria-pressed={c.acceptingOrders}>
                      {c.acceptingOrders ? 'Accepting orders' : 'Paused'}
                    </button>
                    <button type="button" onClick={() => toggleCenter(c, 'isActive')} className="ss-btn-secondary px-3 py-1 text-xs">
                      {c.isActive ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </li>
              ))}
              {!centers.length ? <li className="text-sm text-ss-muted">No centers yet. Add the first one.</li> : null}
            </ul>
            <form onSubmit={addCenter} className="ss-card grid grid-cols-2 gap-3 p-4">
              <p className="col-span-2 text-xs text-ss-muted">
                Fields marked <span className="text-ss-tertiary">*</span> are required. New centers start with the catalogue prices.
              </p>
              <label className="col-span-2 block text-sm text-ss-muted">
                <FieldLabel required className="">Center name</FieldLabel>
                <input className="ss-input mt-1" required value={newCenter.name} onChange={(e) => setNewCenter({ ...newCenter, name: e.target.value })} />
              </label>
              <label className="block text-sm text-ss-muted">
                <FieldLabel className="">Area</FieldLabel>
                <input className="ss-input mt-1" value={newCenter.area} onChange={(e) => setNewCenter({ ...newCenter, area: e.target.value })} />
              </label>
              <label className="block text-sm text-ss-muted">
                <FieldLabel className="">Phone</FieldLabel>
                <input className="ss-input mt-1" value={newCenter.phone} onChange={(e) => setNewCenter({ ...newCenter, phone: e.target.value })} />
              </label>
              <label className="col-span-2 block text-sm text-ss-muted">
                <FieldLabel className="">Address</FieldLabel>
                <input className="ss-input mt-1" value={newCenter.address} onChange={(e) => setNewCenter({ ...newCenter, address: e.target.value })} />
              </label>
              <label className="block text-sm text-ss-muted">
                <FieldLabel required className="">Opens</FieldLabel>
                <input type="time" className="ss-input mt-1" required value={newCenter.openFrom} onChange={(e) => setNewCenter({ ...newCenter, openFrom: e.target.value })} />
              </label>
              <label className="block text-sm text-ss-muted">
                <FieldLabel required className="">Closes</FieldLabel>
                <input type="time" className="ss-input mt-1" required value={newCenter.openTo} onChange={(e) => setNewCenter({ ...newCenter, openTo: e.target.value })} />
              </label>
              <button type="submit" className="ss-btn-primary col-span-2">
                Add center
              </button>
            </form>
          </div>
        </section>

        <section aria-labelledby="catalogue-title">
          <h2 id="catalogue-title" className="text-lg font-semibold text-ss-text">
            Test catalogue
          </h2>
          <form onSubmit={addTest} className="ss-card mt-4 grid grid-cols-2 gap-3 p-4">
            <p className="col-span-2 text-xs text-ss-muted">
              Fields marked <span className="text-ss-tertiary">*</span> are required.
            </p>
            <label className="block text-sm text-ss-muted">
              <FieldLabel required className="">Code</FieldLabel>
              <input className="ss-input mt-1" required maxLength={20} placeholder="e.g. TSH" value={newTest.code} onChange={(e) => setNewTest({ ...newTest, code: e.target.value })} />
            </label>
            <label className="block text-sm text-ss-muted">
              <FieldLabel required className="">Price (BDT)</FieldLabel>
              <input className="ss-input mt-1" required type="number" min="0" placeholder="700" value={newTest.price} onChange={(e) => setNewTest({ ...newTest, price: e.target.value })} />
            </label>
            <label className="col-span-2 block text-sm text-ss-muted">
              <FieldLabel required className="">Test name</FieldLabel>
              <input className="ss-input mt-1" required placeholder="Thyroid Stimulating Hormone" value={newTest.name} onChange={(e) => setNewTest({ ...newTest, name: e.target.value })} />
            </label>
            <label className="col-span-2 block text-sm text-ss-muted">
              <FieldLabel required className="">Category</FieldLabel>
              <input className="ss-input mt-1" required placeholder="Hormone" value={newTest.category} onChange={(e) => setNewTest({ ...newTest, category: e.target.value })} />
            </label>
            <button type="submit" className="ss-btn-primary col-span-2">
              Add test
            </button>
          </form>
          <ul className="mt-4 space-y-2">
            {tests.map((t) => (
              <li key={t.id} className="ss-card flex items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ss-text">
                    {t.name} <span className="font-mono text-xs text-ss-muted">{t.code}</span>
                  </p>
                  <p className="text-xs text-ss-muted">
                    {t.category} · {formatTaka(t.price)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => changePrice(t)} className="ss-btn-secondary px-2.5 py-1 text-xs">
                    Price
                  </button>
                  <button type="button" onClick={() => deactivate(t)} className="ss-btn-danger-outline px-2.5 py-1 text-xs">
                    Retire
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
