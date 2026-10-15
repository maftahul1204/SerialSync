export default function FieldLabel({ children, required, htmlFor, className = 'ss-label', as = 'span' }) {
  const mark = required ? (
    <>
      <span className="text-ss-tertiary" aria-hidden="true">
        {' '}
        *
      </span>
      <span className="sr-only"> (required)</span>
    </>
  ) : null;

  if (as === 'label' && htmlFor) {
    return (
      <label htmlFor={htmlFor} className={className}>
        {children}
        {mark}
      </label>
    );
  }

  return (
    <span className={className}>
      {children}
      {mark}
    </span>
  );
}
