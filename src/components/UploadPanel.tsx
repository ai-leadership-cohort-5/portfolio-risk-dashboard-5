"use client";

import type { ChangeEvent } from "react";

interface UploadPanelProps {
  title: string;
  subtext: string;
  accept: string;
  file: File | null;
  onChange: (file: File | null) => void;
}

export default function UploadPanel({ title, subtext, accept, file, onChange }: UploadPanelProps) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    onChange(selected);
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-[var(--foreground)]">{title}</h2>
      <p className="mt-1 text-xs text-[var(--muted)]">{subtext}</p>

      <input
        type="file"
        accept={accept}
        onChange={handleChange}
        className="mt-4 block w-full text-sm text-[var(--foreground)] file:mr-4 file:rounded-md file:border-0 file:bg-[#171a1f] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-black"
      />

      {file && (
        <p className="mt-2 text-xs text-[var(--muted)]">
          Selected: <span className="font-semibold text-[var(--foreground)]">{file.name}</span>
        </p>
      )}
    </div>
  );
}
