"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, AlertCircle, KeyRound, ExternalLink } from "lucide-react";
import { AgentTimeline } from "@/components/AgentTimeline";
import { MarketDataCard } from "@/components/MarketDataCard";
import { ResearchReport } from "@/components/ResearchReport";
import { SearchForm } from "@/components/SearchForm";
import { useStreamingAnalysis } from "@/lib/hooks/useStreamingAnalysis";

function isApiKeyError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("authentication failed") ||
    lower.includes("invalid x-api-key") ||
    lower.includes("anthropic_api_key") ||
    lower.includes("authentication_error")
  );
}

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
            isApiKeyError(error) ? (
              <div className="bg-surface border border-amber-500/40 rounded-xl p-5 animate-fade-in">
                <div className="flex items-center gap-2 mb-3">
                  <KeyRound size={16} className="text-amber-400 shrink-0" />
                  <p className="text-sm font-semibold text-amber-400">
                    API Key Required
                  </p>
                </div>
                <p className="text-xs text-text-secondary mb-4">
                  FinSight needs a valid Anthropic API key configured in the
                  backend. Follow these steps to set it up:
                </p>
                <ol className="space-y-3 text-xs text-text-secondary">
                  <li className="flex gap-2.5">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px]">
                      1
                    </span>
                    <span>
                      Sign in to the{" "}
                      <a
                        href="https://console.anthropic.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline underline-offset-2 inline-flex items-center gap-0.5 hover:opacity-80"
                      >
                        Anthropic Console
                        <ExternalLink size={10} />
                      </a>
                      {" "}— use your Anthropic credentials, or SSO if your
                      organization uses Claude for Work.
                    </span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px]">
                      2
                    </span>
                    <span>
                      Go to{" "}
                      <strong className="text-text-primary">
                        Settings → API Keys
                      </strong>
                      , create a new key, and copy it.
                    </span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px]">
                      3
                    </span>
                    <span>
                      Open{" "}
                      <code className="bg-surface-2 px-1 py-0.5 rounded text-[11px]">
                        backend/.env
                      </code>{" "}
                      and set:
                      <code className="bg-surface-2 px-2 py-1 rounded text-[11px] block mt-1.5 text-primary">
                        ANTHROPIC_API_KEY=sk-ant-…
                      </code>
                    </span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px]">
                      4
                    </span>
                    <span>
                      Restart the backend so the new key loads:
                      <code className="bg-surface-2 px-2 py-1 rounded text-[11px] block mt-1.5 text-text-primary">
                        uvicorn app.main:app --reload --port 8000
                      </code>
                    </span>
                  </li>
                </ol>
              </div>
            ) : (
              <div className="bg-negative/10 border border-negative/30 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
                <AlertCircle
                  size={16}
                  className="text-negative shrink-0 mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium text-negative">
                    Analysis Failed
                  </p>
                  <p className="text-xs text-text-muted mt-1 whitespace-pre-line">
                    {error}
                  </p>
                </div>
              </div>
            )
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
