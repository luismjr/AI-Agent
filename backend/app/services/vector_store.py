"""
Qdrant in-memory vector store with fastembed auto-embedding.

One singleton client is shared for the lifetime of the server process.
Each analysis request clears and re-populates the collection so that
only the current session's filings are searched.
"""

import warnings

from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue

from app.config import settings
from app.models.schemas import FilingChunk

_client: QdrantClient | None = None


def get_client() -> QdrantClient:
    global _client
    if _client is None:
        _client = QdrantClient(location=settings.qdrant_location)
        _client.set_model("BAAI/bge-small-en-v1.5")
    return _client


def index_chunks(chunks: list[FilingChunk]) -> None:
    client = get_client()

    if client.collection_exists(settings.collection_name):
        client.delete_collection(settings.collection_name)

    documents = [c.text for c in chunks]
    metadata = [
        {
            "company": c.company,
            "ticker": c.ticker,
            "section": c.section,
            "period": c.period,
            "filing_type": c.filing_type,
            "chunk_index": c.chunk_index,
        }
        for c in chunks
    ]
    ids = list(range(len(chunks)))

    # suppress the deprecation warning — `add`/`query` are still functional
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        client.add(
            collection_name=settings.collection_name,
            documents=documents,
            metadata=metadata,
            ids=ids,
        )


def retrieve_passages(query: str, tickers: list[str], top_k: int = 8) -> list[dict]:
    client = get_client()

    if not client.collection_exists(settings.collection_name):
        return []

    query_filter = None
    if tickers:
        query_filter = Filter(
            should=[
                FieldCondition(key="ticker", match=MatchValue(value=t.upper()))
                for t in tickers
            ]
        )

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        results = client.query(
            collection_name=settings.collection_name,
            query_text=query,
            limit=top_k,
            query_filter=query_filter,
        )

    passages = []
    for r in results:
        payload = r.metadata or {}
        passages.append({
            "text": r.document,
            "ticker": payload.get("ticker", ""),
            "company": payload.get("company", ""),
            "section": payload.get("section", ""),
            "period": payload.get("period", ""),
            "score": round(r.score, 4) if hasattr(r, "score") else 0.0,
            "title": (
                f"{payload.get('company', payload.get('ticker', ''))} 10-K"
                f" — {payload.get('section', '')} ({payload.get('period', '')})"
            ),
        })

    return passages
