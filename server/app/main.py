from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_router

app = FastAPI(
    title="Strokecovery API",
    description="Backend API for Strokecovery - Stroke Recovery Companion App",
    version="0.1.0",
)

# Allow mobile app to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api")


@app.get("/")
def root():
    """Health check endpoint."""
    return {"status": "ok", "message": "Strokecovery API is running"}


@app.get("/api/health")
def health_check():
    """Detailed health check."""
    return {
        "status": "healthy",
        "version": "0.1.0",
        "service": "strokecovery-api",
    }
