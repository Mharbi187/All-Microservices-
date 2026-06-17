@echo off
echo ==========================================
echo  FIXING PYTHON ENVIRONMENT & LAUNCHING
echo ==========================================

echo [1/5] Cleaning up old environment...
if exist .venv (
    rmdir /s /q .venv
    echo    - Old .venv removed
)

echo [2/5] Creating new virtual environment...
python -m venv .venv
if %errorlevel% neq 0 (
    echo    X Failed to create venv. Make sure Python is installed.
    pause
    exit /b
)
echo    - New .venv created

echo [3/5] Activating environment...
call .venv\Scripts\activate

echo [4/5] Installing dependencies...
echo    - This may take a minute...
pip install -r requirements.txt > nul
if %errorlevel% neq 0 (
    echo    X Failed to install dependencies.
    pause
    exit /b
)
echo    - Dependencies installed!

echo [5/5] Launching Dashboard...
echo ==========================================
echo    - Starting Streamlit...
echo    - If weather data is missing, wait 30m for API key.
echo ==========================================

streamlit run advanced_dashboard.py
pause
