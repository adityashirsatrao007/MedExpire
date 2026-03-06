"""
ML Demand Prediction Model
Uses a RandomForestClassifier trained on synthetic pharmacy data
(modeled from Kaggle Global Pharmacy Sales Dataset structure)
to predict waste risk score for each inventory item.
"""
import os
import numpy as np
import joblib
import logging

logger = logging.getLogger(__name__)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pkl")

_model = None


def _train_model():
    """Train a RandomForest model on synthetic pharmacy data."""
    from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import StandardScaler
    import pandas as pd

    logger.info("Training demand/waste-risk model on synthetic pharmaceutical data...")

    # Synthetic training data based on real pharmaceutical patterns
    np.random.seed(42)
    n_samples = 5000

    # Features: days_to_expiry, quantity, unit_price, demand_rate (units/day)
    days_to_expiry = np.random.randint(-30, 365, n_samples)
    quantity = np.random.randint(1, 500, n_samples)
    unit_price = np.random.uniform(5, 5000, n_samples)
    demand_rate = np.random.uniform(0.1, 20, n_samples)  # units sold per day

    # Compute ground truth waste risk
    # High risk = quantity > demand_rate * days_to_expiry (won't sell before expiry)
    sellable = demand_rate * np.maximum(days_to_expiry, 0)
    excess = quantity - sellable
    waste_risk_raw = np.clip(excess / np.maximum(quantity, 1), 0, 1)

    # Add noise
    waste_risk_raw += np.random.normal(0, 0.05, n_samples)
    waste_risk_raw = np.clip(waste_risk_raw, 0, 1)

    # Binary label: high risk if > 0.5
    y = (waste_risk_raw > 0.5).astype(int)

    X = np.column_stack([days_to_expiry, quantity, unit_price, demand_rate])

    model = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", GradientBoostingClassifier(n_estimators=100, max_depth=4, random_state=42))
    ])
    model.fit(X, y)

    joblib.dump(model, MODEL_PATH)
    logger.info(f"Model trained and saved to {MODEL_PATH}")
    return model


def _load_or_train():
    global _model
    if _model is not None:
        return _model
    if os.path.exists(MODEL_PATH):
        try:
            _model = joblib.load(MODEL_PATH)
            logger.info("Loaded existing model from disk.")
            return _model
        except Exception:
            pass
    _model = _train_model()
    return _model


def predict_waste_risk(days_to_expiry: int, quantity: int, unit_price: float) -> float:
    """
    Predict waste risk score for a single inventory item.
    Returns a float between 0.0 (safe) and 1.0 (high risk of expiry before sale).
    """
    try:
        model = _load_or_train()
        # Estimate demand rate based on price (cheaper = faster turnover)
        demand_rate = max(0.5, 20 - (unit_price / 500))
        X = np.array([[days_to_expiry, quantity, unit_price, demand_rate]])
        # Get probability of high-risk class
        prob = model.predict_proba(X)[0][1]
        return round(float(prob), 3)
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        # Fallback heuristic
        if days_to_expiry < 0:
            return 1.0
        elif days_to_expiry < 30:
            return 0.8
        elif days_to_expiry < 90:
            return 0.4
        return 0.1


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    model = _load_or_train()
    # Quick test
    test_cases = [
        (5, 200, 50),     # 5 days left, 200 units — HIGH risk
        (180, 10, 100),   # 6 months left, 10 units — LOW risk
        (-5, 50, 200),    # Already expired — CRITICAL
        (60, 50, 500),    # 2 months, moderate stock
    ]
    print("\n=== Waste Risk Predictions ===")
    for days, qty, price in test_cases:
        score = predict_waste_risk(days, qty, price)
        level = "HIGH" if score > 0.7 else ("MEDIUM" if score > 0.4 else "LOW")
        print(f"  Days={days:4d}  Qty={qty:4d}  Price=₹{price:5.0f}  → Risk={score:.3f} ({level})")
