"use client";

import type { ChangeEvent, ReactNode } from "react";

interface UploadPanelProps {
  title: string;
  subtext: string;
  accept: string;
  file: File | null;
  onChange: (file: File | null) => void;
  extra?: ReactNode;
}

export default function UploadPanel({ title, subtext, accept, file, onChange, extra }: UploadPanelProps) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    onChange(selected);
  }

  return (
    <div className="rounded-xl border bg-[var(--surface)] p-5 shadow-sm" style={{ borderColor: "var(--border)" }}>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
        {subtext}
      </p>

      <div className="mt-4">
        <input
          type="file"
          accept={accept}
          onChange={handleChange}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#171a1f] file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:opacity-90"
        />
      </div>

      {file && (
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
          Selected: <span className="font-semibold" style={{ color: "var(--foreground)" }}>{file.name}</span>
        </p>
      )}

      {extra}
    </div>
  );
}
