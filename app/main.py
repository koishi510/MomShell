"""MomShell Recovery Coach - Main FastAPI Application (ModelScope Deploy)."""

import asyncio
import os
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.api.routes import exercises, progress, websocket
from app.core.config import get_settings
from app.core.database import init_db
from app.services.chat import router as companion_router
from app.services.community import community_router

# Import models to register them with SQLAlchemy Base
from app.services.community import models as community_models  # noqa: F401

settings = get_settings()

# Paths
BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
TEMPLATES_DIR = BASE_DIR / "templates"
# Frontend static files (built from Next.js export)
FRONTEND_DIR = Path("/app/frontend_dist")


def preload_mediapipe() -> None:
    """Preload MediaPipe to avoid blocking during WebSocket handling."""
    print("[Startup] Preloading MediaPipe...")
    try:
        from app.services.coach.pose.detector import PoseDetector

        # Create and close a detector to trigger model download and initialization
        detector = PoseDetector()
        detector.close()
        print("[Startup] MediaPipe loaded successfully")
    except Exception as e:
        print(f"[Startup] MediaPipe preload warning: {e}")


async def preload_mediapipe_background() -> None:
    """Preload MediaPipe in background to not block startup."""
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, preload_mediapipe)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager."""
    # Startup
    await init_db()
    # Start MediaPipe preloading in background (non-blocking)
    asyncio.create_task(preload_mediapipe_background())
    yield
    # Shutdown


app = FastAPI(
    title=settings.app_name,
    description="AI-powered postpartum recovery coaching application",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Backend static files (for backend-specific assets)
STATIC_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Templates
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))

# Include API routers
app.include_router(websocket.router, prefix="/api")
app.include_router(exercises.router, prefix="/api")
app.include_router(progress.router, prefix="/api")
app.include_router(companion_router, prefix="/api/v1")
app.include_router(community_router, prefix="/api/v1/community")


@app.api_route("/health", methods=["GET", "HEAD"])
async def health_check() -> dict:
    """Health check endpoint."""
    return {"status": "healthy"}


# Mount frontend static files if exists
if FRONTEND_DIR.exists():
    # Mount _next directory for Next.js static assets
    next_static = FRONTEND_DIR / "_next"
    if next_static.exists():
        app.mount("/_next", StaticFiles(directory=str(next_static)), name="next_static")

    # SPA fallback - serve frontend for all non-API routes
    @app.api_route(
        "/{full_path:path}", methods=["GET", "HEAD"], response_class=HTMLResponse
    )
    async def serve_spa(request: Request, full_path: str):
        """Serve frontend SPA for all non-API routes."""
        # Try to serve the exact file first
        file_path = FRONTEND_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)

        # Try with index.html for directory paths (Next.js trailingSlash)
        if file_path.exists() and file_path.is_dir():
            index_file = file_path / "index.html"
            if index_file.exists():
                return FileResponse(index_file)

        # Try adding .html extension
        html_file = FRONTEND_DIR / f"{full_path}.html"
        if html_file.exists():
            return FileResponse(html_file)

        # Fallback to index.html for SPA routing
        index_html = FRONTEND_DIR / "index.html"
        if index_html.exists():
            return FileResponse(index_html)

        # Final fallback to backend template
        return templates.TemplateResponse("index.html", {"request": request})
else:
    # No frontend build, serve backend template
    @app.api_route("/", methods=["GET", "HEAD"], response_class=HTMLResponse)
    async def root(request: Request) -> HTMLResponse:
        """Serve the main application page."""
        return templates.TemplateResponse("index.html", {"request": request})


if __name__ == "__main__":
    import uvicorn

    # Try to use uvloop for better async performance
    try:
        import uvloop

        uvloop.install()
        print("[Startup] uvloop installed for better async performance")
    except ImportError:
        pass

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
