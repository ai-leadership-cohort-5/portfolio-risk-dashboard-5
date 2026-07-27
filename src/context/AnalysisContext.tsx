"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { AnalysisResult } from "@/lib/types";
import { clearCurrentAnalysis, getCurrentAnalysis, saveCurrentAnalysis } from "@/lib/storage";

interface AnalysisContextValue {
  result: AnalysisResult | null;
  setResult: (result: AnalysisResult | null) => void;
}

const AnalysisContext = createContext<AnalysisContextValue | undefined>(undefined);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [result, setResultState] = useState<AnalysisResult | null>(null);

  // Rehydrate the last analysis after mount (client-only; never during SSR).
  useEffect(() => {
    const stored = getCurrentAnalysis();
    if (stored) setResultState(stored);
  }, []);

  const setResult = useCallback((next: AnalysisResult | null) => {
    setResultState(next);
    if (next) saveCurrentAnalysis(next);
    else clearCurrentAnalysis();
  }, []);

  return (
    <AnalysisContext.Provider value={{ result, setResult }}>
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis(): AnalysisContextValue {
  const ctx = useContext(AnalysisContext);
  if (!ctx) {
    throw new Error("useAnalysis must be used within an AnalysisProvider");
  }
  return ctx;
}
