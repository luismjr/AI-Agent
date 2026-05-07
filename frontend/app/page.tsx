"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  FileText,
  Database,
  Zap,
  ArrowRight,
  BarChart2,
} from "lucide-react";

const EXAMPLE_QUERIES = [
  { tickers: "AAPL, MSFT", query: "Compare R&D investment and innovation strategy" },
  { tickers: "NVDA", query: "Analyze revenue growth drivers and risk factors" },
  { tickers: "TSLA, F", query: "Compare EV market strategy and financial outlook" },
  { tickers: "GOOGL", query: "Summarize AI initiatives and competitive positioning" },
];

const PIPELINE_STEPS = [
  { icon: FileText, label: "SEC EDGAR", desc: "Fetches real 10-K filings" },
  { icon: Database, label: "RAG + Qdrant", desc: "Semantic vector search" },
  { icon: Zap, label: "LangGraph", desc: "Multi-agent orchestration" },
  { icon: BarChart2, label: "Claude + Citations", desc: "Grounded analysis" },
];

export default function HomePage() {
  const router = useRouter();
  const [tickers, setTickers] = useState("");
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tickers.trim() || !query.trim()) return;
    const params = new URLSearchParams({ tickers, query });
    router.push(`/analyze?${params.toString()}`);
  };

  const fillExample = (ex: (typeof EXAMPLE_QUERIES)[0]) => {
    setTickers(ex.tickers);
    setQuery(ex.query);
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        {/* Grid background */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(#00d4aa 1px, transparent 1px), linear-gradient(90deg, #00d4aa 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative max-w-2xl w-full text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-xs text-primary">
            <TrendingUp size={12} />
            Multi-Agent Financial Research · Powered by Claude
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            AI-Powered{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              SEC Filing Analysis
            </span>
          </h1>

          <p className="text-text-secondary text-base leading-relaxed max-w-lg mx-auto">
            Drop in a ticker, ask a question. FinSight fetches real 10-K filings
            from SEC EDGAR, runs RAG over them, and delivers a cited financial
            analysis — all in real time.
          </p>

          {/* Main form */}
          <form
            onSubmit={handleSubmit}
            className="bg-surface border border-border rounded-2xl p-5 text-left space-y-4 glow-primary"
          >
            <div>
              <label className="text-xs text-text-muted uppercase tracking-widest mb-1.5 block">
                Ticker Symbols
              </label>
              <input
                value={tickers}
                onChange={(e) => setTickers(e.target.value)}
                placeholder="e.g. AAPL, MSFT, NVDA"
                className="w-full bg-surface-2 border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-all font-mono"
              />
            </div>

            <div>
              <label className="text-xs text-text-muted uppercase tracking-widest mb-1.5 block">
                Research Question
              </label>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Analyze revenue growth trends and key risk factors"
                rows={3}
                className="w-full bg-surface-2 border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-all resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={!tickers.trim() || !query.trim()}
              className="w-full bg-primary text-bg font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-primary-dim transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
            >
              Run Analysis <ArrowRight size={16} />
            </button>
          </form>

          {/* Example queries */}
          <div className="space-y-2 text-left">
            <p className="text-xs text-text-muted uppercase tracking-widest px-1">
              Try an example
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {EXAMPLE_QUERIES.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => fillExample(ex)}
                  className="bg-surface border border-border rounded-xl p-3 text-left hover:border-primary/40 hover:bg-surface-2 transition-all group"
                >
                  <div className="font-mono text-xs text-primary mb-1">
                    {ex.tickers}
                  </div>
                  <div className="text-xs text-text-secondary group-hover:text-text-primary transition-colors">
                    {ex.query}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline strip */}
      <div className="border-t border-border bg-surface/50 py-8">
        <div className="max-w-3xl mx-auto px-6">
          <p className="text-center text-xs text-text-muted uppercase tracking-widest mb-6">
            How it works
          </p>
          <div className="flex items-center justify-center gap-0">
            {PIPELINE_STEPS.map((step, i) => (
              <div key={i} className="flex items-center">
                <div className="flex flex-col items-center gap-2 px-4">
                  <div className="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center">
                    <step.icon size={18} className="text-primary" />
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-medium text-text-primary">
                      {step.label}
                    </div>
                    <div className="text-xs text-text-muted mt-0.5">
                      {step.desc}
                    </div>
                  </div>
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <ArrowRight size={14} className="text-border shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
