'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import Alert from '@/components/Alert';
import FieldLabel from '@/components/FieldLabel';
import { ListSkeleton, PageSkeleton, Spinner } from '@/components/Loading';
import PatientShell from '@/components/patient/PatientShell';
import { authApi, diagnosticsApi } from '@/lib/api';
import { canOrderFrom, centerStatus, slotsForCenter } from '@/lib/diagnostics';
import { formatTaka } from '@/lib/format';

const TONE = {
  green: 'border-ss-secondary/40 bg-ss-secondary/10 text-ss-secondary',
  amber: 'border-ss-tertiary/40 bg-ss-tertiary/10 text-ss-tertiary',
  red: 'border-red-500/40 bg-red-500/10 text-red-300',
};

function CenterCard({ center, selected, onSelect, tags }) {
  const status = centerStatus(center);
  const eligible = canOrderFrom(center);
  const q = center.quote;
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-2xl border p-4 transition ${selected ? 'border-ss-primary bg-ss-primary/5 shadow-[0_0_0_1px_rgba(56,189,248,0.4)]' : 'border-ss-border bg-ss-surface'} ${eligible ? '' : 'opacity-70'}`}>
      <label className={`flex gap-3 ${eligible ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
        <input type="radio" name="center" className="mt-1.5 h-4 w-4 accent-sky-400" checked={selected} disabled={!eligible} onChange={() => onSelect(center.id)} aria-label={`Choose ${center.name}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-ss-text">{center.name}</p>
              <p className="text-xs text-ss-muted">
                {center.area} · ★ {center.rating.toFixed(1)} ({center.reviewsCount.toLocaleString()}) {center.accreditation ? `· ${center.accreditation}` : ''}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-ss-text">{formatTaka(q.total)}</p>
              <p className="text-[11px] text-ss-muted">{q.freeCollection ? 'free home collection' : `incl. ${formatTaka(q.collectionFee)} collection`}</p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className={`rounded-full border px-2.5 py-0.5 font-semibold ${TONE[status.tone]}`}>{status.label}</span>
            {tags.map((t) => (
              <span key={t} className="rounded-full bg-ss-primary/15 px-2.5 py-0.5 font-semibold text-ss-primary">
                {t}
              </span>
            ))}
            <span className="text-ss-muted">
              Open {center.openFrom}-{center.openTo} · report in ~{center.turnaroundHours} h
            </span>
          </div>
          {!q.offersAll ? <p className="mt-2 text-xs font-medium text-red-300">Does not offer: {q.missing.join(', ')}</p> : null}
        </div>
      </label>
      {q.lines.length ? (
        <div className="mt-2 pl-7">
          <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="text-xs font-medium text-ss-primary">
            {open ? 'Hide' : 'Show'} price breakdown
          </button>
          {open ? (
            <ul className="mt-2 space-y-1 text-xs text-ss-muted">
              {q.lines.map((l) => (
                <li key={l.code} className="flex justify-between gap-3">
                  <span>{l.name}</span>
                  <span className="text-ss-text">{formatTaka(l.price)}</span>
                </li>
              ))}
              {q.discount ? (
                <li className="flex justify-between text-ss-secondary">
                  <span>Package discount</span>
                  <span>-{formatTaka(q.discount)}</span>
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function BookForm() {
  const router = useRouter();
  const params = useSearchParams();
  const testId = params.get('test');
  const packageId = params.get('package');
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [centerId, setCenterId] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    authApi
      .me()
      .then((res) => {
        setUser(res.user);
        setPhone(res.user.phone || '');
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  useEffect(() => {
    if (!user) return;
    if (!testId && !packageId) {
      setError('Select a test or package first');
      setData({ centers: [], tests: [] });
      return;
    }
    diagnosticsApi
      .listCenters(packageId ? { packageId } : { testIds: testId })
      .then((res) => {
        setData(res);
        setCenterId(res.recommendedCenterId || '');
      })
      .catch((err) => setError(err.message));
  }, [user, testId, packageId]);

  const center = useMemo(() => data?.centers.find((c) => c.id === centerId) || null, [data, centerId]);
  const slots = useMemo(() => slotsForCenter(center, date), [center, date]);

  useEffect(() => {
    if (slots.length && !slots.includes(slot)) setSlot(slots[0]);
    if (!slots.length) setSlot('');
  }, [slots, slot]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!center) return setError('Choose a diagnostic center');
    if (!slot) return setError('That center is closed on the chosen date. Pick another date or center.');
    setBusy(true);
    try {
      const payload = { address, contactPhone: phone, preferredDate: date, timeSlot: slot, centerId: center.id };
      if (packageId) payload.packageId = packageId;
      else payload.testIds = [testId];
      const res = await diagnosticsApi.createOrder(payload);
      router.push(`/reports?order=${res.order.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
    return undefined;
  }

  if (!user) return <PageSkeleton />;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <PatientShell user={user}>
      <Link href="/diagnostics" className="text-sm text-ss-primary">
        ← Back to tests
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-ss-text">Book home collection</h1>
      <p className="mt-1 text-sm text-ss-muted">Compare diagnostic centers, see exactly what you will pay, then choose the one that handles your order.</p>
      <div className="mt-4">
        <Alert message={error} />
      </div>

      {!data ? (
        <div className="mt-6">
          <ListSkeleton rows={3} lines={2} label="Finding diagnostic centers" />
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-8">
            <section aria-labelledby="sel-title">
              <h2 id="sel-title" className="font-semibold text-ss-text">
                1. Your tests
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.packageName ? <span className="rounded-full border border-ss-secondary/40 bg-ss-secondary/10 px-3 py-1 text-sm font-semibold text-ss-secondary">{data.packageName} · {data.discountPercent}% off</span> : null}
                {data.tests.map((t) => (
                  <span key={t.code} className="rounded-full border border-ss-border bg-ss-surface px-3 py-1 text-sm text-ss-text">
                    {t.name}
                    {t.fastingRequired ? <span className="ml-1 text-xs text-ss-tertiary">fasting</span> : null}
                  </span>
                ))}
              </div>
            </section>

            <section aria-labelledby="center-title">
              <h2 id="center-title" className="font-semibold text-ss-text">
                2. Choose a diagnostic center <span className="text-ss-tertiary" aria-hidden="true">*</span>
              </h2>
              <p className="text-xs text-ss-muted">Prices differ by center. The center you pick runs your tests and issues the signed report.</p>
              <div className="mt-3 space-y-3" role="radiogroup" aria-label="Diagnostic center">
                {data.centers.map((c) => (
                  <CenterCard
                    key={c.id}
                    center={c}
                    selected={c.id === centerId}
                    onSelect={setCenterId}
                    tags={[c.id === data.cheapestCenterId ? 'Cheapest' : null, c.id === data.fastestCenterId ? 'Fastest report' : null, c.id === data.recommendedCenterId ? 'Recommended' : null].filter(Boolean)}
                  />
                ))}
                {!data.centers.length ? <p className="ss-card p-5 text-sm text-ss-muted">No diagnostic centers are available yet.</p> : null}
              </div>
            </section>

            <section aria-labelledby="details-title" className="ss-card space-y-4 p-5">
              <h2 id="details-title" className="font-semibold text-ss-text">
                3. Collection details
              </h2>
              <p className="text-xs text-ss-muted">
                Fields marked <span className="text-ss-tertiary">*</span> are required.
              </p>
              <label className="block text-sm">
                <FieldLabel required>Home address</FieldLabel>
                <textarea className="ss-input mt-1 w-full" required rows={3} value={address} onChange={(e) => setAddress(e.target.value)} />
              </label>
              <label className="block text-sm">
                <FieldLabel required>Contact phone</FieldLabel>
                <input className="ss-input mt-1 w-full" required value={phone} onChange={(e) => setPhone(e.target.value)} />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <FieldLabel required>Preferred date</FieldLabel>
                  <input type="date" min={today} className="ss-input mt-1 w-full" required value={date} onChange={(e) => setDate(e.target.value)} />
                </label>
                <label className="block text-sm">
                  <FieldLabel required>Collection slot</FieldLabel>
                  <select className="ss-input mt-1 w-full" required value={slot} onChange={(e) => setSlot(e.target.value)} disabled={!slots.length}>
                    {slots.map((s) => (
                      <option key={s} value={s}>
                        {s.replace('-', ' – ')}
                      </option>
                    ))}
                    {!slots.length ? <option value="">{center ? 'Closed on this date' : 'Choose a center first'}</option> : null}
                  </select>
                </label>
              </div>
            </section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="Order summary">
            <div className="ss-card space-y-4 p-5">
              <h2 className="font-semibold text-ss-text">Order summary</h2>
              {center ? (
                <>
                  <div>
                    <p className="text-sm font-semibold text-ss-text">{center.name}</p>
                    <p className="text-xs text-ss-muted">{center.address}</p>
                    <span className={`mt-2 inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TONE[centerStatus(center).tone]}`}>{centerStatus(center).label}</span>
                  </div>
                  <ul className="space-y-1.5 border-t border-ss-border pt-3 text-sm">
                    {center.quote.lines.map((l) => (
                      <li key={l.code} className="flex justify-between gap-3">
                        <span className="text-ss-muted">{l.name}</span>
                        <span className="text-ss-text">{formatTaka(l.price)}</span>
                      </li>
                    ))}
                  </ul>
                  <dl className="space-y-1.5 border-t border-ss-border pt-3 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-ss-muted">Subtotal</dt>
                      <dd className="text-ss-text">{formatTaka(center.quote.subtotal)}</dd>
                    </div>
                    {center.quote.discount ? (
                      <div className="flex justify-between text-ss-secondary">
                        <dt>Package discount</dt>
                        <dd>-{formatTaka(center.quote.discount)}</dd>
                      </div>
                    ) : null}
                    <div className="flex justify-between">
                      <dt className="text-ss-muted">Home collection</dt>
                      <dd className={center.quote.freeCollection ? 'font-semibold text-ss-secondary' : 'text-ss-text'}>{center.quote.freeCollection ? 'FREE' : formatTaka(center.quote.collectionFee)}</dd>
                    </div>
                    <div className="flex justify-between border-t border-ss-border pt-2 text-base font-bold">
                      <dt className="text-ss-text">Total payable</dt>
                      <dd className="text-ss-primary">{formatTaka(center.quote.total)}</dd>
                    </div>
                  </dl>
                  <p className="text-xs text-ss-muted">Report expected within about {center.turnaroundHours} hours of sample collection. Pay on arrival by bKash, Nagad or cash.</p>
                </>
              ) : (
                <p className="text-sm text-ss-muted">Pick a diagnostic center to see the final price.</p>
              )}
              <button type="submit" disabled={busy || !center} className="ss-btn-primary inline-flex w-full items-center justify-center gap-2 disabled:opacity-50">
                {busy ? <Spinner /> : null}
                {busy ? 'Booking…' : 'Confirm home booking'}
              </button>
            </div>
          </aside>
        </form>
      )}
    </PatientShell>
  );
}

export default function DiagnosticsBookPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <BookForm />
    </Suspense>
  );
}
