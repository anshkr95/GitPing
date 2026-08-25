"""
GitPing - FastAPI application entry point
"""

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path

import app.api.routes_repos as repos
import app.api.routes_subscriptions as subscriptions
import app.api.routes_issues as issues
import app.api.routes_notifications as notifications
import app.api.routes_settings as settings
import app.api.routes_monitor as monitor
import app.api.routes_webhooks as webhooks

app = FastAPI(title="GitPing", description="GitHub Issue Monitoring Dashboard")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(repos.router)
app.include_router(subscriptions.router)
app.include_router(issues.router)
app.include_router(notifications.router)
app.include_router(settings.router)
app.include_router(monitor.router)
app.include_router(webhooks.router)

BASE_DIR = Path(__file__).parent
STATIC_DIR = BASE_DIR / "static"
TEMPLATES_DIR = BASE_DIR / "templates"

STATIC_DIR.mkdir(parents=True, exist_ok=True)
(STATIC_DIR / "css").mkdir(parents=True, exist_ok=True)
(STATIC_DIR / "js").mkdir(parents=True, exist_ok=True)
TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/", response_class=HTMLResponse)
async def index():
    """Serve the dashboard."""
    index_file = TEMPLATES_DIR / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return HTMLResponse("<h1>GitPing</h1><p>Frontend files not found. Check app/templates/index.html</p>")


@app.get("/health")
async def health():
    return {"status": "ok", "app": "GitPing"}


if __name__ == "__main__":
    import uvicorn
    from app.config import get_settings
    cfg = get_settings()
    uvicorn.run("app.main:app", host=cfg.host, port=cfg.port, reload=True)
