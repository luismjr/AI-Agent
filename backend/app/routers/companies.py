"""
/api/companies — quick ticker validation + preview endpoint.
"""

from fastapi import APIRouter, HTTPException

from app.services.market_data import fetch_market_snapshot

router = APIRouter()


@router.get("/companies/{ticker}")
async def get_company_preview(ticker: str):
    try:
        snap = await fetch_market_snapshot(ticker.upper())
        return snap.model_dump()
    except Exception as exc:
        raise HTTPException(status_code=404, detail=str(exc))
