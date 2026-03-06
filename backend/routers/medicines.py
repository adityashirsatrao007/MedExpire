from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models
import schemas

router = APIRouter(prefix="/medicines", tags=["medicines"])


@router.get("/", response_model=List[schemas.MedicineOut])
def get_all_medicines(skip: int = 0, limit: int = 200, db: Session = Depends(get_db)):
    return db.query(models.Medicine).offset(skip).limit(limit).all()


@router.get("/{medicine_id}", response_model=schemas.MedicineOut)
def get_medicine(medicine_id: int, db: Session = Depends(get_db)):
    med = db.query(models.Medicine).filter(models.Medicine.id == medicine_id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return med


@router.post("/", response_model=schemas.MedicineOut, status_code=201)
def create_medicine(medicine: schemas.MedicineCreate, db: Session = Depends(get_db)):
    db_med = models.Medicine(**medicine.dict())
    db.add(db_med)
    db.commit()
    db.refresh(db_med)
    return db_med


@router.delete("/{medicine_id}")
def delete_medicine(medicine_id: int, db: Session = Depends(get_db)):
    med = db.query(models.Medicine).filter(models.Medicine.id == medicine_id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medicine not found")
    db.delete(med)
    db.commit()
    return {"message": "Medicine deleted successfully"}


@router.get("/search/{query}", response_model=List[schemas.MedicineOut])
def search_medicines(query: str, db: Session = Depends(get_db)):
    return db.query(models.Medicine).filter(
        models.Medicine.name.ilike(f"%{query}%")
    ).limit(50).all()
