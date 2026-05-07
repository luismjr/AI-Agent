"""
/api/analyze  — SSE streaming endpoint.

Accepts a POST with query + tickers, spins up the LangGraph pipeline
in a background task, and streams JSON events to the client.
"""

import asyncio
import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.agents.graph import run_pipeline
from app.models.schemas import AnalyzeRequest

router = APIRouter()


@router.post("/analyze")
async def analyze(request: AnalyzeRequest) -> StreamingResponse:
    event_queue: asyncio.Queue = asyncio.Queue()

    async def event_generator():
        task = asyncio.create_task(
            run_pipeline(request.query, request.companies, event_queue)
        )

        try:
            while True:
                try:
                    event = await asyncio.wait_for(event_queue.get(), timeout=120.0)
                except asyncio.TimeoutError:
                    yield "data: " + json.dumps({"type": "error", "message": "Pipeline timed out"}) + "\n\n"
                    break

                if event is None:
                    break

                yield "data: " + json.dumps(event) + "\n\n"

                if event.get("type") in ("complete", "error"):
                    break
        finally:
            task.cancel()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
