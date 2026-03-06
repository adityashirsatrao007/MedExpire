"""
Download real medicine label images from public internet sources
for demonstrating OCR / TrOCR expiry date extraction.

Sources:
- Wikimedia Commons (public domain medicine photos)
- Open pharma image collections
- GitHub public medicine OCR test images
"""
import os
import requests

DEST = os.path.join(os.path.dirname(__file__), '..', 'static', 'sample_images')
os.makedirs(DEST, exist_ok=True)

# Real medicine label / pharmaceutical packaging images from public sources
IMAGES = [
    {
        "name": "paracetamol_strip.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Paracetamol_tablets.jpg/640px-Paracetamol_tablets.jpg",
        "desc": "Paracetamol 500mg tablet strip (Wikimedia Commons)"
    },
    {
        "name": "amoxicillin_capsules.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Amoxicillin_500mg_Capsules.jpg/640px-Amoxicillin_500mg_Capsules.jpg",
        "desc": "Amoxicillin 500mg capsules blister pack"
    },
    {
        "name": "medicine_label_printed.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Metformin_500mg.jpg/640px-Metformin_500mg.jpg",
        "desc": "Metformin 500mg tablet label"
    },
    {
        "name": "ibuprofen_packaging.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Ibuprofen_200mg_Tablets.jpg/640px-Ibuprofen_200mg_Tablets.jpg",
        "desc": "Ibuprofen 200mg packaging"
    },
    {
        "name": "aspirin_box.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Aspirin-Bayer.jpg/640px-Aspirin-Bayer.jpg",
        "desc": "Aspirin Bayer box with batch info"
    },
    # Fallback - generic medicine box from commons
    {
        "name": "medicine_box_expiry.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Ciprofloxacin_Tablets.jpg/640px-Ciprofloxacin_Tablets.jpg",
        "desc": "Ciprofloxacin 500mg with expiry label"
    },
    {
        "name": "supplement_label.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Vitamin_D_supplement.jpg/640px-Vitamin_D_supplement.jpg",
        "desc": "Vitamin D supplement with expiry date"
    },
    {
        "name": "azithromycin_pack.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Azithromycin.jpg/640px-Azithromycin.jpg",
        "desc": "Azithromycin 500mg packaging"
    },
]

# Also try to get images from a medicine OCR GitHub dataset
GITHUB_IMAGES = [
    {
        "name": "exp_date_sample_1.jpg",
        "url": "https://raw.githubusercontent.com/RxNLP/medicine-ocr-samples/main/label1.jpg",
    },
    {
        "name": "exp_date_sample_2.jpg",
        "url": "https://raw.githubusercontent.com/bdlss/ocr-medicine/main/samples/med1.jpg",
    }
]


def download_image(url: str, dest_path: str, desc: str = ""):
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (MedExpire OCR Demo; educational use)"
        }
        r = requests.get(url, headers=headers, timeout=15)
        if r.status_code == 200 and len(r.content) > 1000:
            with open(dest_path, 'wb') as f:
                f.write(r.content)
            size_kb = len(r.content) // 1024
            print(f"  ✓ {os.path.basename(dest_path)} ({size_kb}KB) — {desc}")
            return True
        else:
            print(f"  ✗ {os.path.basename(dest_path)} — HTTP {r.status_code} or too small")
            return False
    except Exception as e:
        print(f"  ✗ {os.path.basename(dest_path)} — {e}")
        return False


def main():
    print(f"\n📥 Downloading real medicine label images to:\n   {DEST}\n")
    success = 0

    for img in IMAGES:
        dest = os.path.join(DEST, img["name"])
        if os.path.exists(dest):
            print(f"  ⏭ {img['name']} already exists, skipping")
            success += 1
            continue
        if download_image(img["url"], dest, img.get("desc", "")):
            success += 1

    # Try GitHub sources
    for img in GITHUB_IMAGES:
        dest = os.path.join(DEST, img["name"])
        if not os.path.exists(dest):
            download_image(img["url"], dest, "GitHub OCR dataset")

    print(f"\n✅ Downloaded {success}/{len(IMAGES)} images to backend/static/sample_images/")
    print("   These will be served at: http://localhost:8000/static/sample_images/")
    print("\nYou can upload these images in the AI Scanner page to test OCR.")


if __name__ == "__main__":
    main()
