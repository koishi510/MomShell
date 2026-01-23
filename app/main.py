"""MomShell Recovery Coach - Main FastAPI Application."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.api.routes import exercises, progress, websocket
from app.core.config import get_settings
from app.core.database import init_db

settings = get_settings()

# Paths
BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
TEMPLATES_DIR = BASE_DIR / "templates"


def preload_mediapipe() -> None:
    """Preload MediaPipe to avoid blocking during WebSocket handling."""
    print("[Startup] Preloading MediaPipe...")
    try:
        from app.recovery_coach.pose.detector import PoseDetector

        # Create and close a detector to trigger model download and initialization
        detector = PoseDetector()
        detector.close()
        print("[Startup] MediaPipe loaded successfully")
    except Exception as e:
        print(f"[Startup] MediaPipe preload warning: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager."""
    # Startup
    await init_db()
    preload_mediapipe()
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
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files
STATIC_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Templates
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))

# Include routers
app.include_router(websocket.router, prefix="/api")
app.include_router(exercises.router, prefix="/api")
app.include_router(progress.router, prefix="/api")


@app.get("/", response_class=HTMLResponse)
async def root(request: Request) -> HTMLResponse:
    """Serve the main application page."""
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/health")
async def health_check() -> dict:
    """Health check endpoint."""
    return {"status": "healthy"}
