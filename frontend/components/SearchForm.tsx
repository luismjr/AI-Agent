"use client";

import { useState } from "react";
import { Search, X, Loader2 } from "lucide-react";

interface Props {
  initialTickers: string;
  initialQuery: string;
  onSubmit: (query: string, companies: string[]) => void;
  onReset: () => void;
  isStreaming: boolean;
}

export function SearchForm({
  initialTickers,
  initialQuery,
  onSubmit,
  onReset,
  isStreaming,
}: Props) {
  const [tickers, setTickers] = useState(initialTickers);
  const [query, setQuery] = useState(initialQuery);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const companies = tickers
      .split(/[\s,]+/)
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);
    if (companies.length === 0 || !query.trim()) return;
    onSubmit(query, companies);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface border border-border rounded-xl p-4 space-y-3"
    >
      <div>
        <label className="text-xs text-text-muted uppercase tracking-widest mb-1.5 block">
          Tickers
        </label>
        <input
          value={tickers}
          onChange={(e) => setTickers(e.target.value)}
          placeholder="AAPL, MSFT"
          className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm font-mono text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/60 transition-all"
        />
      </div>

      <div>
        <label className="text-xs text-text-muted uppercase tracking-widest mb-1.5 block">
          Research Question
        </label>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What do you want to know?"
          rows={3}
          className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/60 transition-all resize-none"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isStreaming || !tickers.trim() || !query.trim()}
          className="flex-1 bg-primary text-bg font-semibold py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-primary-dim transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
        >
          {isStreaming ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Analyzing…
            </>
          ) : (
            <>
              <Search size={14} />
              Analyze
            </>
          )}
        </button>

        {(isStreaming) && (
          <button
            type="button"
            onClick={onReset}
            className="px-3 bg-surface-2 border border-border rounded-lg text-text-muted hover:text-text-primary hover:border-border transition-all"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </form>
  );
}
