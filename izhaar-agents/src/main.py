import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from src.api.routes import router
from src.storage.db import init_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"

app = FastAPI(title="Izhaar Agent Layer", version="0.1.0")
app.include_router(router, prefix="/api/v1")

if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.on_event("startup")
async def _startup() -> None:
    init_db()


@app.get("/healthz")
def healthz() -> dict:
    return {"status": "ok", "service": "izhaar-agents"}


@app.get("/", include_in_schema=False)
def ui() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")
