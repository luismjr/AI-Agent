export type AgentName =
  | "orchestrator"
  | "sec_fetcher"
  | "market_analyst"
  | "rag_retriever"
  | "synthesizer";

export type AgentStatus = "pending" | "running" | "complete" | "error";

export interface AgentStep {
  agent: AgentName;
  label: string;
  status: AgentStatus;
  messages: string[];
}

export interface Citation {
  cited_text: string;
  document_title: string;
  document_index: number;
}

export interface MarketSnapshot {
  ticker: string;
  company_name: string;
  current_price: number | null;
  change_pct: number | null;
  market_cap: string | null;
  pe_ratio: number | null;
  week_52_high: number | null;
  week_52_low: number | null;
  volume: string | null;
  price_history: { date: string; close: number; volume: number }[];
}

export type StreamEvent =
  | { type: "agent_start"; agent: AgentName; message: string }
  | { type: "agent_update"; agent: AgentName; message: string }
  | { type: "agent_complete"; agent: AgentName; message: string }
  | { type: "market_data"; ticker: string; data: MarketSnapshot }
  | { type: "text_chunk"; content: string }
  | { type: "citations"; data: Citation[] }
  | { type: "complete" }
  | { type: "error"; message: string };

export const AGENT_META: Record<AgentName, { label: string; icon: string }> = {
  orchestrator: { label: "Orchestrator", icon: "🎯" },
  sec_fetcher: { label: "SEC Filing Agent", icon: "📄" },
  market_analyst: { label: "Market Data Agent", icon: "📊" },
  rag_retriever: { label: "RAG Retriever", icon: "🔍" },
  synthesizer: { label: "Synthesis Agent", icon: "✨" },
};
