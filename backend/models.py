from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, Date
from sqlalchemy.sql import func
from database import Base
from datetime import date


class Medicine(Base):
    __tablename__ = "medicines"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    manufacturer = Column(String(255))
    category = Column(String(100))
    composition = Column(Text)
    unit = Column(String(50), default="tablet")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class InventoryItem(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    medicine_id = Column(Integer, nullable=False)
    medicine_name = Column(String(255), nullable=False)
    batch_number = Column(String(100))
    quantity = Column(Integer, default=0)
    unit_price = Column(Float, default=0.0)
    expiry_date = Column(Date, nullable=True)
    manufacture_date = Column(Date, nullable=True)
    location = Column(String(100), default="Main Shelf")
    supplier = Column(String(255))
    status = Column(String(50), default="active")  # active, expired, low_stock, near_expiry
    days_to_expiry = Column(Integer, nullable=True)
    waste_risk_score = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    inventory_id = Column(Integer, nullable=False)
    medicine_name = Column(String(255), nullable=False)
    batch_number = Column(String(100))
    alert_type = Column(String(50))  # near_expiry, expired, low_stock, waste_risk
    message = Column(Text)
    days_to_expiry = Column(Integer, nullable=True)
    quantity = Column(Integer, default=0)
    severity = Column(String(20), default="medium")  # low, medium, high, critical
    is_dismissed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class OcrLog(Base):
    __tablename__ = "ocr_logs"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255))
    raw_text = Column(Text)
    extracted_medicine = Column(String(255))
    extracted_expiry = Column(String(50))
    extracted_batch = Column(String(100))
    confidence = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
