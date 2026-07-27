// Client-side-only localStorage helpers. Everything here stays on the user's
// own device — no backend, no server-side persistence. This is what powers
// "since last upload" risk migration, customer history, and the intervention
// worklist audit trail across page reloads and browser restarts.

import type { AnalysisResult, PortfolioSnapshot, WorklistItem } from "./types";

const SNAPSHOT_HISTORY_KEY = "prd_snapshot_history_v1";
const WORKLIST_KEY = "prd_worklist_v1";
const CURRENT_ANALYSIS_KEY = "prd_current_analysis_v1";
const MAX_SNAPSHOTS = 12;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getSnapshotHistory(): PortfolioSnapshot[] {
  if (!isBrowser()) return [];
  return safeParse<PortfolioSnapshot[]>(window.localStorage.getItem(SNAPSHOT_HISTORY_KEY), []);
}

// Returns the most recent snapshot saved *before* this call (i.e. the
// baseline to compare the new analysis against), then persists the new one.
export function saveSnapshotAndGetPrevious(snapshot: PortfolioSnapshot): PortfolioSnapshot | null {
  if (!isBrowser()) return null;
  const history = getSnapshotHistory();
  const previous = history.length > 0 ? history[0] : null;
  const updated = [snapshot, ...history].slice(0, MAX_SNAPSHOTS);
  window.localStorage.setItem(SNAPSHOT_HISTORY_KEY, JSON.stringify(updated));
  return previous;
}

export function clearSnapshotHistory(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(SNAPSHOT_HISTORY_KEY);
}

export function getWorklist(): WorklistItem[] {
  if (!isBrowser()) return [];
  return safeParse<WorklistItem[]>(window.localStorage.getItem(WORKLIST_KEY), []);
}

export function saveWorklist(items: WorklistItem[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(WORKLIST_KEY, JSON.stringify(items));
}

export function saveCurrentAnalysis(result: AnalysisResult): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(CURRENT_ANALYSIS_KEY, JSON.stringify(result));
}

export function getCurrentAnalysis(): AnalysisResult | null {
  if (!isBrowser()) return null;
  const parsed = safeParse<AnalysisResult | null>(
    window.localStorage.getItem(CURRENT_ANALYSIS_KEY),
    null
  );
  if (!parsed) return null;
  // analysedAt round-trips through JSON as an ISO string — rebuild the Date so
  // the dashboard's toLocaleDateString/toLocaleTimeString calls keep working.
  return { ...parsed, analysedAt: new Date(parsed.analysedAt as unknown as string) };
}

export function clearCurrentAnalysis(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(CURRENT_ANALYSIS_KEY);
}
