"use client";

import type { BreachSeverity, PolicyBreach } from "@/lib/types";

const SEVERITY_STYLE: Record<BreachSeverity, { badge: string; label: string }> = {
  breach: { badge: "bg-[var(--risk-red-bg)] text-[var(--risk-red)]", label: "Breach" },
  warning: { badge: "bg-[var(--risk-amber-bg)] text-[var(--risk-amber)]", label: "Warning" },
  info: { badge: "bg-[var(--background)] text-[var(--muted)]", label: "Info" },
};

export default function PolicyBreachPanel({
  breaches,
  pdfFileName,
}: {
  breaches: PolicyBreach[];
  pdfFileName: string | null;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-[var(--foreground)]">Policy Breach Detection</h2>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Portfolio tested against numeric thresholds extracted from {pdfFileName ?? "the policy document"}.
      </p>

      {!pdfFileName ? (
        <p className="mt-3 text-sm text-[var(--muted)]">
          No policy PDF was uploaded, so no thresholds could be tested against the portfolio.
        </p>
      ) : breaches.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--muted)]">
          No numeric policy thresholds were breached based on the rules extracted from this document.
        </p>
      ) : (
        <ul className="mt-3 max-h-80 space-y-3 overflow-y-auto pr-1">
          {breaches.map((b) => (
            <li key={b.id} className="border-l-2 border-[var(--border)] pl-3">
              <div className="flex items-center gap-2">
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${SEVERITY_STYLE[b.severity].badge}`}>
                  {SEVERITY_STYLE[b.severity].label}
                </span>
                <span className="text-sm font-medium text-[var(--foreground)]">{b.title}</span>
              </div>
              <p className="mt-1 text-sm text-[var(--foreground)]">{b.detail}</p>
              <p className="mt-1 text-xs italic text-[var(--muted)]">Policy clause: &ldquo;{b.ruleText}&rdquo;</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
