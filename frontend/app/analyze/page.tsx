"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { AgentTimeline } from "@/components/AgentTimeline";
import { MarketDataCard } from "@/components/MarketDataCard";
import { ResearchReport } from "@/components/ResearchReport";
import { SearchForm } from "@/components/SearchForm";
import { useStreamingAnalysis } from "@/lib/hooks/useStreamingAnalysis";

function AnalyzePage() {
  const params = useSearchParams();
  const router = useRouter();

  const tickersParam = params.get("tickers") ?? "";
  const queryParam = params.get("query") ?? "";

  const {
    steps,
    analysis,
    citations,
    marketData,
    isStreaming,
    isComplete,
    error,
    run,
    reset,
  } = useStreamingAnalysis();

  // Auto-start on mount if params are provided
  useEffect(() => {
    if (!tickersParam || !queryParam) return;
    const companies = tickersParam
      .split(/[\s,]+/)
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);
    run(queryParam, companies);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = (query: string, companies: string[]) => {
    reset();
    run(query, companies);
  };

  const marketSnapshots = Object.values(marketData);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push("/")}
          className="p-2 rounded-lg bg-surface border border-border text-text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="min-w-0">
          <h1 className="text-sm font-medium text-text-primary truncate">
            {queryParam || "Financial Analysis"}
          </h1>
          {tickersParam && (
            <p className="text-xs text-text-muted font-mono">{tickersParam}</p>
          )}
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
        {/* Left sidebar */}
        <div className="space-y-4">
          <SearchForm
            initialTickers={tickersParam}
            initialQuery={queryParam}
            onSubmit={handleSubmit}
            onReset={reset}
            isStreaming={isStreaming}
          />

          <AgentTimeline steps={steps} />

          {/* Market data cards */}
          {marketSnapshots.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-text-muted uppercase tracking-widest px-1">
                Market Data
              </p>
              {marketSnapshots.map((snap) => (
                <MarketDataCard key={snap.ticker} snapshot={snap} />
              ))}
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="space-y-4 min-w-0">
          {/* Error state */}
          {error && (
            <div className="bg-negative/10 border border-negative/30 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
              <AlertCircle
                size={16}
                className="text-negative shrink-0 mt-0.5"
              />
              <div>
                <p className="text-sm font-medium text-negative">
                  Analysis Failed
                </p>
                <p className="text-xs text-text-muted mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!analysis && !isStreaming && !error && (
            <div className="border border-dashed border-border rounded-xl p-16 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-surface-2 border border-border flex items-center justify-center mb-4">
                <span className="text-2xl">🔍</span>
              </div>
              <p className="text-sm text-text-secondary font-medium">
                Ready to analyze
              </p>
              <p className="text-xs text-text-muted mt-1 max-w-xs">
                Enter tickers and a research question to start the multi-agent
                pipeline
              </p>
            </div>
          )}

          {/* Loading state before text starts */}
          {isStreaming && !analysis && (
            <div className="border border-border rounded-xl p-8 flex items-center justify-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
              <span className="text-sm text-text-muted ml-2">
                Agents are working…
              </span>
            </div>
          )}

          {/* Report */}
          <ResearchReport
            analysis={analysis}
            citations={citations}
            isStreaming={isStreaming}
          />

          {/* Complete badge */}
          {isComplete && (
            <div className="flex items-center justify-center py-2 animate-fade-in">
              <span className="text-xs text-positive bg-positive/10 border border-positive/20 px-3 py-1 rounded-full">
                ✓ Analysis complete
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AnalyzePageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-text-muted text-sm">Loading…</div>
        </div>
      }
    >
      <AnalyzePage />
    </Suspense>
  );
}
