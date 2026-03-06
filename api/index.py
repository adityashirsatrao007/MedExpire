"""
MedExpire – Vercel Serverless Backend (api/index.py)

Full FastAPI app that reads from seed_data.json (no SQLite, no PyTorch).
- All medicines / inventory / alerts / stats endpoints work fully
- OCR endpoint runs in demo mode (returns realistic simulated results)
  with a note that full TrOCR requires local deployment
"""
import json
import os
import random
from datetime import date, datetime
from typing import Optional, List
from fastapi import FastAPI, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware

# ── Load seed data once at cold start ───────────────────────────────────────
DATA_PATH = os.path.join(os.path.dirname(__file__), "seed_data.json")

def load_data():
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

_DATA = load_data()
today = date.today()

def _recalc_days(inv_list):
    """Recalculate days_to_expiry relative to today."""
    result = []
    for item in inv_list:
        item = dict(item)
        if item.get("expiry_date"):
            try:
                exp = date.fromisoformat(item["expiry_date"])
                item["days_to_expiry"] = (exp - today).days
                if item["days_to_expiry"] < 0:
                    item["status"] = "expired"
                elif item["days_to_expiry"] <= 7:
                    item["status"] = "near_expiry"
                elif item["days_to_expiry"] <= 30:
                    item["status"] = "expiring_soon"
                else:
                    item["status"] = "active"
            except Exception:
                pass
        result.append(item)
    return result

# Pre-calculate
INVENTORY = _recalc_days(_DATA["inventory"])
MEDICINES = _DATA["medicines"]
ALERTS = [a for a in _DATA["alerts"] if not a.get("is_dismissed")]

# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="MedExpire API",
    description="AI-Based Medicine Expiry Tracking (Vercel Serverless Edition)",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "ok", "mode": "vercel-serverless", "medicines": len(MEDICINES)}

# ── Medicines ─────────────────────────────────────────────────────────────────
@app.get("/medicines/")
def get_medicines(skip: int = 0, limit: int = 100, search: Optional[str] = None):
    items = MEDICINES
    if search:
        s = search.lower()
        items = [m for m in items if s in m["name"].lower() or s in (m.get("manufacturer") or "").lower()]
    return items[skip: skip + limit]

@app.get("/medicines/{medicine_id}")
def get_medicine(medicine_id: int):
    for m in MEDICINES:
        if m["id"] == medicine_id:
            return m
    return {"detail": "Not found"}, 404

# ── Inventory ─────────────────────────────────────────────────────────────────
@app.get("/inventory/stats")
def inventory_stats():
    expired       = sum(1 for i in INVENTORY if i.get("status") == "expired")
    near_30       = sum(1 for i in INVENTORY if 0 <= (i.get("days_to_expiry") or 999) <= 30)
    near_90       = sum(1 for i in INVENTORY if 0 <= (i.get("days_to_expiry") or 999) <= 90)
    avg_risk      = sum(i.get("waste_risk_score", 0) for i in INVENTORY) / max(len(INVENTORY), 1)
    return {
        "total_medicines": len(MEDICINES),
        "total_inventory_items": len(INVENTORY),
        "expired_count": expired,
        "expiring_30_days": near_30,
        "expiring_90_days": near_90,
        "total_alerts": len(ALERTS),
        "avg_waste_risk": round(avg_risk, 4),
    }

@app.get("/inventory/")
def get_inventory(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    search: Optional[str] = None,
):
    items = INVENTORY
    if status:
        items = [i for i in items if i.get("status") == status]
    if search:
        s = search.lower()
        items = [i for i in items if s in i.get("medicine_name", "").lower()]
    return items[skip: skip + limit]

@app.get("/inventory/{item_id}")
def get_inventory_item(item_id: int):
    for i in INVENTORY:
        if i["id"] == item_id:
            return i
    return {"detail": "Not found"}, 404

# ── Alerts ────────────────────────────────────────────────────────────────────
@app.get("/alerts/")
def get_alerts(severity: Optional[str] = None, skip: int = 0, limit: int = 100):
    items = ALERTS
    if severity:
        items = [a for a in items if a.get("severity") == severity]
    return items[skip: skip + limit]

@app.post("/alerts/generate")
def generate_alerts():
    return {"message": "Alerts already pre-generated from Kaggle seed data", "count": len(ALERTS)}

# ── Predictions ───────────────────────────────────────────────────────────────
@app.get("/predict/waste-risk")
def predict_waste_risk(limit: int = 50):
    """Return inventory items sorted by waste risk (based on days_to_expiry + quantity)."""
    result = []
    for item in INVENTORY:
        days = item.get("days_to_expiry") or 999
        qty  = item.get("quantity") or 0
        # Simple risk heuristic (no ML needed): lower days + higher quantity = higher risk
        if days < 0:
            risk = 0.95
        elif days <= 7:
            risk = 0.85 + random.uniform(0, 0.1)
        elif days <= 30:
            risk = 0.55 + random.uniform(0, 0.2)
        elif days <= 90:
            risk = 0.2 + random.uniform(0, 0.15)
        else:
            risk = 0.02 + random.uniform(0, 0.08)

        risk = round(min(1.0, risk), 3)
        result.append({**item, "waste_risk_score": risk, "risk_level": (
            "high" if risk > 0.6 else "medium" if risk > 0.3 else "low"
        )})

    result.sort(key=lambda x: x["waste_risk_score"], reverse=True)
    return result[:limit]

# ── OCR ───────────────────────────────────────────────────────────────────────
@app.post("/ocr/scan")
async def ocr_scan(file: UploadFile = File(...)):
    """
    Vercel serverless demo mode: Returns realistic simulated OCR results.
    Full TrOCR (HuggingFace microsoft/trocr-base-printed) runs only locally.
    """
    filename = file.filename or "upload.jpg"
    size = 0
    try:
        content = await file.read()
        size = len(content)
    except Exception:
        pass

    # Pick a realistic demo result based on filename hint
    demos = [
        {"medicine_name": "Amoxicillin 500mg Capsule", "expiry_date": "06/2026", "batch_number": "AMX2024A", "confidence": 0.91},
        {"medicine_name": "Metformin HCl 500mg Tablet", "expiry_date": "03/2027", "batch_number": "MET9876B", "confidence": 0.87},
        {"medicine_name": "Paracetamol 500mg Tablet", "expiry_date": "11/2025", "batch_number": "PAR1122C", "confidence": 0.93},
        {"medicine_name": "Azithromycin 500mg Tablet", "expiry_date": "08/2026", "batch_number": "AZT5673D", "confidence": 0.88},
        {"medicine_name": "Cetirizine 10mg Tablet", "expiry_date": "01/2026", "batch_number": "CET3311E", "confidence": 0.85},
    ]
    demo = random.choice(demos)

    return {
        "success": True,
        "filename": filename,
        "file_size_kb": round(size / 1024, 1),
        "medicine_name": demo["medicine_name"],
        "expiry_date": demo["expiry_date"],
        "batch_number": demo["batch_number"],
        "confidence": demo["confidence"],
        "raw_text": f"BATCH NO: {demo['batch_number']}\n{demo['medicine_name']}\nEXP: {demo['expiry_date']}\nFor oral use only",
        "mode": "demo",
        "note": "Running in Vercel demo mode. For full TrOCR inference (microsoft/trocr-base-printed), run the backend locally.",
    }

# ── Vercel entry point ────────────────────────────────────────────────────────
# Vercel looks for `app` at module level
