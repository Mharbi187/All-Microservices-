@echo off
REM Automatic installer - runs PowerShell script with admin privileges

echo ========================================
echo Tunisia Disaster Detection
echo AUTOMATIC INSTALLATION
echo ========================================
echo.
echo This will:
echo   1. Install Python (if needed)
echo   2. Create virtual environment
echo   3. Install all packages
echo   4. Train initial model
echo   5. Launch the dashboard
echo.
echo This requires Administrator privileges.
echo You may see a UAC prompt - click Yes.
echo.
pause

echo.
echo Starting installation...
echo.

REM Run PowerShell script as administrator
powershell.exe -ExecutionPolicy Bypass -File "auto_setup.ps1"

echo.
echo Done!
pause
