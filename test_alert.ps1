$ErrorActionPreference = "Stop"

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "🚀 TEST DIRECT DES ALERTES (EMAIL + WHATSAPP)" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "Envoi direct d'une alerte au webhook Python..."

$body = @"
{
  "status": "firing",
  "alerts": [
    {
      "labels": {
        "alertname": "TestManuelNexusAid",
        "severity": "critical"
      },
      "annotations": {
        "summary": "TEST MANUEL - NexusAid",
        "description": "Ceci est un test declenche manuellement."
      }
    }
  ]
}
"@

try {
    Invoke-RestMethod -Uri "http://localhost:5001/alert" -Method Post -ContentType "application/json" -Body $body
    Write-Host "✅ Alerte envoyee directement au pont Python avec succes !" -ForegroundColor Green
    Write-Host "Verifiez votre WhatsApp et Email !" -ForegroundColor Yellow
} catch {
    Write-Host "❌ Erreur : $_" -ForegroundColor Red
}
