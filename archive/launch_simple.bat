@echo off
echo ========================================
echo Tunisia Disaster Detection Platform
echo ========================================
echo.

REM Check environment
if not exist "env\Scripts\activate.bat" (
    echo ERROR: Virtual environment not found!
    echo Please run: install_deps_simple.bat first
    echo.
    pause
    exit /b 1
)

REM Activate environment
call env\Scripts\activate.bat

REM Check Streamlit
python -c "import streamlit" 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Streamlit not installed!
    echo Please run: install_deps_simple.bat first
    echo.
    pause
    exit /b 1
)

echo ✓ Dependencies OK
echo.

REM Train model if needed
if not exist "data\models\disaster_model.pkl" (
    echo Training initial model...
    python src\model.py
    echo.
)

echo ========================================
echo Launching Dashboard...
echo ========================================
echo.
echo Dashboard URL: http://localhost:8501
echo.
echo Press Ctrl+C to stop
echo ========================================
echo.

streamlit run app.py

pause
