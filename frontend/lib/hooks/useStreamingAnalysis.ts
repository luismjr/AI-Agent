"use client";

import { useState, useCallback, useRef } from "react";
import type {
  AgentName,
  AgentStep,
  Citation,
  MarketSnapshot,
  StreamEvent,
} from "../types";
import { AGENT_META } from "../types";

const AGENT_ORDER: AgentName[] = [
  "orchestrator",
  "sec_fetcher",
  "market_analyst",
  "rag_retriever",
  "synthesizer",
];

function initialSteps(): AgentStep[] {
  return AGENT_ORDER.map((agent) => ({
    agent,
    label: AGENT_META[agent].label,
    status: "pending",
    messages: [],
  }));
}

export function useStreamingAnalysis() {
  const [steps, setSteps] = useState<AgentStep[]>(initialSteps());
  const [analysis, setAnalysis] = useState("");
  const [citations, setCitations] = useState<Citation[]>([]);
  const [marketData, setMarketData] = useState<Record<string, MarketSnapshot>>({});
  const [isStreaming, setIsStreaming] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const updateStep = useCallback(
    (agent: AgentName, patch: Partial<AgentStep> & { appendMessage?: string }) => {
      setSteps((prev) =>
        prev.map((s) => {
          if (s.agent !== agent) return s;
          const messages =
            patch.appendMessage
              ? [...s.messages, patch.appendMessage]
              : patch.messages ?? s.messages;
          return { ...s, ...patch, messages };
        })
      );
    },
    []
  );

  const run = useCallback(
    async (query: string, companies: string[]) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setSteps(initialSteps());
      setAnalysis("");
      setCitations([]);
      setMarketData({});
      setIsStreaming(true);
      setIsComplete(false);
      setError(null);

      try {
        const res = await fetch("http://localhost:8000/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, companies }),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        if (!res.body) throw new Error("No response body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;

            let event: StreamEvent;
            try {
              event = JSON.parse(raw);
            } catch {
              continue;
            }

            switch (event.type) {
              case "agent_start":
                updateStep(event.agent, {
                  status: "running",
                  appendMessage: event.message,
                });
                break;

              case "agent_update":
                updateStep(event.agent, { appendMessage: event.message });
                break;

              case "agent_complete":
                updateStep(event.agent, {
                  status: "complete",
                  appendMessage: event.message,
                });
                break;

              case "market_data":
                setMarketData((prev) => ({
                  ...prev,
                  [event.ticker]: event.data,
                }));
                break;

              case "text_chunk":
                setAnalysis((prev) => prev + event.content);
                break;

              case "citations":
                setCitations(event.data);
                break;

              case "complete":
                setIsComplete(true);
                setIsStreaming(false);
                break;

              case "error":
                setError(event.message);
                setIsStreaming(false);
                break;
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError(err.message);
        }
        setIsStreaming(false);
      }
    },
    [updateStep]
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setSteps(initialSteps());
    setAnalysis("");
    setCitations([]);
    setMarketData({});
    setIsStreaming(false);
    setIsComplete(false);
    setError(null);
  }, []);

  return {
    steps,
    analysis,
    citations,
    marketData,
    isStreaming,
    isComplete,
    error,
    run,
    reset,
  };
}
