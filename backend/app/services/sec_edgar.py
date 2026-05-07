"""
SEC EDGAR API client.

Uses public EDGAR REST endpoints (no API key required).
Fetches the most recent 10-K filing for a given ticker and extracts
key narrative sections: MD&A, Risk Factors, and Business Overview.
"""

import re
import warnings
import httpx
from bs4 import BeautifulSoup, XMLParsedAsHTMLWarning

warnings.filterwarnings("ignore", category=XMLParsedAsHTMLWarning)

from app.config import settings
from app.models.schemas import FilingChunk

EDGAR_BASE = "https://data.sec.gov"
EDGAR_ARCHIVE = "https://www.sec.gov/Archives/edgar/data"
TICKERS_URL = "https://www.sec.gov/files/company_tickers.json"

_TICKER_CIK_CACHE: dict[str, str] = {}

SECTION_PATTERNS = {
    "MD&A": [
        r"item\s*7[^a-z]*management.{0,40}discussion",
        r"management.{0,20}discussion.{0,20}analysis",
    ],
    "Risk Factors": [
        r"item\s*1a[^a-z]*risk\s*factor",
        r"risk\s*factors",
    ],
    "Business": [
        r"item\s*1[^a-z]*business",
    ],
    "Financial Highlights": [
        r"item\s*8[^a-z]*financial\s*statement",
        r"selected\s*financial\s*data",
    ],
}

HEADERS = {
    "User-Agent": settings.edgar_user_agent,
    "Accept-Encoding": "gzip, deflate",
    "Host": "data.sec.gov",
}


async def _load_ticker_map() -> None:
    if _TICKER_CIK_CACHE:
        return
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            TICKERS_URL,
            headers={"User-Agent": settings.edgar_user_agent},
        )
        resp.raise_for_status()
        data = resp.json()
    for entry in data.values():
        _TICKER_CIK_CACHE[entry["ticker"].upper()] = str(entry["cik_str"])


async def _get_cik(ticker: str) -> str:
    await _load_ticker_map()
    cik = _TICKER_CIK_CACHE.get(ticker.upper())
    if not cik:
        raise ValueError(f"CIK not found for ticker: {ticker}")
    return cik.zfill(10)


async def _get_latest_10k_accession(cik: str) -> tuple[str, str]:
    """Return (accession_number_dashes, primary_doc_filename)."""
    url = f"{EDGAR_BASE}/submissions/CIK{cik}.json"
    async with httpx.AsyncClient(timeout=30, headers=HEADERS) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()

    filings = data["filings"]["recent"]
    forms = filings["form"]
    accessions = filings["accessionNumber"]
    docs = filings["primaryDocument"]
    periods = filings["reportDate"]

    for i, form in enumerate(forms):
        if form == "10-K":
            acc = accessions[i]
            return acc, docs[i], periods[i]

    raise ValueError(f"No 10-K found for CIK {cik}")


async def _fetch_filing_html(cik: str, accession_dashes: str, primary_doc: str) -> str:
    acc_nodash = accession_dashes.replace("-", "")
    url = f"{EDGAR_ARCHIVE}/{int(cik)}/{acc_nodash}/{primary_doc}"
    async with httpx.AsyncClient(
        timeout=60,
        headers={"User-Agent": settings.edgar_user_agent},
        follow_redirects=True,
    ) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.text


def _clean_text(text: str) -> str:
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"[^\x20-\x7E\n]", "", text)
    return text.strip()


def _extract_sections(html: str) -> dict[str, str]:
    soup = BeautifulSoup(html, "lxml")

    for tag in soup(["script", "style", "meta", "head"]):
        tag.decompose()

    full_text = soup.get_text(separator="\n")
    full_text_lower = full_text.lower()

    extracted: dict[str, str] = {}

    for section_name, patterns in SECTION_PATTERNS.items():
        for pattern in patterns:
            matches = list(re.finditer(pattern, full_text_lower))
            if matches:
                start = matches[0].start()
                end = min(start + 12000, len(full_text))
                raw = full_text[start:end]
                extracted[section_name] = _clean_text(raw)
                break

    if not extracted:
        extracted["Full Text"] = _clean_text(full_text[:20000])

    return extracted


def _chunk_section(text: str, chunk_size: int = 1200, overlap: int = 150) -> list[str]:
    words = text.split()
    chunks, start = [], 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunks.append(" ".join(words[start:end]))
        start += chunk_size - overlap
    return chunks


async def fetch_filings_for_ticker(ticker: str) -> list[FilingChunk]:
    ticker = ticker.upper().strip()
    cik = await _get_cik(ticker)
    accession, primary_doc, period = await _get_latest_10k_accession(cik)

    company_name = ticker
    try:
        url = f"{EDGAR_BASE}/submissions/CIK{cik}.json"
        async with httpx.AsyncClient(timeout=15, headers=HEADERS) as client:
            resp = await client.get(url)
            data = resp.json()
            company_name = data.get("name", ticker)
    except Exception:
        pass

    html = await _fetch_filing_html(cik, accession, primary_doc)
    sections = _extract_sections(html)

    chunks: list[FilingChunk] = []
    chunk_idx = 0

    for section_name, section_text in sections.items():
        for chunk_text in _chunk_section(section_text):
            if len(chunk_text.split()) < 30:
                continue
            chunks.append(
                FilingChunk(
                    text=chunk_text,
                    company=company_name,
                    ticker=ticker,
                    filing_type="10-K",
                    section=section_name,
                    period=period,
                    chunk_index=chunk_idx,
                )
            )
            chunk_idx += 1
            if chunk_idx >= settings.max_filing_chunks:
                break
        if chunk_idx >= settings.max_filing_chunks:
            break

    return chunks
