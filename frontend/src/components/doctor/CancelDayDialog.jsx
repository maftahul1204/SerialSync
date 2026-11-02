'use client';

import { useEffect, useMemo, useState } from 'react';
import Alert from '@/components/Alert';
import FieldLabel from '@/components/FieldLabel';
import Modal from '@/components/Modal';
import { Spinner } from '@/components/Loading';
import { scheduleApi } from '@/lib/api';
import { todayYmd } from '@/lib/format';

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function upcomingDates(schedule, count = 8) {
  const closed = new Set((schedule.closedDates || []).map((c) => c.date));
  const out = [];
  const d = new Date();
  for (let i = 0; i < 60 && out.length < count; i += 1) {
    const ymd = todayYmd(d);
    if (schedule.daysOfWeek.includes(d.getDay()) && !closed.has(ymd)) out.push({ ymd, label: `${DAY[d.getDay()]} ${ymd}` });
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/**
 * Doctor cancels one chamber day. Every patient booked that day is cancelled, told the reason by
 * in-app notification + SMS, and pointed at the next available slot.
 */
export default function CancelDayDialog({ schedule, date: fixedDate, onClose, onDone }) {
  const dates = useMemo(() => upcomingDates(schedule), [schedule]);
  const [date, setDate] = useState(fixedDate || dates[0]?.ymd || '');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!fixedDate && !date && dates[0]) setDate(dates[0].ymd);
  }, [dates, date, fixedDate]);

  async function submit(e) {
    e.preventDefault();
    if (!date) return setError('Choose the day to cancel');
    if (reason.trim().length < 3) return setError('Please write a reason so patients understand');
    setBusy(true);
    setError('');
    try {
      const res = await scheduleApi.cancelDay(schedule.id, { date, reason: reason.trim() });
      onDone(res);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
    return undefined;
  }

  return (
    <Modal open onClose={onClose} title={`Cancel a day · ${schedule.chamber?.name || 'Chamber'}`}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-ss-muted">
          Booked patients are cancelled automatically, notified with your reason, and shown the next available slot. No new
          bookings are accepted for that day.
        </p>
        <Alert message={error} />
        {!fixedDate ? (
          <label className="block text-sm">
            <FieldLabel required className="text-ss-muted">Day to cancel</FieldLabel>
            <select className="ss-input mt-1.5 w-full" required value={date} onChange={(e) => setDate(e.target.value)}>
              {dates.map((d) => (
                <option key={d.ymd} value={d.ymd}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="rounded-xl border border-ss-border bg-ss-surface px-3 py-2 text-sm text-ss-text">Day: {fixedDate}</p>
        )}
        <label className="block text-sm">
          <FieldLabel required className="text-ss-muted">Reason shown to patients</FieldLabel>
          <textarea className="ss-input mt-1.5 w-full" rows={3} required maxLength={300} value={reason} placeholder="e.g. Attending a medical conference" onChange={(e) => setReason(e.target.value)} />
        </label>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="ss-btn-secondary">
            Keep this day
          </button>
          <button type="submit" disabled={busy} className="ss-btn-danger-outline inline-flex items-center gap-2">
            {busy ? <Spinner /> : null}
            {busy ? 'Cancelling…' : 'Cancel this day'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
