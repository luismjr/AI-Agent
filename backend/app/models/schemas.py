from pydantic import BaseModel, Field
from typing import Any


class AnalyzeRequest(BaseModel):
    query: str = Field(..., description="Research question about the company/companies")
    companies: list[str] = Field(..., description="List of ticker symbols e.g. ['AAPL', 'MSFT']")


class Citation(BaseModel):
    cited_text: str
    document_title: str
    document_index: int


class MarketSnapshot(BaseModel):
    ticker: str
    company_name: str
    current_price: float | None = None
    change_pct: float | None = None
    market_cap: str | None = None
    pe_ratio: float | None = None
    week_52_high: float | None = None
    week_52_low: float | None = None
    volume: str | None = None
    price_history: list[dict[str, Any]] = Field(default_factory=list)


class FilingChunk(BaseModel):
    text: str
    company: str
    ticker: str
    filing_type: str
    section: str
    period: str
    chunk_index: int


class AgentState(BaseModel):
    query: str
    companies: list[str]
    filing_chunks: list[FilingChunk] = Field(default_factory=list)
    market_snapshots: list[MarketSnapshot] = Field(default_factory=list)
    retrieved_passages: list[dict[str, Any]] = Field(default_factory=list)
    analysis: str = ""
    citations: list[Citation] = Field(default_factory=list)
