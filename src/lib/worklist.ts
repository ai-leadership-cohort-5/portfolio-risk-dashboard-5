// Intervention worklist logic: auto-seeds trackable entries for at-risk
// customers without clobbering work already in progress, so the list is a
// durable, auditable record of what was done and when.

import type { ScoredCustomer, WorklistItem, WorklistNote, WorklistStatus } from "./types";

function defaultDueDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

// Red customers get a shorter default SLA than Amber, reflecting urgency.
function dueDateForCategory(category: ScoredCustomer["category"]): string {
  if (category === "Red") return defaultDueDate(3);
  if (category === "Amber") return defaultDueDate(14);
  return defaultDueDate(30);
}

export function seedWorklist(
  existing: WorklistItem[],
  customers: ScoredCustomer[]
): WorklistItem[] {
  const existingIds = new Set(existing.map((item) => item.customerId));
  const flagged = customers.filter((c) => c.category === "Red" || c.category === "Amber");

  const newItems: WorklistItem[] = flagged
    .filter((c) => !existingIds.has(c.customerId))
    .map((c) => ({
      customerId: c.customerId,
      customerName: c.customerName,
      industrySector: c.industrySector,
      category: c.category,
      riskScore: c.riskScore,
      loanBalance: c.loanBalance,
      assignedTo: "Unassigned",
      dueDate: dueDateForCategory(c.category),
      status: "Open" as WorklistStatus,
      notes: [],
      createdAt: new Date().toISOString(),
    }));

  // Refresh category/score on existing items in case the customer's risk
  // profile changed since the item was created, but never touch status,
  // assignee, or notes — that's the auditable part.
  const flaggedById = new Map(flagged.map((c) => [c.customerId, c]));
  const refreshedExisting = existing.map((item) => {
    const latest = flaggedById.get(item.customerId);
    if (!latest) return item;
    return { ...item, category: latest.category, riskScore: latest.riskScore, loanBalance: latest.loanBalance };
  });

  return [...refreshedExisting, ...newItems];
}

export function addWorklistNote(item: WorklistItem, text: string): WorklistItem {
  const note: WorklistNote = { date: new Date().toISOString(), text };
  return { ...item, notes: [...item.notes, note] };
}

export function updateWorklistStatus(item: WorklistItem, status: WorklistStatus): WorklistItem {
  return { ...item, status };
}
