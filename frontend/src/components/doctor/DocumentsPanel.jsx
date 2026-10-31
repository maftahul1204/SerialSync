'use client';

import { useState } from 'react';
import Alert from '@/components/Alert';
import DocumentUploads from '@/components/doctor/DocumentUploads';
import { Spinner } from '@/components/Loading';
import { authApi, userApi } from '@/lib/api';
import { formatBytes, labelForDocument, validateDocumentFile } from '@/lib/documents';

/** A doctor's own verification documents: view what was submitted and replace files. */
export default function DocumentsPanel({ user, onUpdated }) {
  const [files, setFiles] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const docs = user.documents || [];

  async function submit(e) {
    e.preventDefault();
    const picked = Object.entries(files).filter(([, f]) => f);
    if (!picked.length) return setError('Choose at least one file to upload');
    const bad = picked.map(([, f]) => validateDocumentFile(f)).find(Boolean);
    if (bad) return setError(bad);
    setBusy(true);
    setError('');
    setDone('');
    try {
      const form = new FormData();
      picked.forEach(([k, f]) => form.append(k, f));
      const res = await userApi.uploadDocuments(form);
      setFiles({});
      setDone(res.resubmitted ? 'Documents re-submitted. An administrator will review them again.' : 'Documents updated.');
      const me = await authApi.me();
      onUpdated(me.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
    return undefined;
  }

  return (
    <section className="ss-card mt-6 p-5" aria-labelledby="docs-title">
      <h2 id="docs-title" className="font-semibold text-ss-text">
        Your verification documents
      </h2>
      <ul className="mt-3 space-y-2 text-sm">
        {docs.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ss-border bg-ss-bg/60 px-3 py-2">
            <span className="min-w-0">
              <span className="block truncate font-medium text-ss-text">{labelForDocument(d.type)}</span>
              <span className="block truncate text-xs text-ss-muted">
                {d.originalName} · {formatBytes(d.size)}
              </span>
            </span>
            <a href={userApi.documentUrl(d.id)} target="_blank" rel="noreferrer" className="ss-btn-secondary px-3 py-1.5 text-xs">
              View
            </a>
          </li>
        ))}
        {!docs.length ? <li className="text-ss-muted">No documents on file.</li> : null}
      </ul>

      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-medium text-ss-primary">Replace or add documents</summary>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <Alert message={error} />
          <Alert type="success" message={done} />
          <DocumentUploads files={files} onChange={(k, f) => setFiles((x) => ({ ...x, [k]: f }))} />
          <button type="submit" disabled={busy} className="ss-btn-primary inline-flex items-center gap-2">
            {busy ? <Spinner /> : null}
            {busy ? 'Uploading…' : 'Upload documents'}
          </button>
        </form>
      </details>
    </section>
  );
}
