export default function DashboardToggle({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-[var(--muted)]">{label}</span>}
      <div className="inline-flex rounded-md border border-[var(--border)] p-0.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={
              value === opt.value
                ? "rounded px-2.5 py-1 text-xs font-medium bg-[var(--accent)] text-white"
                : "rounded px-2.5 py-1 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
            }
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
