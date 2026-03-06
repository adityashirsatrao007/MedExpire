@echo off
title MedExpire - Starting Services
echo.
echo ========================================
echo   MedExpire - AI Medicine Expiry Tracker
echo ========================================
echo.

:: Check Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Please install Python 3.9+
    pause
    exit /b 1
)

:: Install backend deps if needed
cd /d "%~dp0backend"
if not exist ".deps_installed" (
    echo [1/3] Installing Python dependencies...
    pip install -r requirements.txt
    echo. > .deps_installed
    echo [OK] Python deps installed.
) else (
    echo [1/3] Python deps already installed.
)

:: Train ML model if not exists
if not exist "ml\model.pkl" (
    echo [2/3] Training ML demand model...
    python ml\demand_model.py
    echo [OK] Model trained.
) else (
    echo [2/3] ML model already exists.
)

echo [3/3] Starting FastAPI backend on http://localhost:8000 ...
start "MedExpire Backend" cmd /k "cd /d %~dp0backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000"

:: Wait for backend
echo Waiting for backend to start...
timeout /t 5 /nobreak >nul

:: Start frontend
cd /d "%~dp0frontend"
if not exist "node_modules" (
    echo Installing Node.js dependencies...
    npm install
)

echo Starting React frontend on http://localhost:3000 ...
start "MedExpire Frontend" cmd /k "cd /d %~dp0frontend && npm start"

echo.
echo ========================================
echo   Both services are starting up!
echo   Backend:  http://localhost:8000/docs
echo   Frontend: http://localhost:3000
echo ========================================
echo.
pause
