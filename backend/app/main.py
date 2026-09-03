"""CreditSense — Mamdani fuzzy credit scoring API."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import router
from .fuzzy.rules import ENGINE_VERSION

app = FastAPI(
    title="CreditSense API",
    version=ENGINE_VERSION,
    description=(
        "Mamdani fuzzy inference over income, repayment history and "
        "debt-to-income. Interactive docs at /docs."
    ),
)

# The frontend normally reaches this through the Vite dev proxy, which makes the
# request same-origin. These origins cover hitting :8000 directly.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


@app.get("/api/health", tags=["meta"], summary="Liveness probe")
def health() -> dict:
    return {"status": "ok", "engine": ENGINE_VERSION}
