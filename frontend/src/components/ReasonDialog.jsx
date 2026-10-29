'use client';

import { useEffect, useState } from 'react';
import Alert from '@/components/Alert';
import FieldLabel from '@/components/FieldLabel';
import Modal from '@/components/Modal';

/**
 * Asks for a reason before a destructive action (cancel a serial, cancel a chamber day, reject a doctor).
 * `required` makes the reason mandatory. `onConfirm(reason)` may be async; errors are shown inline.
 */
export default function ReasonDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  required = true,
  danger = true,
  placeholder = 'Write a short reason',
  onConfirm,
  onClose,
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setReason('');
      setError('');
      setBusy(false);
    }
  }, [open]);

  async function submit(e) {
    e.preventDefault();
    const text = reason.trim();
    if (required && text.length < 3) {
      setError('Please write a reason (at least 3 characters)');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onConfirm(text);
    } catch (err) {
      setError(err.message || 'Something went wrong');
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={submit} className="space-y-4">
        {message ? <p className="text-sm text-ss-muted">{message}</p> : null}
        <Alert message={error} />
        <label className="block text-sm">
          <FieldLabel required={required} className="text-ss-muted">
            Reason{required ? '' : ' (optional)'}
          </FieldLabel>
          <textarea
            className="ss-input mt-1.5 w-full"
            rows={3}
            maxLength={300}
            value={reason}
            placeholder={placeholder}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="ss-btn-secondary">
            Keep as is
          </button>
          <button type="submit" disabled={busy} className={danger ? 'ss-btn-danger-outline' : 'ss-btn-primary'}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
