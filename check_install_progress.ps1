# Check Installation Progress

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Installation Progress Checker" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if virtual environment exists
Write-Host "[1/4] Checking virtual environment..." -ForegroundColor Yellow
if (Test-Path "env\Scripts\python.exe") {
    Write-Host "  ✓ Virtual environment created" -ForegroundColor Green
    $venvCreated = $true
} else {
    Write-Host "  ⏳ Virtual environment not yet created..." -ForegroundColor Yellow
    $venvCreated = $false
}

Write-Host ""

# Check Python processes
Write-Host "[2/4] Checking active processes..." -ForegroundColor Yellow
$pythonProcesses = Get-Process | Where-Object {$_.ProcessName -like "*python*" -or $_.ProcessName -like "*pip*"}
if ($pythonProcesses) {
    Write-Host "  ✓ Installation in progress:" -ForegroundColor Green
    $pythonProcesses | ForEach-Object {
        Write-Host "    - $($_.ProcessName) (PID: $($_.Id))" -ForegroundColor Cyan
    }
} else {
    Write-Host "  ⚠ No Python/pip processes found" -ForegroundColor Yellow
}

Write-Host ""

# Check installed packages (if venv exists)
Write-Host "[3/4] Checking installed packages..." -ForegroundColor Yellow
if ($venvCreated) {
    $packages = @("streamlit", "pandas", "numpy", "scikit-learn", "folium")
    foreach ($pkg in $packages) {
        try {
            $result = & "env\Scripts\python.exe" -c "import $pkg; print('✓')" 2>&1
            if ($result -eq "✓") {
                Write-Host "  ✓ $pkg installed" -ForegroundColor Green
            } else {
                Write-Host "  ⏳ $pkg installing..." -ForegroundColor Yellow
            }
        } catch {
            Write-Host "  ⏳ $pkg not yet installed" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "  ⏳ Waiting for virtual environment..." -ForegroundColor Yellow
}

Write-Host ""

# Check if model is trained
Write-Host "[4/4] Checking model..." -ForegroundColor Yellow
if (Test-Path "data\models\disaster_model.pkl") {
    Write-Host "  ✓ Model trained and ready" -ForegroundColor Green
} else {
    Write-Host "  ⏳ Model not yet trained" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

# Overall status
if ($venvCreated -and (Test-Path "data\models\disaster_model.pkl")) {
    Write-Host "STATUS: Installation Complete! ✓" -ForegroundColor Green
    Write-Host "Next step: Run launch_simple.bat" -ForegroundColor Cyan
} elseif ($pythonProcesses) {
    Write-Host "STATUS: Installation in progress... ⏳" -ForegroundColor Yellow
    Write-Host "Please wait. This may take 5-10 minutes." -ForegroundColor Cyan
} else {
    Write-Host "STATUS: Installation may have stopped ⚠" -ForegroundColor Yellow
    Write-Host "Try running install_deps_simple.bat again" -ForegroundColor Cyan
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
