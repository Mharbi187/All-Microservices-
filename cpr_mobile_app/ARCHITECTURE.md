# Architecture CPR Mobile App
## Détection de Pose Hybride (Offline + Backend Optionnel)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         📱 APPLICATION MOBILE                        │
│                        (React Native + Expo)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                      📷 CameraView                          │   │
│   │                   (expo-camera SDK 52)                       │   │
│   └──────────────────────────┬──────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │              🔄 PoseFrameProcessor.js                        │   │
│   │         (Gère les modes de détection)                        │   │
│   │                                                              │   │
│   │   ┌───────────┐  ┌───────────┐  ┌───────────────────────┐   │   │
│   │   │ SIMULATION│  │  OFFLINE  │  │     BACKEND          │   │   │
│   │   │  (Dev)    │  │ (ML Kit)  │  │    (Python)          │   │   │
│   │   └─────┬─────┘  └─────┬─────┘  └──────────┬───────────┘   │   │
│   │         │              │                    │               │   │
│   └─────────┼──────────────┼────────────────────┼───────────────┘   │
│             │              │                    │                   │
│             ▼              ▼                    ▼                   │
│   ┌─────────────────────────────────┐  ┌────────────────────────┐   │
│   │    🤖 MLKitPoseService.js       │  │  BackendAPIService.js  │   │
│   │  - 33 keypoints détectés        │  │  - REST API calls      │   │
│   │  - Position des mains           │  │  - Frames base64       │   │
│   │  - 100% OFFLINE                 │  │  - WiFi requis         │   │
│   └─────────────┬───────────────────┘  └────────────┬───────────┘   │
│                 │                                    │              │
│                 └──────────────┬─────────────────────┘              │
│                                ▼                                    │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │              📐 CPRAnalysisService.js                        │   │
│   │                                                              │   │
│   │   • Calcul BPM (100-120 recommandé)                          │   │
│   │   • Estimation profondeur (5-6 cm)                           │   │
│   │   • Comptage compressions                                    │   │
│   │   • Protocoles médicaux (Adulte/Enfant/Nourrisson)           │   │
│   │                                                              │   │
│   └─────────────────────────┬───────────────────────────────────┘   │
│                             │                                       │
│                             ▼                                       │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                   🔊 Feedback                                │   │
│   │                                                              │   │
│   │   📢 Voix (expo-speech)     📳 Vibration (expo-haptics)      │   │
│   │   "Plus vite!"              Impact à chaque compression      │   │
│   │   "Bon rythme!"                                              │   │
│   │                                                              │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

                    ┌──── WiFi OPTIONNEL ────┐
                    │                        │
                    ▼                        │
┌─────────────────────────────────────────────────────────────────────┐
│                       🖥️ BACKEND PYTHON                              │
│                      (api_server.py)                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌───────────────┐    ┌───────────────┐    ┌─────────────────┐    │
│   │  Flask REST   │    │   MediaPipe   │    │ CPRDetector     │    │
│   │     API       │───▶│     Pose      │───▶│  Analysis       │    │
│   └───────────────┘    └───────────────┘    └─────────────────┘    │
│                                                                     │
│   Endpoints:                                                        │
│   • POST /api/session/create     - Créer session                   │
│   • POST /api/session/{id}/process - Analyser frame               │
│   • GET  /api/session/{id}/status  - Obtenir métriques            │
│   • POST /api/session/{id}/end     - Terminer session             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 📁 Structure des fichiers

```
cpr_mobile_app/
├── src/
│   ├── services/
│   │   ├── MLKitPoseService.js      # Détection pose ML Kit (OFFLINE)
│   │   ├── PoseFrameProcessor.js    # Coordinateur des modes
│   │   ├── CPRAnalysisService.js    # Analyse CPR (BPM, profondeur)
│   │   ├── BackendAPIService.js     # Client API Python (optionnel)
│   │   └── EmergencyNumberService.js
│   │
│   ├── screens/
│   │   ├── CPRScreen.js             # Écran principal (refait)
│   │   ├── HomeScreen.js
│   │   └── SettingsScreen.js
│   │
│   └── components/
│       ├── MetricsDisplay.js
│       ├── GuidanceOverlay.js
│       └── CompressionProgress.js
│
└── package.json
```

## 🎮 Modes de fonctionnement

| Mode | Description | Utilisation |
|------|-------------|-------------|
| **SIMULATION** | Mouvements simulés automatiquement | Développement/Test |
| **OFFLINE** | ML Kit sur le téléphone | Production (par défaut) |
| **BACKEND** | Serveur Python | Analyse avancée (si WiFi) |

## ✅ Avantages de cette architecture

1. **100% OFFLINE** - Fonctionne sans internet
2. **Temps réel** - 10+ FPS sur le téléphone
3. **Fallback automatique** - Backend → Offline si déconnecté
4. **Économie batterie** - Traitement optimisé
5. **Multiplateforme** - iOS + Android
