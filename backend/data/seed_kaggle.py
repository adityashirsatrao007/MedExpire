"""
Database Seeder – uses the REAL Kaggle dataset:
  shudhanshusingh/az-medicine-dataset-of-india
  (~254,000 Indian medicines with name, price, manufacturer, composition)
"""
import os, sys, random, logging
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MAX_MEDICINES = 300

EXPIRY_BUCKETS = [
    (-90,  -1,  0.08),
    (  1,   6,  0.06),
    (  7,  29,  0.10),
    ( 30,  89,  0.15),
    ( 90, 180,  0.20),
    (181, 365,  0.25),
    (366, 730,  0.16),
]

def pick_expiry_date():
    r, cum = random.random(), 0.0
    for mn, mx, w in EXPIRY_BUCKETS:
        cum += w
        if r < cum:
            return date.today() + timedelta(days=random.randint(mn, mx))
    return date.today() + timedelta(days=random.randint(181, 365))

def make_batch():
    return f"B{random.randint(1000,9999)}{random.choice('ABCDEFGHJKLMNPQRSTUVWXYZ')}"

def _category(name):
    n = name.lower()
    for kw, cat in [("tablet","Tablets"),("capsule","Capsules"),("syrup","Syrups"),
                    ("injection","Injections"),("cream","Topicals"),("ointment","Topicals"),
                    ("gel","Topicals"),("drop","Eye/Ear Drops"),("inhaler","Inhalers"),
                    ("suspension","Suspensions"),("solution","Solutions"),("powder","Powders")]:
        if kw in n: return cat
    return "Other"

def load_kaggle_medicines():
    try:
        import kagglehub, pandas as pd
    except ImportError:
        logger.warning("kagglehub/pandas not installed — using fallback list")
        return None, {}

    try:
        logger.info("Loading Kaggle AZ India dataset (cached after first download)…")
        path = kagglehub.dataset_download("shudhanshusingh/az-medicine-dataset-of-india")
        csv_path = os.path.join(path, "A_Z_medicines_dataset_of_India.csv")
        df = pd.read_csv(csv_path)
        df.columns = [c.strip() for c in df.columns]

        if "Is_discontinued" in df.columns:
            df = df[df["Is_discontinued"] == False]

        df = df.dropna(subset=["name"])
        df["name"] = df["name"].astype(str).str.strip()
        df = df.drop_duplicates(subset=["name"])
        logger.info(f"Total unique active medicines: {len(df)}")

        # Sample ~MAX_MEDICINES spread across A-Z
        per_letter = max(1, MAX_MEDICINES // 26)
        parts = []
        for letter in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
            sub = df[df["name"].str.upper().str.startswith(letter)]
            parts.append(sub.sample(min(per_letter, len(sub)), random_state=42))
        result = pd.concat(parts).head(MAX_MEDICINES)
        logger.info(f"Selected {len(result)} medicines for seeding")

        # Build price lookup
        prices = {}
        for _, row in result.iterrows():
            try:
                p = float(str(row.get("price(₹)", "0")).replace(",", "").strip())
                prices[str(row["name"]).strip()] = round(p if p > 0 else random.uniform(20, 800), 2)
            except Exception:
                prices[str(row["name"]).strip()] = round(random.uniform(20, 800), 2)

        return result, prices

    except Exception as e:
        logger.error(f"Kaggle load failed: {e}")
        return None, {}


def seed(session):
    import models

    # Clear existing data
    existing = session.query(models.Medicine).count()
    if existing > 0:
        logger.info(f"Clearing {existing} existing medicines…")
        session.query(models.Alert).delete()
        session.query(models.InventoryItem).delete()
        session.query(models.Medicine).delete()
        session.commit()

    df, prices = load_kaggle_medicines()

    if df is not None:
        for _, row in df.iterrows():
            name = str(row.get("name", "")).strip()
            if not name:
                continue
            session.add(models.Medicine(
                name=name,
                manufacturer=str(row.get("manufacturer_name", "")).strip() or None,
                category=_category(name),
                composition=str(row.get("salt_composition", "")).strip() or None,
            ))
    else:
        FALLBACK = [
            ("Amoxicillin 500mg Capsule","Cipla Ltd","Capsules","Amoxicillin",45),
            ("Azithromycin 500mg Tablet","Sun Pharma","Tablets","Azithromycin",93),
            ("Paracetamol 500mg Tablet","GSK","Tablets","Paracetamol",18),
            ("Metformin 500mg Tablet","USV Pvt Ltd","Tablets","Metformin HCl",28),
            ("Atorvastatin 10mg Tablet","Cipla Ltd","Tablets","Atorvastatin",55),
            ("Omeprazole 20mg Capsule","Alkem","Capsules","Omeprazole",40),
            ("Cetirizine 10mg Tablet","Dr Reddy's","Tablets","Cetirizine HCl",22),
            ("Pantoprazole 40mg Tablet","Torrent","Tablets","Pantoprazole",52),
        ]
        for name, mfr, cat, comp, p in FALLBACK:
            session.add(models.Medicine(name=name, manufacturer=mfr, category=cat, composition=comp))
            prices[name] = p

    session.commit()

    # Create inventory items
    medicines = session.query(models.Medicine).all()
    locations = ["Cabinet A", "Cabinet B", "Main Shelf", "Cold Storage", "Dispensary"]
    inventory_items = []

    for med in medicines:
        expiry = pick_expiry_date()
        qty = random.randint(5, 500)
        price = prices.get(med.name, round(random.uniform(20, 800), 2))
        days_left = (expiry - date.today()).days

        if days_left < 0:
            status = "expired"
        elif days_left <= 7:
            status = "near_expiry"
        elif days_left <= 30:
            status = "expiring_soon"
        else:
            status = "active"

        item = models.InventoryItem(
            medicine_id=med.id,
            medicine_name=med.name,
            batch_number=make_batch(),
            expiry_date=expiry,
            quantity=qty,
            unit_price=price,
            supplier=med.manufacturer or "Generic Pharma",
            location=random.choice(locations),
            status=status,
        )
        session.add(item)
        inventory_items.append((item, days_left))

    session.commit()

    # Generate alerts
    for item, days_left in inventory_items:
        if days_left < 0:
            session.add(models.Alert(
                inventory_id=item.id, medicine_name=item.medicine_name,
                batch_number=item.batch_number, alert_type="expired",
                message=f"{item.medicine_name} has EXPIRED (Batch: {item.batch_number}). Remove {item.quantity} units immediately.",
                days_to_expiry=days_left, quantity=item.quantity, severity="critical",
            ))
        elif days_left <= 7:
            session.add(models.Alert(
                inventory_id=item.id, medicine_name=item.medicine_name,
                batch_number=item.batch_number, alert_type="near_expiry",
                message=f"{item.medicine_name} expires in {days_left} days. {item.quantity} units need urgent attention.",
                days_to_expiry=days_left, quantity=item.quantity, severity="high",
            ))
        elif days_left <= 30:
            session.add(models.Alert(
                inventory_id=item.id, medicine_name=item.medicine_name,
                batch_number=item.batch_number, alert_type="near_expiry",
                message=f"{item.medicine_name} expires in {days_left} days (Batch: {item.batch_number}). {item.quantity} units need attention.",
                days_to_expiry=days_left, quantity=item.quantity, severity="medium",
            ))

    session.commit()
    return len(medicines)


if __name__ == "__main__":
    from database import SessionLocal, engine
    import models
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        n = seed(db)
        inv = db.query(models.InventoryItem).count()
        alerts = db.query(models.Alert).count()
        print(f"\n✅ Seeded {n} medicines (from Kaggle AZ India dataset)")
        print(f"✅ Created {inv} inventory items")
        print(f"✅ Generated {alerts} alerts")
    finally:
        db.close()
