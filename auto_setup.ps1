# Tunisia Disaster Detection - Automatic Setup Script
# This script will install Python and set up everything

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Tunisia Disaster Detection - Auto Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if running as admin
function Test-Administrator {
    $user = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($user)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Check admin rights
if (-not (Test-Administrator)) {
    Write-Host "This script needs administrator privileges." -ForegroundColor Yellow
    Write-Host "Restarting as administrator..." -ForegroundColor Yellow
    Start-Process powershell.exe "-ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

Write-Host "Running as Administrator: OK" -ForegroundColor Green
Write-Host ""

# Step 1: Check if Python is already installed
Write-Host "[1/5] Checking for Python..." -ForegroundColor Yellow

$pythonCommands = @("python", "py", "python3")
$pythonFound = $false

foreach ($cmd in $pythonCommands) {
    try {
        $version = & $cmd --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Found Python: $version" -ForegroundColor Green
            $pythonFound = $true
            $global:pythonCmd = $cmd
            break
        }
    } catch {
        continue
    }
}

# Step 2: Install Python if not found
if (-not $pythonFound) {
    Write-Host "  Python not found. Installing..." -ForegroundColor Yellow
    Write-Host ""
    
    # Try winget first (Windows 10/11)
    Write-Host "  Trying winget installation..." -ForegroundColor Cyan
    try {
        winget install -e --id Python.Python.3.12 --silent --accept-package-agreements --accept-source-agreements
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Python installed via winget!" -ForegroundColor Green
            
            # Refresh environment
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
            
            $pythonFound = $true
            $global:pythonCmd = "python"
        }
    } catch {
        Write-Host "  winget not available or failed" -ForegroundColor Yellow
    }
    
    # If winget failed, try chocolatey
    if (-not $pythonFound) {
        Write-Host "  Trying chocolatey installation..." -ForegroundColor Cyan
        try {
            choco install python -y
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  Python installed via chocolatey!" -ForegroundColor Green
                
                # Refresh environment
                refreshenv
                
                $pythonFound = $true
                $global:pythonCmd = "python"
            }
        } catch {
            Write-Host "  Chocolatey not available or failed" -ForegroundColor Yellow
        }
    }
    
    # If all automated methods failed, download manually
    if (-not $pythonFound) {
        Write-Host ""
        Write-Host "  Automated installation failed." -ForegroundColor Red
        Write-Host "  Opening Python download page..." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  Please:" -ForegroundColor Cyan
        Write-Host "    1. Download Python 3.12" -ForegroundColor White
        Write-Host "    2. Run the installer" -ForegroundColor White
        Write-Host "    3. CHECK: 'Add Python to PATH'" -ForegroundColor Red
        Write-Host "    4. Click 'Install Now'" -ForegroundColor White
        Write-Host "    5. Restart this script after installation" -ForegroundColor White
        Write-Host ""
        
        Start-Process "https://www.python.org/downloads/"
        
        Read-Host "Press Enter after installing Python to continue"
        
        # Try again
        try {
            $version = python --version 2>&1
            if ($LASTEXITCODE -eq 0) {
                $pythonFound = $true
                $global:pythonCmd = "python"
            }
        } catch {
            Write-Host "  Python still not found. Please restart computer and try again." -ForegroundColor Red
            Read-Host "Press Enter to exit"
            exit 1
        }
    }
}

Write-Host ""
Write-Host "[2/5] Creating virtual environment..." -ForegroundColor Yellow

# Create virtual environment
& $global:pythonCmd -m venv env

if ($LASTEXITCODE -ne 0) {
    Write-Host "  Failed to create virtual environment" -ForegroundColor Red
    Write-Host "  Trying to install virtualenv..." -ForegroundColor Yellow
    & $global:pythonCmd -m pip install virtualenv
    & $global:pythonCmd -m virtualenv env
}

if (Test-Path "env\Scripts\Activate.ps1") {
    Write-Host "  Virtual environment created!" -ForegroundColor Green
} else {
    Write-Host "  Failed to create virtual environment" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "[3/5] Installing Python packages..." -ForegroundColor Yellow
Write-Host "  This will take 3-5 minutes..." -ForegroundColor Cyan
Write-Host ""

# Activate virtual environment
& ".\env\Scripts\Activate.ps1"

# Upgrade pip
Write-Host "  Upgrading pip..." -ForegroundColor Cyan
python -m pip install --upgrade pip --quiet

# Install packages
$packages = @(
    "numpy",
    "pandas", 
    "scikit-learn",
    "streamlit",
    "folium",
    "streamlit-folium",
    "joblib",
    "python-dotenv",
    "tqdm",
    "matplotlib",
    "seaborn"
)

$i = 1
foreach ($package in $packages) {
    Write-Host "  [$i/$($packages.Count)] Installing $package..." -ForegroundColor Cyan
    pip install $package --quiet
    $i++
}

Write-Host "  All packages installed!" -ForegroundColor Green

Write-Host ""
Write-Host "[4/5] Training initial model..." -ForegroundColor Yellow

if (-not (Test-Path "data\models\disaster_model.pkl")) {
    python src\model.py
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Model trained successfully!" -ForegroundColor Green
    } else {
        Write-Host "  Model training had issues, but continuing..." -ForegroundColor Yellow
    }
} else {
    Write-Host "  Model already exists, skipping..." -ForegroundColor Green
}

Write-Host ""
Write-Host "[5/5] Setup complete!" -ForegroundColor Yellow
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "         SETUP SUCCESSFUL!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "To launch the dashboard:" -ForegroundColor Cyan
Write-Host "  1. Double-click: launch_simple.bat" -ForegroundColor White
Write-Host "  2. Or run: streamlit run app.py" -ForegroundColor White
Write-Host ""
Write-Host "The app will open at: http://localhost:8501" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Enter to launch now, or Ctrl+C to exit..." -ForegroundColor Yellow
Read-Host

# Launch Streamlit
Write-Host "Launching dashboard..." -ForegroundColor Cyan
streamlit run app.py
