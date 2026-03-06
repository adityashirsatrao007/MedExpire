"""
MedExpire Backend – FastAPI Application Entry Point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import logging
import os

from database import engine
import models
from routers import medicines, inventory, ocr, alerts, predict

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Creating database tables...")
    models.Base.metadata.create_all(bind=engine)

    # Seed database if empty
    from database import SessionLocal
    db = SessionLocal()
    try:
        count = db.query(models.Medicine).count()
        if count == 0:
            logger.info("Seeding database with medicine data...")
            from data.seed_kaggle import seed_database
            seed_database()
        else:
            logger.info(f"Database already has {count} medicines.")
    finally:
        db.close()

    # Pre-warm ML model
    logger.info("Loading ML model...")
    from ml.demand_model import _load_or_train
    _load_or_train()

    yield
    # Shutdown
    logger.info("MedExpire shutting down.")


app = FastAPI(
    title="MedExpire API",
    description="AI-Based Medicine Expiry Tracking System API",
    version="1.0.0",
    lifespan=lifespan
)

# Serve static files (sample images)
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(os.path.join(STATIC_DIR, "sample_images"), exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# CORS – allow React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(medicines.router)
app.include_router(inventory.router)
app.include_router(ocr.router)
app.include_router(alerts.router)
app.include_router(predict.router)


@app.get("/")
def root():
    return {
        "message": "MedExpire API is running",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}
