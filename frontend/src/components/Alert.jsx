export default function Alert({ type = 'error', message }) {
  if (!message) return null;
  const styles =
    type === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : 'border-red-200 bg-red-50 text-red-800';
  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${styles}`} role="alert">
      {message}
    </div>
  );
}
