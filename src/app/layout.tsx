import type { Metadata } from "next";
import "./globals.css";
import { AnalysisProvider } from "@/context/AnalysisContext";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Portfolio Risk Dashboard",
  description: "Lending & credit risk prototype",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AnalysisProvider>
          <NavBar />
          <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
          <footer className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-[var(--muted)] sm:px-6">
            Prototype for internal review only. No real customer data. All processing
            happens locally in your browser — nothing is uploaded to a server.
          </footer>
        </AnalysisProvider>
      </body>
    </html>
  );
}
