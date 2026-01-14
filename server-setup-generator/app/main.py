"""
Server Setup Generator - Main Application
FastAPI application for generating bash scripts to setup Linux servers.
"""
import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse

from models import db
from routes import api_router, SCRIPTS_DIR

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Read version from VERSION file
def get_version():
    """Read version from VERSION file"""
    version_file = os.path.join(os.path.dirname(__file__), '..', 'VERSION')
    try:
        with open(version_file, 'r') as f:
            return f.read().strip()
    except FileNotFoundError:
        return "1.0.0"

VERSION = get_version()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for startup and shutdown"""
    # Startup
    logger.info("Starting Server Setup Generator...")

    # Initialize database
    logger.info("Initializing database...")
    db.create_tables()
    db.init_default_modules()
    logger.info("Database initialized")

    # Ensure scripts directory exists
    os.makedirs(SCRIPTS_DIR, exist_ok=True)
    logger.info(f"Scripts directory: {SCRIPTS_DIR}")

    logger.info("Application started successfully")

    yield

    # Shutdown
    logger.info("Shutting down Server Setup Generator...")


# Create FastAPI app
app = FastAPI(
    title="Server Setup Generator",
    description="Generate bash scripts for Linux server setup",
    version=VERSION,
    lifespan=lifespan
)

# Mount static files
app.mount("/static", StaticFiles(directory="/app/static"), name="static")
app.mount("/scripts", StaticFiles(directory=SCRIPTS_DIR), name="scripts")

# Setup templates
templates = Jinja2Templates(directory="/app/templates")

# Include API router
app.include_router(api_router)


# ============================================================================
# Web Interface Routes
# ============================================================================

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """Main page"""
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/admin", response_class=HTMLResponse)
async def admin(request: Request):
    """Admin page for module management"""
    return templates.TemplateResponse("admin.html", {"request": request})


@app.get("/history", response_class=HTMLResponse)
async def history(request: Request):
    """History page for viewing past configurations"""
    return templates.TemplateResponse("history.html", {"request": request})


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "version": VERSION}


@app.get("/version")
async def version():
    """Get application version"""
    return {"version": VERSION}


# ============================================================================
# Error Handlers
# ============================================================================

@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    """Handle 404 errors"""
    return templates.TemplateResponse(
        "error.html",
        {"request": request, "error": "Page not found", "code": 404},
        status_code=404
    )


@app.exception_handler(500)
async def server_error_handler(request: Request, exc):
    """Handle 500 errors"""
    logger.error(f"Server error: {exc}")
    return templates.TemplateResponse(
        "error.html",
        {"request": request, "error": "Internal server error", "code": 500},
        status_code=500
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8080,
        reload=False,
        log_level="info"
    )
