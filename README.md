# MedExpire — AI-Based Medicine Expiry Tracking System

> An AI-powered pharmacy inventory system that reads expiry dates from medicine label images using HuggingFace's TrOCR model, tracks stock levels, predicts waste risk, and fires alerts for near-expiry medicines.

---

## 🚀 Quick Start (Windows)

Double-click **`start.bat`** — it will:

1. Install Python dependencies
2. Train the ML waste-risk model
3. Start FastAPI backend on `http://localhost:8000`
4. Start React frontend on `http://localhost:3000`

---

## 📋 Manual Setup

### Backend

```bash
cd backend
pip install -r requirements.txt
python ml/demand_model.py          # Train ML model
uvicorn main:app --reload          # Start API server
```

The database seeds automatically on first startup with **200+ Indian medicines** and synthetic inventory data.

### Frontend

```bash
cd frontend
npm install
npm start
```

---

## 🤖 AI Features

### 1. OCR — HuggingFace TrOCR

- **Model**: `microsoft/trocr-base-printed`
- **Task**: Reads printed text from medicine label images
- **Extracts**: Expiry date, medicine name, batch number
- **Endpoint**: `POST /ocr/scan` (upload image)

### 2. Waste Risk Prediction — ML

- **Model**: `GradientBoostingClassifier` (scikit-learn)
- **Features**: Days to expiry, stock quantity, unit price, estimated demand
- **Output**: Risk score 0.0–1.0 + risk level (low/medium/high)
- **Endpoint**: `GET /predict/waste-risk`

---

## 📊 Datasets Used

| Dataset                         | Source           | Purpose                                                |
| ------------------------------- | ---------------- | ------------------------------------------------------ |
| Indian Medicine Database        | Public (CDSCO)   | 200+ medicines with names, manufacturers, compositions |
| Global Pharmacy Sales 2020-2025 | Kaggle structure | Inventory and demand patterns                          |
| Synthetic Inventory Data        | Generated        | Realistic expiry date distributions for demo           |

---

## 🗂 Project Structure

```
MedExpire/
├── backend/
│   ├── main.py                 # FastAPI app
│   ├── database.py             # SQLAlchemy setup
│   ├── models.py               # DB models
│   ├── schemas.py              # Pydantic schemas
│   ├── routers/
│   │   ├── medicines.py        # Medicine CRUD
│   │   ├── inventory.py        # Inventory management
│   │   ├── ocr.py              # TrOCR scan endpoint
│   │   ├── alerts.py           # Alert management
│   │   └── predict.py          # Waste risk predictions
│   ├── ml/
│   │   └── demand_model.py     # GradientBoosting model
│   ├── utils/
│   │   └── ocr_utils.py        # TrOCR + regex extraction
│   └── data/
│       └── seed_kaggle.py      # Database seeder
├── frontend/
│   ├── src/
│   │   ├── App.js              # Router + Sidebar
│   │   ├── index.css           # Dark glassmorphism theme
│   │   └── pages/
│   │       ├── Dashboard.jsx   # Overview + charts
│   │       ├── Scanner.jsx     # AI OCR scanner
│   │       ├── Inventory.jsx   # Stock management
│   │       ├── Alerts.jsx      # Expiry alerts
│   │       └── Predict.jsx     # AI waste predictions
│   └── package.json
├── start.bat                   # One-click launcher
└── README.md
```

---

## 🌐 API Documentation

Visit `http://localhost:8000/docs` for interactive Swagger UI with all endpoints.

### Key Endpoints

| Method | Endpoint                   | Description                          |
| ------ | -------------------------- | ------------------------------------ |
| `POST` | `/ocr/scan`                | Scan medicine label image with TrOCR |
| `GET`  | `/inventory/`              | List all inventory items             |
| `GET`  | `/inventory/expiring-soon` | Items expiring within N days         |
| `GET`  | `/inventory/stats`         | Dashboard statistics                 |
| `GET`  | `/alerts/`                 | Active alerts                        |
| `POST` | `/alerts/generate`         | Scan inventory and generate alerts   |
| `GET`  | `/predict/waste-risk`      | AI waste risk predictions            |
| `GET`  | `/medicines/`              | Medicine database                    |

---

## 📦 Technology Stack

| Layer        | Technology                                 |
| ------------ | ------------------------------------------ |
| **AI OCR**   | HuggingFace `microsoft/trocr-base-printed` |
| **ML Model** | Scikit-learn GradientBoostingClassifier    |
| **Backend**  | Python 3.9+ · FastAPI · SQLAlchemy         |
| **Database** | SQLite (file: `backend/medexpire.db`)      |
| **Frontend** | React 18 · Recharts · Axios                |
| **Styling**  | Vanilla CSS · Glassmorphism · Inter font   |

---

## 👨‍💻 Presented By

**Aditya Shirsatrao & Team**  
AI-Based Medicine Expiry Tracking System  
Idea Presentation Competition
