import FieldLabel from '@/components/FieldLabel';

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
  max,
  step,
}) {
  return (
    <label htmlFor={id} className="block">
      <FieldLabel required={required}>{label}</FieldLabel>
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
        max={max}
        step={step}
        className="ss-input mt-1.5"
      />
    </label>
  );
}
