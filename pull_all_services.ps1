# PowerShell script to pull the latest changes for all microservice repositories
$rootPath = $PSScriptRoot
$microservices = Get-ChildItem -Path $rootPath -Directory | Where-Object { Test-Path "$($_.FullName)\.git" }

Write-Host "Updating all microservice repositories..." -ForegroundColor Cyan

foreach ($ms in $microservices) {
    Write-Host "`n==========================================" -ForegroundColor Yellow
    Write-Host "Pulling for: $($ms.Name)" -ForegroundColor Yellow
    Write-Host "==========================================" -ForegroundColor Yellow
    
    Push-Location $ms.FullName
    try {
        $branch = (git branch --show-current).Trim()
        if ([string]::IsNullOrWhiteSpace($branch)) {
            Write-Warning "No active branch found for $($ms.Name). Skipping."
        } else {
            Write-Host "Current branch: $branch" -ForegroundColor Gray
            Write-Host "Fetching from origin..." -ForegroundColor Gray
            git fetch origin
            Write-Host "Resetting local to origin/$branch..." -ForegroundColor Gray
            git reset --hard "origin/$branch"
        }
    } catch {
        Write-Error "Failed to synchronize $($ms.Name)"
    }
    Pop-Location
}

Write-Host "`nAll repositories have been updated!" -ForegroundColor Green
