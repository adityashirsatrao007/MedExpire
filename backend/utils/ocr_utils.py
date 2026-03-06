"""
OCR Utilities – uses HuggingFace microsoft/trocr-base-printed
to extract text from medicine label images, then applies regex
to pull out expiry date, medicine name, and batch number.
"""
import re
import logging
from typing import Tuple, Optional
from PIL import Image
import io

logger = logging.getLogger(__name__)

# --- Model Loading (cached singleton) ---
_processor = None
_model = None


def get_trocr_model():
    global _processor, _model
    if _processor is None or _model is None:
        try:
            from transformers import TrOCRProcessor, VisionEncoderDecoderModel
            logger.info("Loading TrOCR model from HuggingFace (first run may take time)...")
            _processor = TrOCRProcessor.from_pretrained("microsoft/trocr-base-printed")
            _model = VisionEncoderDecoderModel.from_pretrained("microsoft/trocr-base-printed")
            logger.info("TrOCR model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load TrOCR model: {e}")
            _processor = None
            _model = None
    return _processor, _model


def extract_text_from_image(image_bytes: bytes) -> Tuple[str, float]:
    """
    Run TrOCR inference on image bytes.
    Returns (extracted_text, confidence_score)
    """
    try:
        processor, model = get_trocr_model()
        if processor is None or model is None:
            return "", 0.0

        import torch
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # TrOCR works best on single-line text strips; split if large
        pixel_values = processor(images=image, return_tensors="pt").pixel_values

        with torch.no_grad():
            generated_ids = model.generate(
                pixel_values,
                max_new_tokens=128
            )

        extracted_text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
        confidence = 0.85  # TrOCR doesn't expose token-level confidence easily; use heuristic
        return extracted_text.strip(), confidence

    except Exception as e:
        logger.error(f"OCR inference error: {e}")
        return "", 0.0


# --- Regex Patterns ---

EXPIRY_PATTERNS = [
    r'(?:exp(?:iry)?|exp\.?|use before|best before|use by|expires?)[:\s]*(\d{1,2}[\/\-\.]\d{2,4})',
    r'(?:exp(?:iry)?|exp\.?|use before)[:\s]*([A-Za-z]{3}\.?\s*\d{2,4})',
    r'\b(\d{2})[\/\-](\d{4})\b',          # MM/YYYY
    r'\b(\d{2})[\/\-](\d{2})\b',          # MM/YY
    r'\b([A-Za-z]{3})[\/\-\s](\d{4})\b',  # MON/YYYY
    r'\b([A-Za-z]{3})[\/\-\s](\d{2})\b',  # MON/YY
]

BATCH_PATTERNS = [
    r'(?:batch|b\.?no\.?|lot)[:\s#]*([A-Z0-9\-]+)',
    r'(?:b/n|b\.n\.)[:\s]*([A-Z0-9\-]+)',
]

MEDICINE_NAME_PATTERNS = [
    r'^([A-Za-z\s\-]+(?:\d+\s?mg|\d+\s?ml|\d+\s?mcg)?)',
]


def parse_expiry_date(text: str) -> Optional[str]:
    for pattern in EXPIRY_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(0).strip()
    return None


def parse_batch_number(text: str) -> Optional[str]:
    for pattern in BATCH_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    return None


def parse_medicine_name(text: str) -> Optional[str]:
    lines = text.strip().split('\n')
    if lines:
        first_line = lines[0].strip()
        if len(first_line) > 2:
            return first_line
    return None


def extract_medicine_info(raw_text: str) -> dict:
    """
    Parse raw OCR text into structured medicine information.
    """
    expiry = parse_expiry_date(raw_text)
    batch = parse_batch_number(raw_text)
    name = parse_medicine_name(raw_text)

    # confidence heuristic based on how much we found
    found = sum([expiry is not None, batch is not None, name is not None])
    confidence = round(found / 3.0, 2)

    return {
        "medicine_name": name,
        "expiry_date": expiry,
        "batch_number": batch,
        "confidence": confidence,
    }
