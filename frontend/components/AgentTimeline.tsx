"use client";

import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import type { AgentStep } from "@/lib/types";
import { AGENT_META } from "@/lib/types";

interface Props {
  steps: AgentStep[];
}

function StatusIcon({ status }: { status: AgentStep["status"] }) {
  switch (status) {
    case "complete":
      return <CheckCircle2 size={16} className="text-positive shrink-0" />;
    case "running":
      return <Loader2 size={16} className="text-primary shrink-0 animate-spin" />;
    case "error":
      return <XCircle size={16} className="text-negative shrink-0" />;
    default:
      return <Circle size={16} className="text-muted shrink-0" />;
  }
}

export function AgentTimeline({ steps }: Props) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4 space-y-1">
      <h3 className="text-xs text-text-muted uppercase tracking-widest mb-3">
        Agent Pipeline
      </h3>

      {steps.map((step, i) => {
        const meta = AGENT_META[step.agent];
        const isActive = step.status === "running";
        const isDone = step.status === "complete";

        return (
          <div key={step.agent}>
            <div
              className={`flex items-start gap-3 rounded-lg p-2.5 transition-all ${
                isActive
                  ? "bg-primary/5 border border-primary/20"
                  : isDone
                  ? "bg-surface-2/50"
                  : "opacity-50"
              }`}
            >
              {/* Timeline connector */}
              <div className="flex flex-col items-center gap-0">
                <StatusIcon status={step.status} />
                {i < steps.length - 1 && (
                  <div
                    className={`w-px mt-1 h-full min-h-[8px] ${
                      isDone ? "bg-positive/30" : "bg-border"
                    }`}
                  />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{meta.icon}</span>
                  <span
                    className={`text-xs font-medium ${
                      isActive
                        ? "text-primary"
                        : isDone
                        ? "text-text-primary"
                        : "text-text-muted"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>

                {step.messages.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {step.messages.slice(-2).map((msg, j) => (
                      <p
                        key={j}
                        className="text-xs text-text-muted leading-relaxed truncate"
                      >
                        {msg}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
