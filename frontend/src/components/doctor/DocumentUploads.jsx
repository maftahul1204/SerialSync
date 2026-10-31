'use client';

import { DOCUMENT_FIELDS, formatBytes, validateDocumentFile } from '@/lib/documents';
import FieldLabel from '@/components/FieldLabel';

/**
 * File pickers for the doctor verification documents.
 * `files` is { key: File }; `only` limits the fields shown (used when re-uploading).
 */
export default function DocumentUploads({ files, onChange, only, errors = {} }) {
  const fields = only ? DOCUMENT_FIELDS.filter((f) => only.includes(f.key)) : DOCUMENT_FIELDS;
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold text-ss-text">Verification documents</legend>
      <p className="text-xs text-ss-muted">PDF, JPG or PNG, up to 5 MB each. Only administrators can see these files.</p>
      {fields.map((f) => {
        const file = files[f.key];
        const problem = errors[f.key] || validateDocumentFile(file);
        return (
          <div key={f.key} className="rounded-xl border border-ss-border bg-ss-surface/60 p-3">
            <label htmlFor={`doc-${f.key}`} className="block text-sm">
              <FieldLabel required={f.required} className="text-ss-text">
                {f.label}
              </FieldLabel>
            </label>
            <input
              id={`doc-${f.key}`}
              name={f.key}
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              required={f.required && !files[f.key]}
              onChange={(e) => onChange(f.key, e.target.files?.[0] || null)}
              className="mt-2 block w-full text-sm text-ss-muted file:mr-3 file:rounded-lg file:border-0 file:bg-ss-primary file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-slate-900"
            />
            {file ? (
              <p className="mt-1 text-xs text-ss-muted">
                {file.name} · {formatBytes(file.size)}
              </p>
            ) : null}
            {problem ? <p className="mt-1 text-xs text-red-300">{problem}</p> : null}
          </div>
        );
      })}
    </fieldset>
  );
}
