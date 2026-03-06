from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime, timedelta
from database import get_db
import models
import schemas

router = APIRouter(prefix="/inventory", tags=["inventory"])


def compute_status(expiry_date: Optional[date], quantity: int) -> tuple:
    if expiry_date is None:
        return "active", None
    today = date.today()
    days = (expiry_date - today).days
    if days < 0:
        status = "expired"
    elif days <= 30:
        status = "near_expiry"
    elif days <= 90:
        status = "expiring_soon"
    elif quantity <= 10:
        status = "low_stock"
    else:
        status = "active"
    return status, days


@router.get("/", response_model=List[schemas.InventoryItemOut])
def get_inventory(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 300,
    db: Session = Depends(get_db)
):
    query = db.query(models.InventoryItem)
    if status:
        query = query.filter(models.InventoryItem.status == status)
    items = query.offset(skip).limit(limit).all()
    # Refresh days_to_expiry dynamically
    today = date.today()
    for item in items:
        if item.expiry_date:
            item.days_to_expiry = (item.expiry_date - today).days
    return items


@router.get("/expiring-soon", response_model=List[schemas.InventoryItemOut])
def get_expiring_soon(days: int = 30, db: Session = Depends(get_db)):
    threshold = date.today() + timedelta(days=days)
    today = date.today()
    items = db.query(models.InventoryItem).filter(
        models.InventoryItem.expiry_date <= threshold,
        models.InventoryItem.expiry_date >= today
    ).all()
    for item in items:
        item.days_to_expiry = (item.expiry_date - today).days
    return items


@router.get("/stats")
def get_inventory_stats(db: Session = Depends(get_db)):
    today = date.today()
    threshold_30 = today + timedelta(days=30)
    threshold_90 = today + timedelta(days=90)

    total = db.query(models.InventoryItem).count()
    expired = db.query(models.InventoryItem).filter(
        models.InventoryItem.expiry_date < today
    ).count()
    exp_30 = db.query(models.InventoryItem).filter(
        models.InventoryItem.expiry_date <= threshold_30,
        models.InventoryItem.expiry_date >= today
    ).count()
    exp_90 = db.query(models.InventoryItem).filter(
        models.InventoryItem.expiry_date <= threshold_90,
        models.InventoryItem.expiry_date >= today
    ).count()
    total_meds = db.query(models.Medicine).count()
    total_alerts = db.query(models.Alert).filter(models.Alert.is_dismissed == False).count()

    items = db.query(models.InventoryItem).all()
    avg_risk = sum(i.waste_risk_score or 0 for i in items) / max(len(items), 1)

    return {
        "total_medicines": total_meds,
        "total_inventory_items": total,
        "expired_count": expired,
        "expiring_30_days": exp_30,
        "expiring_90_days": exp_90,
        "total_alerts": total_alerts,
        "avg_waste_risk": round(avg_risk, 3)
    }


@router.get("/{item_id}", response_model=schemas.InventoryItemOut)
def get_inventory_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return item


@router.post("/", response_model=schemas.InventoryItemOut, status_code=201)
def add_inventory_item(item: schemas.InventoryItemCreate, db: Session = Depends(get_db)):
    status, days = compute_status(item.expiry_date, item.quantity)

    db_item = models.InventoryItem(
        **item.dict(),
        status=status,
        days_to_expiry=days
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)

    # Auto-create alert for near-expiry / expired
    if status in ("expired", "near_expiry") and days is not None:
        severity = "critical" if days < 0 else ("high" if days <= 7 else "medium")
        alert = models.Alert(
            inventory_id=db_item.id,
            medicine_name=item.medicine_name,
            batch_number=item.batch_number,
            alert_type=status,
            message=f"{item.medicine_name} {'has expired' if days < 0 else f'expires in {days} days'}. Stock: {item.quantity} units.",
            days_to_expiry=days,
            quantity=item.quantity,
            severity=severity,
        )
        db.add(alert)
        db.commit()

    return db_item


@router.put("/{item_id}", response_model=schemas.InventoryItemOut)
def update_inventory_item(item_id: int, item: schemas.InventoryItemCreate, db: Session = Depends(get_db)):
    db_item = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    status, days = compute_status(item.expiry_date, item.quantity)
    for key, val in item.dict().items():
        setattr(db_item, key, val)
    db_item.status = status
    db_item.days_to_expiry = days
    db.commit()
    db.refresh(db_item)
    return db_item


@router.delete("/{item_id}")
def delete_inventory_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()
    return {"message": "Inventory item deleted"}
