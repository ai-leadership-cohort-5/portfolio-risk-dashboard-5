import type { RiskCategory } from "@/lib/types";

const STYLES: Record<RiskCategory, { bg: string; fg: string; label: string }> = {
  Green: { bg: "var(--risk-green-bg)", fg: "var(--risk-green)", label: "Green (Low Risk)" },
  Amber: { bg: "var(--risk-amber-bg)", fg: "var(--risk-amber)", label: "Amber (Medium Risk)" },
  Red: { bg: "var(--risk-red-bg)", fg: "var(--risk-red)", label: "Red (High Risk)" },
};

export default function RiskBadge({ category, compact = false }: { category: RiskCategory; compact?: boolean }) {
  const style = STYLES[category];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium"
      style={{ backgroundColor: style.bg, color: style.fg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: style.fg }} />
      {compact ? category : style.label}
    </span>
  );
}
