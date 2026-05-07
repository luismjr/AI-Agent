"""
LangGraph StateGraph definition for the FinSight multi-agent pipeline.

Flow:
    orchestrate → fetch_sec ──┐
                               ├─→ rag_retrieve → synthesize
    (parallel)  fetch_market ──┘

Because LangGraph fan-out/fan-in requires Send semantics we use a linear
chain but run market data fetch concurrently inside the node using asyncio.
The graph is compiled once at startup and reused across requests.
"""

import asyncio
from typing import Annotated, TypedDict
import operator

from langgraph.graph import StateGraph, START, END

from app.agents.nodes import (
    fetch_market_node,
    fetch_sec_node,
    orchestrate_node,
    rag_node,
    synthesis_node,
)


class FinSightState(TypedDict):
    query: str
    companies: list[str]
    filing_chunks: list[dict]
    market_snapshots: list[dict]
    retrieved_passages: list[dict]
    analysis: str
    citations: list[dict]


# ── parallel SEC + market node ────────────────────────────────────────────────

async def parallel_fetch_node(state: FinSightState, config) -> dict:
    """Runs SEC fetching and market data retrieval concurrently."""
    sec_result, mkt_result = await asyncio.gather(
        fetch_sec_node(state, config),
        fetch_market_node(state, config),
    )
    return {**sec_result, **mkt_result}


# ── build graph ───────────────────────────────────────────────────────────────

def build_graph():
    workflow = StateGraph(FinSightState)

    workflow.add_node("orchestrate", orchestrate_node)
    workflow.add_node("parallel_fetch", parallel_fetch_node)
    workflow.add_node("rag_retrieve", rag_node)
    workflow.add_node("synthesize", synthesis_node)

    workflow.add_edge(START, "orchestrate")
    workflow.add_edge("orchestrate", "parallel_fetch")
    workflow.add_edge("parallel_fetch", "rag_retrieve")
    workflow.add_edge("rag_retrieve", "synthesize")
    workflow.add_edge("synthesize", END)

    return workflow.compile()


graph = build_graph()


# ── streaming runner ──────────────────────────────────────────────────────────

async def run_pipeline(
    query: str,
    companies: list[str],
    event_queue: asyncio.Queue,
) -> None:
    """Execute the full pipeline and push SSE events into event_queue."""
    initial_state: FinSightState = {
        "query": query,
        "companies": companies,
        "filing_chunks": [],
        "market_snapshots": [],
        "retrieved_passages": [],
        "analysis": "",
        "citations": [],
    }

    config = {"configurable": {"event_queue": event_queue}}

    try:
        await graph.ainvoke(initial_state, config=config)
        await event_queue.put({"type": "complete"})
    except Exception as exc:
        await event_queue.put({"type": "error", "message": str(exc)})
    finally:
        await event_queue.put(None)
