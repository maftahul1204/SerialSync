/** Doctor verification documents: shared constants and client-side checks (mirrors the API). */

export const DOCUMENT_FIELDS = [
  { key: 'bmdcCertificate', label: 'BMDC registration certificate', required: true },
  { key: 'medicalDegree', label: 'Medical degree certificate (MBBS / postgraduate)', required: true },
  { key: 'nationalId', label: 'National ID or passport', required: true },
  { key: 'profilePhoto', label: 'Professional photo', required: false },
  { key: 'otherDocument', label: 'Other supporting document', required: false },
];

export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
export const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

export function labelForDocument(type) {
  return DOCUMENT_FIELDS.find((d) => d.key === type)?.label || type;
}

/** Error text for one picked file, or '' when it is fine. */
export function validateDocumentFile(file) {
  if (!file) return '';
  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) return 'Only PDF, JPG or PNG files are allowed';
  if (file.size > MAX_DOCUMENT_BYTES) return 'File is larger than 5 MB';
  return '';
}

/** Which required documents are still missing from a { key: File } map. */
export function missingRequiredDocuments(files) {
  return DOCUMENT_FIELDS.filter((d) => d.required && !files[d.key]).map((d) => d.label);
}

export function formatBytes(n) {
  if (!Number.isFinite(n)) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
