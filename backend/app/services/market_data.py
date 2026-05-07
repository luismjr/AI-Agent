"""
Market data service using yfinance.

Fetches current price snapshot, key ratios, and 1-year price history
for display in the frontend charts.
"""

import yfinance as yf

from app.models.schemas import MarketSnapshot


def _fmt_large_number(n: float | None) -> str | None:
    if n is None:
        return None
    if n >= 1e12:
        return f"${n/1e12:.2f}T"
    if n >= 1e9:
        return f"${n/1e9:.2f}B"
    if n >= 1e6:
        return f"${n/1e6:.2f}M"
    return f"${n:,.0f}"


def _fmt_volume(n: float | None) -> str | None:
    if n is None:
        return None
    if n >= 1e9:
        return f"{n/1e9:.2f}B"
    if n >= 1e6:
        return f"{n/1e6:.2f}M"
    if n >= 1e3:
        return f"{n/1e3:.2f}K"
    return str(int(n))


async def fetch_market_snapshot(ticker: str) -> MarketSnapshot:
    t = yf.Ticker(ticker.upper())
    info = t.info or {}

    current_price = info.get("currentPrice") or info.get("regularMarketPrice")
    prev_close = info.get("previousClose") or info.get("regularMarketPreviousClose")

    change_pct: float | None = None
    if current_price and prev_close and prev_close != 0:
        change_pct = round(((current_price - prev_close) / prev_close) * 100, 2)

    hist = t.history(period="1y")
    price_history: list[dict] = []
    if not hist.empty:
        for dt, row in hist.iterrows():
            price_history.append({
                "date": dt.strftime("%Y-%m-%d"),
                "close": round(float(row["Close"]), 2),
                "volume": int(row["Volume"]),
            })

    return MarketSnapshot(
        ticker=ticker.upper(),
        company_name=info.get("longName") or info.get("shortName") or ticker.upper(),
        current_price=round(current_price, 2) if current_price else None,
        change_pct=change_pct,
        market_cap=_fmt_large_number(info.get("marketCap")),
        pe_ratio=round(info.get("trailingPE"), 2) if info.get("trailingPE") else None,
        week_52_high=info.get("fiftyTwoWeekHigh"),
        week_52_low=info.get("fiftyTwoWeekLow"),
        volume=_fmt_volume(info.get("regularMarketVolume") or info.get("volume")),
        price_history=price_history,
    )
