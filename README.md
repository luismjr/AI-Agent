# FinSight — AI Financial Research Agent

> Multi-agent pipeline that fetches real SEC 10-K filings, runs RAG over them with Qdrant, and delivers a grounded financial analysis via Claude's Citations API — all streamed in real time to a Next.js dashboard.

![Tech Stack](https://img.shields.io/badge/Claude-Sonnet_4.6-00d4aa?style=flat-square) ![LangGraph](https://img.shields.io/badge/LangGraph-multi--agent-3b82f6?style=flat-square) ![Qdrant](https://img.shields.io/badge/Qdrant-vector_DB-ef4444?style=flat-square) ![FastAPI](https://img.shields.io/badge/FastAPI-SSE_streaming-009688?style=flat-square) ![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square)

---

## Architecture

```
User Query + Tickers
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│              LangGraph StateGraph                       │
│                                                         │
│  ┌──────────────┐   ┌──────────────┐                    │
│  │ Orchestrator │──▶│  Parallel    │──┐                 │
│  │   (plans)    │   │   Fetch      │  │                 │
│  └──────────────┘   │  ┌─────────┐ │  │                 │
│                     │  │SEC EDGAR│ │  │                 │
│                     │  ├─────────┤ │  │                 │
│                     │  │ yfinance│ │  │                 │
│                     │  └─────────┘ │  │                 │
│                     └──────────────┘  │                 │
│                                       ▼                 │
│                              ┌──────────────────┐       │
│                              │  RAG Retriever   │       │
│                              │  (Qdrant+fastembed)      │
│                              └────────┬─────────┘       │
│                                       ▼                 │
│                              ┌──────────────────┐       │
│                              │  Synthesizer     │       │
│                              │  Claude + Prompt │       │
│                              │  Caching +       │       │
│                              │  Citations API   │       │
│                              └────────┬─────────┘       │
└───────────────────────────────────────┼─────────────────┘
                                        │
                              FastAPI SSE Stream
                                        │
                              ┌─────────▼──────────┐
                              │  Next.js 14        │
                              │  Real-time UI      │
                              │  · Agent timeline  │
                              │  · Live stock chart│
                              │  · Streaming report│
                              │  · Citations panel │
                              └────────────────────┘
```

## Key Technologies

| Layer | Tech | Why it stands out |
|---|---|---|
| LLM | Claude Sonnet 4.6 | Latest model, Citations + Prompt Caching |
| Agents | LangGraph StateGraph | Stateful multi-agent orchestration |
| Vector DB | Qdrant + fastembed | In-process embedding, no external service |
| Filings | SEC EDGAR REST API | Real 10-K data, no scraping, no API key |
| Market | yfinance | Live price, P/E, 52-week range + history |
| Backend | FastAPI + SSE | Non-blocking streaming, async throughout |
| Frontend | Next.js 14 App Router | Server components, streaming UI |
| Charts | Recharts | Responsive area chart for price history |

## Features

- **Real SEC filings** — fetches the most recent 10-K for any public US company, extracts MD&A, Risk Factors, and Business sections
- **RAG pipeline** — chunks filings, embeds with `BAAI/bge-small-en-v1.5`, semantic search via Qdrant
- **Claude Citations** — every claim in the analysis is anchored to an exact passage from the source filing
- **Prompt Caching** — the first two document blocks are cached with `cache_control: ephemeral`, cutting repeat-query costs ~90%
- **Parallel agents** — SEC fetching and market data run concurrently via `asyncio.gather`
- **SSE streaming** — analysis text streams token-by-token to the browser; agent status updates appear in real time
- **Live market data** — stock price with 1-year chart, P/E, market cap, 52-week range

## Getting Started

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

### 3. Try it

1. Open `http://localhost:3000`
2. Enter tickers: `AAPL, MSFT`
3. Ask: `Compare R&D investment trends and innovation strategy`
4. Watch the agent pipeline run in real time

## Example Queries

| Tickers | Query |
|---|---|
| `NVDA` | Analyze revenue growth drivers and AI chip demand |
| `AAPL, MSFT` | Compare capital allocation and shareholder returns |
| `TSLA` | Summarize risk factors and competitive threats |
| `GOOGL, META` | Compare advertising revenue trends and AI investments |

## Environment Variables

```env
ANTHROPIC_API_KEY=       # Required — get from console.anthropic.com
MODEL_NAME=claude-sonnet-4-6   # Optional override
EDGAR_USER_AGENT=FinSight yourname@email.com  # Required by SEC EDGAR (polite use)
MAX_FILING_CHUNKS=60     # Max chunks indexed per filing
```

## Project Structure

```
finsight/
├── backend/
│   └── app/
│       ├── agents/
│       │   ├── graph.py        # LangGraph StateGraph definition
│       │   └── nodes.py        # Orchestrator, SEC, Market, RAG, Synthesis nodes
│       ├── services/
│       │   ├── sec_edgar.py    # EDGAR REST client + text extraction
│       │   ├── market_data.py  # yfinance wrapper
│       │   └── vector_store.py # Qdrant + fastembed
│       ├── routers/
│       │   ├── analyze.py      # SSE streaming endpoint
│       │   └── companies.py    # Company preview endpoint
│       ├── models/schemas.py   # Pydantic models
│       └── main.py
└── frontend/
    ├── app/
    │   ├── page.tsx            # Landing page
    │   └── analyze/page.tsx    # Main research interface
    ├── components/
    │   ├── AgentTimeline.tsx   # Real-time agent status
    │   ├── MarketDataCard.tsx  # Stock chart + metrics
    │   ├── ResearchReport.tsx  # Streaming analysis + citations
    │   └── SearchForm.tsx
    └── lib/
        ├── types.ts
        └── hooks/useStreamingAnalysis.ts  # SSE streaming hook
```
