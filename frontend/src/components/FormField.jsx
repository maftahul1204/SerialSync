export default function FormField({ label, id, type = 'text', value, onChange, required, autoComplete, placeholder }) {
  return (
    <label htmlFor={id} className="block text-sm font-medium text-slate-700">
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
        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none ring-teal-500/30 placeholder:text-slate-400 focus:border-teal-500 focus:ring-2"
      />
    </label>
  );
}
