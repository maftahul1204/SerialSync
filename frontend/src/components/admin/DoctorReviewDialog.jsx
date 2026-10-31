'use client';

import { useEffect, useState } from 'react';
import Alert from '@/components/Alert';
import Modal from '@/components/Modal';
import ReasonDialog from '@/components/ReasonDialog';
import { adminApi } from '@/lib/api';
import { formatBytes } from '@/lib/documents';

import { ListSkeleton } from '@/components/Loading';
function Row({ label, children }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 py-1.5 text-sm">
      <dt className="text-ss-muted">{label}</dt>
      <dd className="min-w-0 break-words font-medium text-ss-text">{children || <span className="text-ss-muted">Not provided</span>}</dd>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="rounded-xl border border-ss-border bg-ss-surface/60 p-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ss-primary">{title}</h3>
      {children}
    </section>
  );
}

const STATUS_STYLE = {
  approved: 'bg-ss-secondary/15 text-ss-secondary',
  rejected: 'bg-red-500/15 text-red-300',
  pending: 'bg-ss-tertiary/20 text-ss-tertiary',
};

/** Everything an admin needs to decide: profile, BMDC details, document checklist and the files. */
export default function DoctorReviewDialog({ doctorId, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [preview, setPreview] = useState('');

  useEffect(() => {
    let alive = true;
    adminApi
      .getDoctor(doctorId)
      .then((res) => alive && setData(res))
      .catch((err) => alive && setError(err.message));
    return () => {
      alive = false;
    };
  }, [doctorId]);

  async function approve() {
    setBusy(true);
    setError('');
    try {
      await adminApi.setDoctorApproval(doctorId, 'approved');
      onChanged();
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  async function reject(reason) {
    await adminApi.setDoctorApproval(doctorId, 'rejected', reason);
    onChanged();
    onClose();
  }

  const doctor = data?.doctor;
  const profile = doctor?.doctorProfile || {};
  const allProvided = data?.requiredDocuments?.every((r) => r.provided);
  const status = doctor?.doctorApprovalStatus || 'pending';

  return (
    <>
      <Modal open onClose={onClose} title={doctor ? `Review: ${doctor.fullName}` : 'Doctor details'} wide>
        <Alert message={error} />
        {!doctor && !error ? <ListSkeleton rows={3} lines={3} action={false} label="Loading doctor details" /> : null}
        {doctor ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLE[status]}`}>{status}</span>
              {!data.isActive ? <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-300">Account inactive</span> : null}
            </div>
            {doctor.doctorApprovalNote ? (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                <span className="font-semibold">Previous decision note:</span> {doctor.doctorApprovalNote}
              </p>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <Section title="Account">
                <dl>
                  <Row label="Full name">{doctor.fullName}</Row>
                  <Row label="Email">{doctor.email}</Row>
                  <Row label="Phone">{doctor.phone}</Row>
                  <Row label="Registered">{new Date(doctor.createdAt).toLocaleString()}</Row>
                  <Row label="Chambers / schedules">
                    {data.stats.chambers} / {data.stats.schedules}
                  </Row>
                </dl>
              </Section>
              <Section title="Professional details">
                <dl>
                  <Row label="Specialty">{profile.specialtyTitle}</Row>
                  <Row label="BMDC number">{profile.bmdcNumber}</Row>
                  <Row label="Degrees">{profile.degrees}</Row>
                  <Row label="Experience">{profile.experienceYears != null ? `${profile.experienceYears} years` : ''}</Row>
                  <Row label="Affiliations">{profile.affiliations}</Row>
                  <Row label="Room">{profile.roomLabel}</Row>
                </dl>
              </Section>
            </div>

            <Section title="Required documents checklist">
              <ul className="space-y-1.5 text-sm">
                {data.requiredDocuments.map((r) => (
                  <li key={r.type} className="flex items-center gap-2">
                    <span className={r.provided ? 'text-ss-secondary' : 'text-red-300'} aria-hidden>
                      {r.provided ? '✓' : '✕'}
                    </span>
                    <span className={r.provided ? 'text-ss-text' : 'text-red-200'}>{r.label}</span>
                    <span className="sr-only">{r.provided ? 'provided' : 'missing'}</span>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title={`Uploaded files (${doctor.documents.length})`}>
              <ul className="space-y-2">
                {doctor.documents.map((d) => {
                  const url = adminApi.documentUrl(d.url);
                  const isImage = d.mimeType?.startsWith('image/');
                  return (
                    <li key={d.id} className="rounded-lg border border-ss-border bg-ss-bg/60 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ss-text">{d.label}</p>
                          <p className="truncate text-xs text-ss-muted">
                            {d.originalName} · {formatBytes(d.size)} · {new Date(d.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {isImage ? (
                            <button type="button" onClick={() => setPreview(preview === d.id ? '' : d.id)} className="ss-btn-secondary px-3 py-1.5 text-xs">
                              {preview === d.id ? 'Hide preview' : 'Preview'}
                            </button>
                          ) : null}
                          <a href={url} target="_blank" rel="noreferrer" className="ss-btn-primary px-3 py-1.5 text-xs">
                            Open file
                          </a>
                        </div>
                      </div>
                      {isImage && preview === d.id ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={url} alt={d.label} className="mt-3 max-h-80 w-full rounded-lg object-contain" />
                      ) : null}
                    </li>
                  );
                })}
                {!doctor.documents.length ? <li className="text-sm text-red-200">This doctor has not uploaded any documents.</li> : null}
              </ul>
            </Section>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-ss-border pt-4">
              {!allProvided ? <p className="mr-auto text-xs text-red-200">Approval is blocked until all required documents are uploaded.</p> : null}
              {status !== 'rejected' ? (
                <button type="button" disabled={busy} onClick={() => setRejecting(true)} className="ss-btn-danger-outline">
                  Reject…
                </button>
              ) : null}
              {status !== 'approved' ? (
                <button type="button" disabled={busy || !allProvided} onClick={approve} className="ss-btn-primary disabled:opacity-50">
                  {busy ? 'Approving…' : 'Approve doctor'}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>
      <ReasonDialog
        open={rejecting}
        title="Reject doctor registration"
        message="The doctor will be notified (in-app and by SMS) with this reason and can re-upload documents."
        confirmLabel="Reject doctor"
        placeholder="e.g. BMDC number could not be verified"
        onConfirm={reject}
        onClose={() => setRejecting(false)}
      />
    </>
  );
}
