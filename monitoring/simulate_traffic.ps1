# =========================================================================
# Script de Simulation de Trafic - NexusAid Monitoring
# Ce script génère du trafic pour animer Grafana et déclencher des alertes
# =========================================================================

$FRONTEND_URL = "http://localhost:9173"
$API_URL = "http://localhost:8060" # L'API Gateway qui centralise le trafic

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "🚀 DÉMARRAGE DE LA SIMULATION DE TRAFIC NEXUSAID" -ForegroundColor Cyan
Write-Host "Ouvrez Grafana (http://localhost:3000) pour voir les résultats !" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Start-Sleep -Seconds 2

# -------------------------------------------------------------------------
# 1. TRAFIC NORMAL (Génère de l'activité sur API Gateway et Microservices)
# -------------------------------------------------------------------------
Write-Host "`n[1/4] 🚶 Simulation de trafic normal (Navigation web)..." -ForegroundColor Green
for ($i = 1; $i -le 50; $i++) {
    # Simuler un utilisateur qui ouvre le frontend et charge l'API
    Invoke-WebRequest -Uri "$FRONTEND_URL/" -UseBasicParsing -ErrorAction SilentlyContinue | Out-Null
    Invoke-WebRequest -Uri "$API_URL/actuator/health" -UseBasicParsing -ErrorAction SilentlyContinue | Out-Null
    Write-Host "." -NoNewline -ForegroundColor Green
    Start-Sleep -Milliseconds 100
}
Write-Host " Terminé !" -ForegroundColor Green

# -------------------------------------------------------------------------
# 2. ATTAQUE BRUTE FORCE (Déclenche l'alerte de Sécurité)
# -------------------------------------------------------------------------
Write-Host "`n[2/4] 🏴‍☠️ Simulation d'attaque Brute Force en cours..." -ForegroundColor Red
Write-Host "Cela va faire monter le 'Risk Score' et déclencher une alerte Email/WhatsApp." -ForegroundColor Red

$body = '{"email":"admin@nexusaid.com", "password":"mauvais_mot_de_passe"}'
for ($i = 1; $i -le 40; $i++) {
    try {
        Invoke-WebRequest -Uri "$API_URL/api/auth/login" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing -ErrorAction SilentlyContinue | Out-Null
    } catch {
        # Ignorer les erreurs HTTP attendues (ex: 401 Unauthorized)
    }
    Write-Host "x" -NoNewline -ForegroundColor Red
    Start-Sleep -Milliseconds 50
}
Write-Host " Terminé !" -ForegroundColor Red

# -------------------------------------------------------------------------
# 3. ERREURS 404 ET 500 (Génère des erreurs dans le Dashboard API Gateway)
# -------------------------------------------------------------------------
Write-Host "`n[3/4] ⚠️ Simulation de pages introuvables (Erreurs HTTP 404/500)..." -ForegroundColor Yellow
for ($i = 1; $i -le 30; $i++) {
    Invoke-WebRequest -Uri "$API_URL/api/page-qui-n-existe-pas-$i" -UseBasicParsing -ErrorAction SilentlyContinue | Out-Null
    Write-Host "!" -NoNewline -ForegroundColor Yellow
    Start-Sleep -Milliseconds 50
}
Write-Host " Terminé !" -ForegroundColor Yellow

# -------------------------------------------------------------------------
# 4. PIC DE TRAFIC (Test de montée en charge)
# -------------------------------------------------------------------------
Write-Host "`n[4/4] ⚡ Simulation d'un pic de trafic soudain (High Load)..." -ForegroundColor Magenta
for ($i = 1; $i -le 100; $i++) {
    Invoke-WebRequest -Uri "$API_URL/actuator/health" -UseBasicParsing -ErrorAction SilentlyContinue | Out-Null
    Write-Host "*" -NoNewline -ForegroundColor Magenta
}
Write-Host " Terminé !" -ForegroundColor Magenta

Write-Host "`n======================================================" -ForegroundColor Cyan
Write-Host "✅ SIMULATION TERMINÉE !" -ForegroundColor Cyan
Write-Host "Allez sur Grafana :" -ForegroundColor Cyan
Write-Host "1. Dashboard '01 - Sécurité & Auth' (Pour voir l'attaque BruteForce)" -ForegroundColor White
Write-Host "2. Dashboard '02 - API Gateway' (Pour voir les pics de trafic et erreurs 404)" -ForegroundColor White
Write-Host "Attendez 15 à 30 secondes pour que l'alerte arrive sur votre WhatsApp/Email !" -ForegroundColor Yellow
Write-Host "======================================================" -ForegroundColor Cyan
