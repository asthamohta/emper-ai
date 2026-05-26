import logging

from fastapi import FastAPI

from src.api.routes import router
from src.storage.db import init_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

app = FastAPI(title="Izhaar Agent Layer", version="0.1.0")
app.include_router(router, prefix="/api/v1")


@app.on_event("startup")
async def _startup() -> None:
    init_db()


@app.get("/")
def root() -> dict:
    return {"status": "ok", "service": "izhaar-agents"}
