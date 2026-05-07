"use client";

import { useEffect, useRef } from "react";
import type { Citation } from "@/lib/types";
import { FileText } from "lucide-react";

interface Props {
  analysis: string;
  citations: Citation[];
  isStreaming: boolean;
}

function renderMarkdown(text: string): string {
  return text
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/gs, (match) => `<ul>${match}</ul>`)
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hul])(.+)$/gm, (line) =>
      line.trim() ? `<p>${line}</p>` : ''
    );
}

export function ResearchReport({ analysis, citations, isStreaming }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isStreaming) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [analysis, isStreaming]);

  if (!analysis && !isStreaming) return null;

  return (
    <div className="bg-surface border border-border rounded-xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <FileText size={15} className="text-primary" />
          <span className="text-sm font-medium text-text-primary">
            Research Report
          </span>
          {isStreaming && (
            <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full animate-pulse">
              Generating…
            </span>
          )}
        </div>
        {citations.length > 0 && (
          <span className="text-xs text-text-muted">
            {citations.length} citation{citations.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-5">
        <div
          className={`prose-finance ${isStreaming ? "streaming-cursor" : ""}`}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(analysis) }}
        />
        <div ref={bottomRef} />
      </div>

      {/* Citations */}
      {citations.length > 0 && (
        <div className="border-t border-border px-5 py-4">
          <p className="text-xs text-text-muted uppercase tracking-widest mb-3">
            Sources
          </p>
          <div className="space-y-2">
            {citations.map((cit, i) => (
              <div
                key={i}
                className="bg-surface-2 border border-border rounded-lg p-3 hover:border-accent/40 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <span className="text-xs font-mono text-accent bg-accent/10 px-1.5 py-0.5 rounded shrink-0">
                    [{i + 1}]
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-text-secondary truncate">
                      {cit.document_title}
                    </p>
                    <p className="text-xs text-text-muted mt-1 leading-relaxed line-clamp-2 italic">
                      &ldquo;{cit.cited_text}&rdquo;
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
