$ErrorActionPreference = "Stop"
$sourceDir = $PSScriptRoot
$backendDir = $sourceDir
$tempDir = Join-Path $HOME "Desktop\PFE-Deploy-Temp"
$repoUrl = "https://github.com/Mharbi187/All-Microservices-.git"

Write-Host "Starting safe microservices deployment to branches..."

if (Test-Path $tempDir) { 
    Write-Host "Cleaning up old Temp-Deploy folder..."
    Remove-Item -Recurse -Force $tempDir 
}
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null
Set-Location $tempDir

Write-Host "Cloning repo $repoUrl into Temp-Deploy..."
git clone $repoUrl .
git config user.email "user@example.com"
git config user.name "Nexus Developer"


$microservices = @(
    @{ Name = "admin-service"; Source = "$sourceDir\admin-service" },
    @{ Name = "api-gateway"; Source = "$sourceDir\api-gateway" },
    @{ Name = "config-server"; Source = "$sourceDir\config-server" },
    @{ Name = "core-service"; Source = "$sourceDir\core-service" },
    @{ Name = "eureka-server"; Source = "$sourceDir\eureka-server" },
    @{ Name = "nexus-aid-frontend"; Source = "$sourceDir\nexus-aid-frontend" },
    @{ Name = "disaster-detection"; Source = "$sourceDir\Distaster Detection" },
    @{ Name = "postgres-init"; Source = "$sourceDir\postgres-init" },
    @{ Name = "docs"; Source = "$sourceDir\docs" }
)

foreach ($ms in $microservices) {
    if (Test-Path $ms.Source) {
        Write-Host ""
        Write-Host "=========================================="
        Write-Host "Processing $($ms.Name)..."
        Write-Host "=========================================="
        
        # Forcefully create or overwrite orphan branch safely
        git checkout --orphan temp-$($ms.Name)
        git rm -rf . --quiet
        git clean -fdx --quiet
        
        # Copy files over
        Write-Host "Copying files from $($ms.Source) to branch $($ms.Name)..."
        robocopy "$($ms.Source)" . /E /XD .git node_modules target .next .dist .venv /NFL /NDL /NJH /NJS /nc /ns /np
        
        # robocopy exit codes: below 8 is successful copy
        if ($LASTEXITCODE -ge 8) { 
            Write-Warning "Robocopy encountered an issue. Exit code: $LASTEXITCODE" 
        }

        # Fix GitHub Actions CI file for root-level execution on orphan branches
        $ciWorkflow = ".\.github\workflows\ci.yml"
        if (Test-Path $ciWorkflow) {
            $content = Get-Content $ciWorkflow
            $content = $content -replace "working-directory:.*", ""
            $content = $content -replace 'context: "nexus-aid-frontend"', 'context: "."'
            $content = $content -replace 'context: "Distaster Detection"', 'context: "."'
            $content = $content -replace '--file core-service/pom.xml', ''
            Set-Content $ciWorkflow $content
        }

        # Add and commit
        git add .
        git commit -m "Initialize $($ms.Name) from local source"
        git branch -M $ms.Name
        
        # Push to remote
        Write-Host "Pushing $($ms.Name) to GitHub with force to include new CI files..."
        git push -u origin $ms.Name --force
    } else {
        Write-Host "Skipping $($ms.Name), path not found: $($ms.Source)"
    }
}

Write-Host "============================"
Write-Host "Deploying Master Branch Compose"
Write-Host "============================"
git checkout main
git pull origin main
Copy-Item (Join-Path $sourceDir "docker-compose-local.yml") -Destination ".\docker-compose.yml" -Force
Copy-Item (Join-Path $sourceDir "README.md") -Destination ".\README.md" -Force
git add docker-compose.yml README.md
git commit -m "Update central orchestration docker-compose and README instructions"
git push -u origin main

Set-Location $sourceDir
Write-Host ""
Write-Host "Complete Deployment Process Finished! GHCR automated Pipelines and Docs are live!"
Write-Host "You can safely delete $tempDir when verified."
