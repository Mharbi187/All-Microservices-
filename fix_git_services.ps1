$ErrorActionPreference = "Continue"
$projectRoot = "D:\PFE\Developpment\platforme nexus aid"
$remoteUrl = "https://github.com/Mharbi187/All-Microservices-.git"

# List of services to reinitialize
$services = @(
    "admin-service",
    "api-gateway",
    "config-server",
    "core-service",
    "disaster-detection",
    "eureka-server",
    "nexus-aid-frontend",
    "postgres-init",
    "docs"
)

# Standard .gitignore patterns
$gitignoreContent = @"
# Sensitive data
.env
*.pem
*.key
*.json
!package*.json
!deployment*.json

# Dependencies
node_modules/
target/
dist/
.next/
build/
.venv/

# IDE & OS
.vscode/
.idea/
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
"@

Write-Host "--- Starting Git Reinitialization for All Services ---" -ForegroundColor Cyan

foreach ($service in $services) {
    $servicePath = Join-Path $projectRoot $service
    
    if (Test-Path $servicePath) {
        Write-Host "`nProcessing: $service" -ForegroundColor Green
        Set-Location $servicePath
        
        # 1. Clean up old git config
        if (Test-Path ".git") {
            Write-Host "  Removing existing .git..."
            Remove-Item -Path ".git" -Force -Recurse
        }
        
        # 2. Reinitialize
        Write-Host "  Initializing new Git repo..."
        git init -b $service | Out-Null
        
        # 3. Setup .gitignore
        Write-Host "  Setting up .gitignore..."
        Set-Content -Path ".gitignore" -Value $gitignoreContent
        
        # 4. Link to Remote
        Write-Host "  Linking to remote..."
        git remote add origin $remoteUrl
        
        # 5. Add, Commit, and Push
        Write-Host "  Adding files and committing..."
        git add .
        git commit -m "chore: reinitialize git and setup branch $service" | Out-Null
        
        Write-Host "  Pushing to GitHub (force)..."
        git push -u origin $service --force
        
        # 6. Verification
        Write-Host "  Verification:" -ForegroundColor Yellow
        git branch --show-current
        git remote -v
    } else {
        Write-Host "`nSkipping $($service): Path not found." -ForegroundColor Gray
    }
}

Write-Host "`n--- Git Reinitialization Complete! ---" -ForegroundColor Cyan
Set-Location $projectRoot
