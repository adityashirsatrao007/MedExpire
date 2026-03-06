"""Export current SQLite DB to seed_data.json for Vercel deployment."""
import sys, json
sys.path.insert(0, r'z:\MedExpire\backend')
from database import SessionLocal
import models
from datetime import date

db = SessionLocal()
medicines = db.query(models.Medicine).all()
inventory = db.query(models.InventoryItem).all()
alerts = db.query(models.Alert).all()
today = date.today()

data = {
    "medicines": [
        {"id": m.id, "name": m.name, "manufacturer": m.manufacturer,
         "category": m.category, "composition": m.composition, "unit": m.unit}
        for m in medicines
    ],
    "inventory": [
        {"id": i.id, "medicine_id": i.medicine_id, "medicine_name": i.medicine_name,
         "batch_number": i.batch_number, "quantity": i.quantity, "unit_price": i.unit_price,
         "expiry_date": str(i.expiry_date) if i.expiry_date else None,
         "location": i.location, "supplier": i.supplier, "status": i.status,
         "days_to_expiry": (i.expiry_date - today).days if i.expiry_date else None,
         "waste_risk_score": i.waste_risk_score or 0.0}
        for i in inventory
    ],
    "alerts": [
        {"id": a.id, "inventory_id": a.inventory_id, "medicine_name": a.medicine_name,
         "batch_number": a.batch_number, "alert_type": a.alert_type, "message": a.message,
         "days_to_expiry": a.days_to_expiry, "quantity": a.quantity, "severity": a.severity,
         "is_dismissed": a.is_dismissed}
        for a in alerts
    ]
}
db.close()

import os
out = os.path.join(os.path.dirname(__file__), "seed_data.json")
with open(out, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Exported {len(data['medicines'])} medicines, {len(data['inventory'])} inventory, {len(data['alerts'])} alerts")
print(f"Saved to {out}")
