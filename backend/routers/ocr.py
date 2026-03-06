from fastapi import APIRouter, UploadFile, File, Depends
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from utils.ocr_utils import extract_text_from_image, extract_medicine_info

router = APIRouter(prefix="/ocr", tags=["ocr"])


@router.post("/scan", response_model=schemas.OcrResult)
async def scan_medicine_label(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload a medicine label image.
    Uses HuggingFace microsoft/trocr-base-printed to extract text,
    then parses expiry date, medicine name, and batch number.
    """
    contents = await file.read()

    raw_text, img_confidence = extract_text_from_image(contents)

    if not raw_text:
        return schemas.OcrResult(
            raw_text="",
            success=False,
            confidence=0.0,
            message="Could not extract text from image. Please try a clearer image."
        )

    info = extract_medicine_info(raw_text)
    final_confidence = round((img_confidence + info["confidence"]) / 2, 2)

    # Log to DB
    log = models.OcrLog(
        filename=file.filename,
        raw_text=raw_text,
        extracted_medicine=info.get("medicine_name"),
        extracted_expiry=info.get("expiry_date"),
        extracted_batch=info.get("batch_number"),
        confidence=final_confidence
    )
    db.add(log)
    db.commit()

    return schemas.OcrResult(
        raw_text=raw_text,
        medicine_name=info.get("medicine_name"),
        expiry_date=info.get("expiry_date"),
        batch_number=info.get("batch_number"),
        confidence=final_confidence,
        success=True,
        message="Text extracted successfully."
    )


@router.get("/logs")
def get_ocr_logs(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    return db.query(models.OcrLog).order_by(models.OcrLog.created_at.desc()).offset(skip).limit(limit).all()
