from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import analyze, companies

app = FastAPI(
    title="FinSight API",
    description="Multi-agent financial research powered by SEC EDGAR, RAG, and Claude",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router, prefix="/api", tags=["analysis"])
app.include_router(companies.router, prefix="/api", tags=["companies"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "FinSight"}
