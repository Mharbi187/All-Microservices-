$ErrorActionPreference = "Stop"

$API_URL = "http://localhost:8282"
$API_KEY = "dev-admin-key"
$HEADERS = @{
    "x-api-key" = $API_KEY
    "Content-Type" = "application/json"
}

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "CONFIGURATION AUTOMATIQUE DE WHATSAPP" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

Write-Host "0. Nettoyage des anciennes sessions (pour eviter les erreurs de scan)..."
try {
    $sessions = Invoke-RestMethod -Uri "$API_URL/api/sessions" -Method Get -Headers $HEADERS
    foreach ($s in $sessions) {
        Invoke-RestMethod -Uri "$API_URL/api/sessions/$($s.id)" -Method Delete -Headers $HEADERS | Out-Null
        Write-Host "Ancienne session $($s.id) supprimee." -ForegroundColor Yellow
    }
} catch {}

Write-Host "1. Creation d'une NOUVELLE session WhatsApp..."
$body = '{"name":"nexusaid-nouvelle"}'
try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/sessions" -Method Post -Headers $HEADERS -Body $body
    $SESSION_ID = $response.id
    Write-Host "Session creee avec l'ID: $SESSION_ID" -ForegroundColor Green
} catch {
    Write-Host "Erreur impossible de creer la session." -ForegroundColor Red
    exit
}

Write-Host "2. Demarrage du moteur WhatsApp (generation du QR Code)..."
try {
    Invoke-RestMethod -Uri "$API_URL/api/sessions/$SESSION_ID/start" -Method Post -Headers $HEADERS | Out-Null
    Write-Host "Moteur demarre." -ForegroundColor Green
} catch {
    Write-Host "Erreur de demarrage du moteur." -ForegroundColor Red
    exit
}

Write-Host "3. Recuperation du QR Code (patientez 5 a 10 secondes)..."
Start-Sleep -Seconds 8
try {
    $qrResponse = Invoke-RestMethod -Uri "$API_URL/api/sessions/$SESSION_ID/qr" -Method Get -Headers $HEADERS
    
    if ($qrResponse.qrCode) {
        $imgSrc = $qrResponse.qrCode
        $html = "<!DOCTYPE html><html><head><title>NexusAid - Scannez ce QR Code WhatsApp</title></head><body style='font-family: Arial; text-align: center; margin-top: 50px; background-color: #f0f2f5;'>"
        $html += "<h2>Scannez ce QR Code RAPIDEMENT (il expire au bout de 20s)</h2>"
        $html += "<p>Ouvrez WhatsApp sur votre telephone > Appareils connectes > Connecter un appareil</p>"
        $html += "<img src='" + $imgSrc + "' style='border: 10px solid white; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);' />"
        $html += "<p style='color: green; font-weight: bold;'>La page peut etre fermee une fois le code scanne.</p>"
        $html += "</body></html>"
        
        $htmlPath = "$env:TEMP\nexusaid_whatsapp_qr.html"
        [System.IO.File]::WriteAllText($htmlPath, $html)
        Write-Host "QR Code genere ! Ouverture de votre navigateur..." -ForegroundColor Green
        Start-Process $htmlPath
    } else {
        Write-Host "Le QR code n'est pas pret. L'image va etre regeneree, relancez le script !" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Impossible de recuperer le QR Code." -ForegroundColor Yellow
}

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "Des que le scan est fait, vous pouvez lancer simulate_traffic.ps1" -ForegroundColor Cyan
