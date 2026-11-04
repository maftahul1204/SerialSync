'use client';

import { useEffect, useState } from 'react';
import Alert from '@/components/Alert';
import Modal from '@/components/Modal';
import { Spinner } from '@/components/Loading';

/** Yes/no confirmation with an inline error and a busy spinner. `onConfirm` may be async. */
export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger = true, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setBusy(false);
      setError('');
    }
  }, [open]);

  async function run() {
    setBusy(true);
    setError('');
    try {
      await onConfirm();
    } catch (err) {
      setError(err.message || 'Something went wrong');
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <Alert message={error} />
        <div className="text-sm text-ss-muted">{message}</div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="ss-btn-secondary">
            Go back
          </button>
          <button type="button" disabled={busy} onClick={run} className={`inline-flex items-center gap-2 ${danger ? 'ss-btn-danger-outline' : 'ss-btn-primary'}`}>
            {busy ? <Spinner /> : null}
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
