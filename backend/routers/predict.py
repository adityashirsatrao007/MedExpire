from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models
import schemas
import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from ml.demand_model import predict_waste_risk

router = APIRouter(prefix="/predict", tags=["predictions"])


@router.get("/waste-risk", response_model=List[schemas.PredictionItem])
def get_waste_risk_predictions(db: Session = Depends(get_db)):
    """
    Returns prediction of which medicines are at risk of expiring before being sold.
    """
    from datetime import date
    today = date.today()

    items = db.query(models.InventoryItem).all()
    results = []

    for item in items:
        days = (item.expiry_date - today).days if item.expiry_date else 999
        score = predict_waste_risk(
            days_to_expiry=days,
            quantity=item.quantity,
            unit_price=item.unit_price or 0
        )
        risk_level = "high" if score > 0.7 else ("medium" if score > 0.4 else "low")

        # Update score in DB
        item.waste_risk_score = score
        db.commit()

        results.append(schemas.PredictionItem(
            inventory_id=item.id,
            medicine_name=item.medicine_name,
            batch_number=item.batch_number,
            expiry_date=str(item.expiry_date) if item.expiry_date else None,
            quantity=item.quantity,
            days_to_expiry=days if days != 999 else None,
            waste_risk_score=score,
            risk_level=risk_level,
        ))

    results.sort(key=lambda x: x.waste_risk_score, reverse=True)
    return results
