# PowerShell script to safely pull updates for all microservices without losing local changes
$rootPath = $PSScriptRoot
$services = Get-ChildItem -Path $rootPath -Directory | Where-Object { Test-Path "$($_.FullName)\.git" }

Write-Host "Safely pulling updates for all microservice repositories..." -ForegroundColor Cyan

foreach ($ms in $services) {
    Write-Host "`n==========================================" -ForegroundColor Yellow
    Write-Host "Syncing repository: $($ms.Name)" -ForegroundColor Yellow
    Write-Host "==========================================" -ForegroundColor Yellow
    
    Push-Location $ms.FullName
    try {
        $branch = (git branch --show-current).Trim()
        if ([string]::IsNullOrWhiteSpace($branch)) {
            Write-Warning "No active branch found for $($ms.Name). Skipping."
            Pop-Location
            continue
        }
        
        Write-Host "Current branch: $branch" -ForegroundColor Gray
        
        # Check for uncommitted changes (tracked files)
        $hasChanges = (git status --porcelain | Where-Object { $_.Length -ge 2 -and $_.Substring(0,2) -match '[MADRC]' })
        
        if ($hasChanges) {
            Write-Host "Local changes detected. Stashing..." -ForegroundColor Magenta
            git stash | Out-Host
            
            Write-Host "Pulling latest code..." -ForegroundColor Gray
            git pull | Out-Host
            
            Write-Host "Applying local changes back..." -ForegroundColor Magenta
            git stash pop | Out-Host
        } else {
            Write-Host "No local changes. Pulling directly..." -ForegroundColor Gray
            git pull | Out-Host
        }
    } catch {
        Write-Error "Error synchronizing $($ms.Name): $_"
    }
    Pop-Location
}

Write-Host "`nAll repositories synchronized successfully!" -ForegroundColor Green
