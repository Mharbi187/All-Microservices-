@echo off
echo ========================================
echo Simple Dependency Installer
echo ========================================
echo.

REM Test Python first
echo Testing Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python not found!
    echo.
    echo Please run: install_python_simple.bat first
    echo.
    pause
    exit /b 1
)

python --version
echo ✓ Python found!
echo.

REM Create virtual environment
if not exist "env" (
    echo Creating virtual environment...
    python -m venv env
    if %errorlevel% neq 0 (
        echo ERROR: Failed to create virtual environment
        echo.
        echo Try these commands manually:
        echo   python -m pip install --user virtualenv
        echo   python -m virtualenv env
        echo.
        pause
        exit /b 1
    )
    echo ✓ Virtual environment created
)

REM Activate environment
echo Activating virtual environment...
call env\Scripts\activate.bat
if %errorlevel% neq 0 (
    echo ERROR: Failed to activate virtual environment
    pause
    exit /b 1
)

echo ✓ Virtual environment activated
echo.

REM Upgrade pip
echo Upgrading pip...
python -m pip install --upgrade pip --quiet
echo ✓ pip upgraded
echo.

REM Install core packages one by one
echo Installing packages (this takes 3-5 minutes)...
echo.

echo [1/8] Installing setuptools...
pip install setuptools wheel --quiet

echo [2/8] Installing numpy...
pip install numpy

echo [3/8] Installing pandas...
pip install pandas

echo [4/8] Installing scikit-learn...
pip install scikit-learn

echo [5/8] Installing streamlit...
pip install streamlit

echo [6/8] Installing folium...
pip install folium streamlit-folium

echo [7/8] Installing utilities...
pip install joblib python-dotenv tqdm

echo [8/8] Installing matplotlib...
pip install matplotlib seaborn

echo.
echo ========================================
echo Verifying Installation
echo ========================================

python -c "import streamlit; print('✓ Streamlit:', streamlit.__version__)" 2>nul
python -c "import pandas; print('✓ Pandas:', pandas.__version__)" 2>nul
python -c "import numpy; print('✓ NumPy:', numpy.__version__)" 2>nul
python -c "import sklearn; print('✓ Scikit-learn:', sklearn.__version__)" 2>nul

echo.
echo ========================================
echo ✓ Installation Complete!
echo ========================================
echo.
echo Next step: Run launch_simple.bat
echo.
pause
