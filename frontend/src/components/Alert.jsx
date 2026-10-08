export default function Alert({ type = 'error', message }) {
  if (!message) return null;
  const styles =
    type === 'success'
      ? 'border-ss-secondary/40 bg-ss-secondary/10 text-ss-secondary'
      : 'border-red-500/40 bg-red-500/10 text-red-200';
  return (
    <div className={`rounded-xl border px-3 py-2 text-sm ${styles}`} role="alert">
      {message}
    </div>
  );
}
