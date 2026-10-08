export default function FormField({
  label,
  id,
  type = 'text',
  value,
  onChange,
  required,
  autoComplete,
  placeholder,
  min,
}) {
  return (
    <label htmlFor={id} className="ss-label">
      {label}
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        min={min}
        className="ss-input mt-1.5"
      />
    </label>
  );
}
