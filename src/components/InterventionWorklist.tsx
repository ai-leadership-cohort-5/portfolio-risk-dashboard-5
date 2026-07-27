"use client";

import { useState } from "react";
import RiskBadge from "@/components/RiskBadge";
import { saveWorklist } from "@/lib/storage";
import type { WorklistItem, WorklistStatus } from "@/lib/types";
import { addWorklistNote } from "@/lib/worklist";

const STATUS_OPTIONS: WorklistStatus[] = ["Open", "In Progress", "Resolved"];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export default function InterventionWorklist({
  items,
  onChange,
  onSelectCustomer,
}: {
  items: WorklistItem[];
  onChange: (items: WorklistItem[]) => void;
  onSelectCustomer: (customerId: string) => void;
}) {
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [showResolved, setShowResolved] = useState(false);

  function persist(updated: WorklistItem[]) {
    onChange(updated);
    saveWorklist(updated);
  }

  function updateItem(customerId: string, patch: Partial<WorklistItem>) {
    persist(items.map((item) => (item.customerId === customerId ? { ...item, ...patch } : item)));
  }

  function submitNote(customerId: string) {
    const text = (noteDraft[customerId] ?? "").trim();
    if (!text) return;
    persist(
      items.map((item) => (item.customerId === customerId ? addWorklistNote(item, text) : item))
    );
    setNoteDraft((prev) => ({ ...prev, [customerId]: "" }));
  }

  const visible = items
    .filter((item) => showResolved || item.status !== "Resolved")
    .sort((a, b) => b.riskScore - a.riskScore);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Intervention Worklist</h2>
        <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
          />
          Show resolved
        </label>
      </div>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Auto-populated from Red and Amber customers. Assign an owner, set a due date, and log the
        action taken — this record persists in your browser as an auditable history.
      </p>

      {visible.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--muted)]">No open interventions.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {visible.map((item) => (
            <div key={item.customerId} className="rounded-lg border border-[var(--border)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <button
                    type="button"
                    onClick={() => onSelectCustomer(item.customerId)}
                    className="text-sm font-medium text-[var(--accent)] underline-offset-2 hover:underline"
                  >
                    {item.customerName}
                  </button>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--muted)]">
                    <span>{item.industrySector}</span>
                    <span>·</span>
                    <span>Risk {item.riskScore}</span>
                    <span>·</span>
                    <span>{formatCurrency(item.loanBalance)}</span>
                    <RiskBadge category={item.category} />
                  </div>
                </div>
                <select
                  value={item.status}
                  onChange={(e) => updateItem(item.customerId, { status: e.target.value as WorklistStatus })}
                  className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs font-medium text-[var(--foreground)]"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <label className="text-xs text-[var(--muted)]">
                  Assigned to
                  <input
                    type="text"
                    value={item.assignedTo}
                    onChange={(e) => updateItem(item.customerId, { assignedTo: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-[var(--border)] px-2 py-1 text-sm text-[var(--foreground)]"
                  />
                </label>
                <label className="text-xs text-[var(--muted)]">
                  Due date
                  <input
                    type="date"
                    value={item.dueDate}
                    onChange={(e) => updateItem(item.customerId, { dueDate: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-[var(--border)] px-2 py-1 text-sm text-[var(--foreground)]"
                  />
                </label>
              </div>

              {item.notes.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-[var(--border)] pt-2">
                  {item.notes.map((note, i) => (
                    <li key={i} className="text-xs text-[var(--muted)]">
                      <span className="font-medium text-[var(--foreground)]">
                        {new Date(note.date).toLocaleString("en-AU")}
                      </span>{" "}
                      — {note.text}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  placeholder="Log an action taken…"
                  value={noteDraft[item.customerId] ?? ""}
                  onChange={(e) => setNoteDraft((prev) => ({ ...prev, [item.customerId]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitNote(item.customerId);
                  }}
                  className="flex-1 rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--foreground)]"
                />
                <button
                  type="button"
                  onClick={() => submitNote(item.customerId)}
                  className="rounded-md bg-[var(--accent)] px-3 py-1 text-xs font-medium text-white"
                >
                  Log
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
