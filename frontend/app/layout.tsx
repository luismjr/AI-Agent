import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FinSight — AI Financial Research",
  description:
    "Multi-agent AI that retrieves and analyzes SEC filings using RAG + Claude Citations",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-bg text-text-primary min-h-screen">
        <nav className="border-b border-border bg-surface/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-md bg-primary/20 border border-primary/40 flex items-center justify-center">
                <span className="text-primary text-xs font-bold">FS</span>
              </div>
              <span className="font-semibold text-text-primary tracking-tight">
                Fin<span className="text-primary">Sight</span>
              </span>
              <span className="text-xs text-text-muted bg-surface-2 border border-border px-2 py-0.5 rounded-full">
                AI Research Agent
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-text-muted">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-positive animate-pulse" />
                Live
              </span>
              <span>SEC EDGAR · LangGraph · Claude</span>
            </div>
          </div>
        </nav>

        <main>{children}</main>
      </body>
    </html>
  );
}
