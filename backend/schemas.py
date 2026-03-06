from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime


class MedicineBase(BaseModel):
    name: str
    manufacturer: Optional[str] = None
    category: Optional[str] = None
    composition: Optional[str] = None
    unit: Optional[str] = "tablet"


class MedicineCreate(MedicineBase):
    pass


class MedicineOut(MedicineBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InventoryItemBase(BaseModel):
    medicine_name: str
    batch_number: Optional[str] = None
    quantity: int = 0
    unit_price: Optional[float] = 0.0
    expiry_date: Optional[date] = None
    manufacture_date: Optional[date] = None
    location: Optional[str] = "Main Shelf"
    supplier: Optional[str] = None


class InventoryItemCreate(InventoryItemBase):
    medicine_id: Optional[int] = None


class InventoryItemOut(InventoryItemBase):
    id: int
    medicine_id: Optional[int] = None
    status: Optional[str] = "active"
    days_to_expiry: Optional[int] = None
    waste_risk_score: Optional[float] = 0.0
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AlertOut(BaseModel):
    id: int
    inventory_id: int
    medicine_name: str
    batch_number: Optional[str] = None
    alert_type: str
    message: str
    days_to_expiry: Optional[int] = None
    quantity: int
    severity: str
    is_dismissed: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class OcrResult(BaseModel):
    raw_text: str
    medicine_name: Optional[str] = None
    expiry_date: Optional[str] = None
    batch_number: Optional[str] = None
    confidence: float = 0.0
    success: bool = True
    message: Optional[str] = None


class PredictionItem(BaseModel):
    inventory_id: int
    medicine_name: str
    batch_number: Optional[str] = None
    expiry_date: Optional[str] = None
    quantity: int
    days_to_expiry: Optional[int] = None
    waste_risk_score: float
    risk_level: str  # low, medium, high


class DashboardStats(BaseModel):
    total_medicines: int
    total_inventory_items: int
    expired_count: int
    expiring_30_days: int
    expiring_90_days: int
    total_alerts: int
    avg_waste_risk: float
