"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Upload" },
  { href: "/dashboard", label: "Executive Dashboard" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <>
      <div style={{ backgroundColor: "var(--accent)" }} className="h-[3px] w-full" />
      <header className="w-full border-b bg-[var(--surface)]" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div
              className="relative h-7 w-7 flex-shrink-0 rounded-md"
              style={{ backgroundColor: "var(--accent)" }}
            >
              <div
                className="absolute left-1.5 top-1.5 h-4 w-4 rounded-sm"
                style={{ backgroundColor: "var(--surface)" }}
              />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">Portfolio Risk Dashboard</p>
              <p className="text-xs leading-tight" style={{ color: "var(--muted)" }}>
                Lending & credit risk prototype
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-1">
            {LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={
                    active
                      ? "rounded-md px-3 py-1.5 text-sm font-medium text-white"
                      : "rounded-md px-3 py-1.5 text-sm font-medium hover:bg-[var(--background)]"
                  }
                  style={active ? { backgroundColor: "var(--accent)" } : { color: "var(--foreground)" }}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
    </>
  );
}
