"""
LangGraph node functions.

Each node receives the current AgentState dict and a RunnableConfig that
carries a shared asyncio.Queue for streaming events to the SSE endpoint.
Nodes return a partial state dict that LangGraph merges into the full state.
"""

import asyncio
import json

import anthropic
from langgraph.config import RunnableConfig

from app.config import settings
from app.models.schemas import Citation, FilingChunk, MarketSnapshot
from app.services.market_data import fetch_market_snapshot
from app.services.sec_edgar import fetch_filings_for_ticker
from app.services.vector_store import index_chunks, retrieve_passages


# ── helpers ──────────────────────────────────────────────────────────────────

def _queue(config: RunnableConfig) -> asyncio.Queue:
    return config["configurable"]["event_queue"]


async def _emit(config: RunnableConfig, event: dict) -> None:
    await _queue(config).put(event)


# ── node 1: orchestrator ──────────────────────────────────────────────────────

async def orchestrate_node(state: dict, config: RunnableConfig) -> dict:
    await _emit(config, {
        "type": "agent_start",
        "agent": "orchestrator",
        "message": "Planning research strategy…",
    })

    companies = [t.upper().strip() for t in state["companies"]]

    await _emit(config, {
        "type": "agent_complete",
        "agent": "orchestrator",
        "message": f"Identified targets: {', '.join(companies)}",
    })

    return {"companies": companies}


# ── node 2: SEC filing fetcher ────────────────────────────────────────────────

async def fetch_sec_node(state: dict, config: RunnableConfig) -> dict:
    companies = state["companies"]

    await _emit(config, {
        "type": "agent_start",
        "agent": "sec_fetcher",
        "message": f"Fetching 10-K filings for {', '.join(companies)} from SEC EDGAR…",
    })

    all_chunks: list[FilingChunk] = []
    errors: list[str] = []

    for ticker in companies:
        try:
            chunks = await fetch_filings_for_ticker(ticker)
            all_chunks.extend(chunks)
            await _emit(config, {
                "type": "agent_update",
                "agent": "sec_fetcher",
                "message": f"✓ {ticker}: {len(chunks)} document chunks retrieved",
            })
        except Exception as exc:
            errors.append(f"{ticker}: {exc}")
            await _emit(config, {
                "type": "agent_update",
                "agent": "sec_fetcher",
                "message": f"⚠ {ticker}: {exc}",
            })

    await _emit(config, {
        "type": "agent_complete",
        "agent": "sec_fetcher",
        "message": f"Loaded {len(all_chunks)} total chunks across {len(companies)} filings",
    })

    return {"filing_chunks": [c.model_dump() for c in all_chunks]}


# ── node 3: market data fetcher ───────────────────────────────────────────────

async def fetch_market_node(state: dict, config: RunnableConfig) -> dict:
    companies = state["companies"]

    await _emit(config, {
        "type": "agent_start",
        "agent": "market_analyst",
        "message": f"Pulling live market data for {', '.join(companies)}…",
    })

    snapshots: list[MarketSnapshot] = []

    for ticker in companies:
        try:
            snap = await fetch_market_snapshot(ticker)
            snapshots.append(snap)
            await _emit(config, {
                "type": "market_data",
                "ticker": snap.ticker,
                "data": snap.model_dump(),
            })
        except Exception as exc:
            await _emit(config, {
                "type": "agent_update",
                "agent": "market_analyst",
                "message": f"⚠ {ticker} market data unavailable: {exc}",
            })

    await _emit(config, {
        "type": "agent_complete",
        "agent": "market_analyst",
        "message": f"Market snapshots ready for {len(snapshots)} ticker(s)",
    })

    return {"market_snapshots": [s.model_dump() for s in snapshots]}


# ── node 4: RAG indexer + retriever ──────────────────────────────────────────

async def rag_node(state: dict, config: RunnableConfig) -> dict:
    chunks_raw = state.get("filing_chunks", [])
    query = state["query"]
    companies = state["companies"]

    await _emit(config, {
        "type": "agent_start",
        "agent": "rag_retriever",
        "message": f"Embedding {len(chunks_raw)} chunks into Qdrant and running semantic search…",
    })

    chunks = [FilingChunk(**c) for c in chunks_raw]

    await asyncio.get_event_loop().run_in_executor(None, index_chunks, chunks)

    passages = await asyncio.get_event_loop().run_in_executor(
        None, retrieve_passages, query, companies, 10
    )

    await _emit(config, {
        "type": "agent_complete",
        "agent": "rag_retriever",
        "message": f"Retrieved {len(passages)} most relevant passages via vector search",
    })

    return {"retrieved_passages": passages}


# ── node 5: synthesis with Claude + Citations ─────────────────────────────────

async def synthesis_node(state: dict, config: RunnableConfig) -> dict:
    passages = state.get("retrieved_passages", [])
    market_snapshots = state.get("market_snapshots", [])
    query = state["query"]

    await _emit(config, {
        "type": "agent_start",
        "agent": "synthesizer",
        "message": "Generating grounded analysis with Claude + Citations…",
    })

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    # Build document blocks (with prompt caching on the first large doc)
    doc_blocks: list[dict] = []
    for i, passage in enumerate(passages):
        block: dict = {
            "type": "document",
            "source": {
                "type": "content",
                "content": [{"type": "text", "text": passage["text"]}],
            },
            "title": passage["title"],
            "context": f"SEC 10-K filing — {passage['company']} — {passage['section']} section ({passage['period']})",
            "citations": {"enabled": True},
        }
        # Cache the first two documents (largest context cost)
        if i < 2:
            block["cache_control"] = {"type": "ephemeral"}
        doc_blocks.append(block)

    # Append market context as plain text
    if market_snapshots:
        mkt_lines = []
        for s in market_snapshots:
            price = f"${s['current_price']}" if s.get("current_price") else "N/A"
            chg = f"{s['change_pct']:+.2f}%" if s.get("change_pct") is not None else ""
            pe = f"P/E {s['pe_ratio']}" if s.get("pe_ratio") else ""
            mkt_cap = s.get("market_cap") or ""
            mkt_lines.append(
                f"{s['ticker']} ({s.get('company_name','')}): {price} {chg}  {pe}  MarketCap {mkt_cap}"
            )
        market_ctx = "CURRENT MARKET DATA:\n" + "\n".join(mkt_lines)
        doc_blocks.append({"type": "text", "text": market_ctx})

    system_prompt = (
        "You are a senior financial analyst AI. Provide rigorous, data-driven analysis "
        "grounded exclusively in the provided SEC filings and market data. "
        "Always cite specific passages from the documents. "
        "Format your response using markdown with clear section headers."
    )

    user_message = (
        f"{query}\n\n"
        "Requirements:\n"
        "- Cite passages directly from the documents to support every major claim\n"
        "- Include specific numbers, percentages, and dates from the filings\n"
        "- Structure with markdown headers (##) for each major finding\n"
        "- End with a concise 'Key Takeaways' section"
    )
    doc_blocks.append({"type": "text", "text": user_message})

    full_analysis = ""
    all_citations: list[Citation] = []

    async with client.messages.stream(
        model=settings.model_name,
        max_tokens=4096,
        system=system_prompt,
        messages=[{"role": "user", "content": doc_blocks}],
    ) as stream:
        async for text_chunk in stream.text_stream:
            full_analysis += text_chunk
            await _emit(config, {"type": "text_chunk", "content": text_chunk})

        final_msg = await stream.get_final_message()

    # Extract citations from the completed response
    for block in final_msg.content:
        if hasattr(block, "citations") and block.citations:
            for cit in block.citations:
                all_citations.append(
                    Citation(
                        cited_text=getattr(cit, "cited_text", ""),
                        document_title=getattr(cit, "document_title", ""),
                        document_index=getattr(cit, "document_index", 0),
                    )
                )

    await _emit(config, {
        "type": "citations",
        "data": [c.model_dump() for c in all_citations],
    })

    await _emit(config, {
        "type": "agent_complete",
        "agent": "synthesizer",
        "message": f"Analysis complete — {len(all_citations)} source citations",
    })

    return {
        "analysis": full_analysis,
        "citations": [c.model_dump() for c in all_citations],
    }
