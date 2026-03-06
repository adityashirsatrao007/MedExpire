from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models
import schemas

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("/", response_model=List[schemas.AlertOut])
def get_alerts(dismissed: bool = False, db: Session = Depends(get_db)):
    return db.query(models.Alert).filter(
        models.Alert.is_dismissed == dismissed
    ).order_by(models.Alert.created_at.desc()).all()


@router.post("/dismiss/{alert_id}")
def dismiss_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not alert:
        return {"error": "Alert not found"}
    alert.is_dismissed = True
    db.commit()
    return {"message": f"Alert {alert_id} dismissed"}


@router.post("/generate")
def generate_alerts(db: Session = Depends(get_db)):
    """Scan inventory and generate alerts for expired/near-expiry items."""
    from datetime import date, timedelta
    today = date.today()
    threshold_30 = today + timedelta(days=30)

    # Find items expiring soon or already expired
    items = db.query(models.InventoryItem).filter(
        models.InventoryItem.expiry_date <= threshold_30
    ).all()

    created = 0
    for item in items:
        if item.expiry_date is None:
            continue
        days = (item.expiry_date - today).days

        # Check if alert already exists
        existing = db.query(models.Alert).filter(
            models.Alert.inventory_id == item.id,
            models.Alert.is_dismissed == False
        ).first()
        if existing:
            continue

        alert_type = "expired" if days < 0 else "near_expiry"
        severity = "critical" if days < 0 else ("high" if days <= 7 else "medium")
        msg = (
            f"{item.medicine_name} has EXPIRED (Batch: {item.batch_number or 'N/A'}). "
            f"Remove {item.quantity} units from stock immediately."
        ) if days < 0 else (
            f"{item.medicine_name} expires in {days} days (Batch: {item.batch_number or 'N/A'}). "
            f"Action required for {item.quantity} units."
        )

        alert = models.Alert(
            inventory_id=item.id,
            medicine_name=item.medicine_name,
            batch_number=item.batch_number,
            alert_type=alert_type,
            message=msg,
            days_to_expiry=days,
            quantity=item.quantity,
            severity=severity,
        )
        db.add(alert)
        created += 1

    db.commit()
    return {"message": f"Generated {created} new alerts"}


@router.delete("/clear-dismissed")
def clear_dismissed_alerts(db: Session = Depends(get_db)):
    db.query(models.Alert).filter(models.Alert.is_dismissed == True).delete()
    db.commit()
    return {"message": "Dismissed alerts cleared"}
