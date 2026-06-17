@echo off
echo ==========================================
echo  CREATING FRESH ENVIRONMENT (Bypassing locks)
echo ==========================================

echo [1/4] Creating new environment '.venv_fresh'...
python -m venv .venv_fresh
if %errorlevel% neq 0 (
    echo    X Failed to create venv.
    pause
    exit /b
)

echo [2/4] Activating...
call .venv_fresh\Scripts\activate

echo [3/4] Installing dependencies...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo    X Failed to install dependencies.
    pause
    exit /b
)

echo [4/4] Launching Dashboard...
streamlit run advanced_dashboard.py
pause
