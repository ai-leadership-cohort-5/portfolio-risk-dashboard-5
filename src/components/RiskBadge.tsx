import type { RiskCategory } from "@/lib/types";

const STYLES: Record<RiskCategory, string> = {
  Green: "bg-[var(--risk-green-bg)] text-[var(--risk-green)]",
  Amber: "bg-[var(--risk-amber-bg)] text-[var(--risk-amber)]",
  Red: "bg-[var(--risk-red-bg)] text-[var(--risk-red)]",
};

export default function RiskBadge({ category }: { category: RiskCategory }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${STYLES[category]}`}
    >
      {category}
    </span>
  );
}
