# NexusAid Computer Vision — Visual Architecture & Integration Maps

**Date**: April 15, 2026  
**Generated**: Complete Architecture Analysis

---

## 1. SYSTEM-WIDE CV INTEGRATION MAP

```
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                            │
│                      NEXUSAID MICROSERVICES ARCHITECTURE                  │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                            FRONTEND LAYER                            │ │
│  │                                                                       │ │
│  │  ┌─────────────────────────────────────────────────────────────┐    │ │
│  │  │  React 19 + TypeScript (Vite)                              │    │ │
│  │  │  nexus-aid-frontend (port 3000)                            │    │ │
│  │  │                                                             │    │ │
│  │  │  Components:                                                │    │ │
│  │  │  ├─ CatastrophesPage                                        │    │ │
│  │  │  │  └─ iframe → Streamlit Disaster Dashboard (external)    │    │ │
│  │  │  ├─ ProfileDashboard (volunteer profiles)                  │    │ │
│  │  │  ├─ CrisisRoomPage (WebSocket to MS4)                      │    │ │
│  │  │  └─ [NO CPR Components] (external mobile app)              │    │ │
│  │  │                                                             │    │ │
│  │  └─────────────────────────┬───────────────────────────────────┘    │ │
│  └──────────────────────────────┼────────────────────────────────────────┘ │
│                                 │                                           │
│  ┌──────────────────────────────┼────────────────────────────────────────┐ │
│  │                    API LAYER: Spring Cloud Gateway                   │ │
│  │                          (port 8000)                                 │ │
│  │                  Reactive/WebFlux + Route Predicates                 │ │
│  │                         [JWT RS256 Auth]                             │ │
│  │                                                                       │ │
│  │  Routes:                                                              │ │
│  │  ├─ /api/v1/auth/** → core-service                                  │ │
│  │  ├─ /api/v1/profiles/** → core-service                              │ │
│  │  ├─ /api/v1/management/** → admin-service                           │ │
│  │  ├─ /api/v1/reports/** → admin-service                              │ │
│  │  └─ /ws/** → Upgraded to WebSocket                                  │ │
│  │                                                                       │ │
│  └──────────────────────────────┼────────────────────────────────────────┘ │
│                                 │                                           │
│     ┌─────────────────────────────┴──────────────────────────────┐          │
│     │                                                            │          │
│  ┌──▼──────────────────────┐  ┌──────────────────────┐  ┌──────▼───────┐  │
│  │   MS1: CORE-SERVICE     │  │ MS3: ADMIN-SERVICE  │  │ MS4: DISASTER │  │
│  │   (Spring Boot)         │  │   (Spring Boot)     │  │ DETECTION     │  │
│  │   Port: 8080            │  │  Port: 8081         │  │ (FastAPI)     │  │
│  │   PostgreSQL: core_db   │  │  PostgreSQL: admin  │  │ Port: 8000    │  │
│  │                         │  │  _db                │  │               │  │
│  │ ┌─────────────────────┐ │  │ ┌────────────────┐  │  │ ┌───────────┐ │  │
│  │ │ Controllers:        │ │  │ │ Controllers:   │  │  │ │ GEE Data  │ │  │
│  │ │ ├─ Auth            │ │  │ │ ├─ Report      │  │  │ │Acquisition│ │  │
│  │ │ ├─ Profile         │ │  │ │ ├─ EventLog    │  │  │ │           │ │  │
│  │ │ ├─ Committee       │ │  │ │ ├─ Alerts      │  │  │ │ Features: │ │  │
│  │ │ ├─ Intervention    │ │  │ │ └─ Dashboard   │  │  │ │ NDVI,NDWI │ │  │
│  │ │ ├─ Inventory       │ │  │ │                │  │  │ │ LST, ...  │ │  │
│  │ │ └─ Domains         │ │  │ │ [NEW]          │  │  │ └───────────┘ │  │
│  │ │    (Social, Youth) │ │  │ │ EventLogService│  │  │       │        │  │
│  │ │                    │ │  │ │ EventLogAPI    │  │  │       ▼        │  │
│  │ └─────────────────────┘ │  │ └────────────────┘  │  │ ┌───────────┐ │  │
│  │                         │  │                     │  │ │RandomForest│ │  │
│  │ ┌─────────────────────┐ │  │ ┌────────────────┐  │  │ │Classifier │ │  │
│  │ │ RabbitMQ Events:    │ │  │ │ RabbitMQ       │  │  │ │           │ │  │
│  │ │ Publish:            │ │  │ │ Consumer:      │  │  │ │ROC-AUC:   │ │  │
│  │ │ ├─ intervention.    │ │  │ │ ├─ disaster.   │  │  │ │0.92       │ │  │
│  │ │ │  created          │ │  │ │ │  alerts      │  │  │ │           │ │  │
│  │ │ ├─ stock.alert      │ │  │ │ ├─ intervention│  │  │ │Precision: │ │  │
│  │ │ └─ report.published │ │  │ │ │  alerts      │  │  │ │94%        │ │  │
│  │ │                    │ │  │ │ ├─ stock.alerts│  │  │ │           │ │  │
│  │ │ Consumer:          │ │  │ │ └─ report.pub  │  │  │ │ Features: │ │  │
│  │ │ ├─ disaster.alerts │ │  │ │                │  │  │ │ 8 best    │ │  │
│  │ │ └─ Builds          │ │  │ └────────────────┘  │  │ │           │ │  │
│  │ │   interventions    │ │  │ [NEW] EventLogSvc  │  │ │ Training: │ │  │
│  │ │   auto            │ │  │ ├─ Consumes all     │  │ │ 50 events │ │  │
│  │ └─────────────────────┘ │  │ │  events          │  │ │           │ │  │
│  │                         │  │ ├─ Persists to     │  │ │ Export:   │ │  │
│  │ Database:             │  │ │  event_logs       │  │ │ [NONE]    │ │  │
│  │ ├─ users             │  │ │ └─ Dashboard API   │  │ │           │ │  │
│  │ ├─ committees        │  │ │                    │  │ │ Inference:│ │  │
│  │ ├─ volunteers        │  │ │ Database:          │  │ │ ~5-10s    │ │  │
│  │ ├─ interventions     │  │ │ ├─ monthly_reports│  │ │           │ │  │
│  │ ├─ inventory         │  │ │ ├─ event_logs     │  │ │ Output:   │ │  │
│  │ └─ ... (8+ tables)   │  │ │ └─ ... (5+ tables)│  │ │ Risk Score│ │  │
│  │                      │  │ │                    │  │ │ 0.0-1.0   │ │  │
│  └──────────────┬────────┘  └────────────┬────────┘  │ └─────┬──────┘ │  │
│                 │                         │           │       │        │  │
│                 │                         │           │       ▼        │  │
│                 │                         │           │ ┌────────────┐ │  │
│                 │                         │           │ │ FastAPI   │ │  │
│                 │                         │           │ │ REST API: │ │  │
│                 │                         │           │ │ /status   │ │  │
│                 │                         │           │ │ /realtime │ │  │
│                 │                         │           │ │ /radar    │ │  │
│                 │                         │           │ │ /ws/crisis│ │  │
│                 │                         │           │ └────────────┘ │  │
│                 │                         │           │                │  │
│  ┌──────────────┴───────────────────────┴────────────┴──────────────┐ │  │
│  │                           RABBITMQ                               │ │  │
│  │                     Message Broker (AMQP)                        │ │  │
│  │                                                                   │ │  │
│  │  Queues:                                                          │ │  │
│  │  ├─ nexusaid.intervention.alerts (Core ← Disaster)              │ │  │
│  │  ├─ nexusaid.stock.alerts (Core → downstream)                   │ │  │
│  │  ├─ nexusaid.report.published (Core → Admin)                    │ │  │
│  │  ├─ nexusaid.disaster.alerts (Disaster → Core, Admin)           │ │  │
│  │  └─ [MISSING] nexusaid.cpr.complete (if CPR integrated)         │ │  │
│  │                                                                   │ │  │
│  └───────────────────────────────────────────────────────────────────┘ │  │
│                  │                                                       │  │
│  ┌───────────────┴───────────────────────────────────────────────────┐ │  │
│  │                         INFRASTRUCTURE                            │ │  │
│  │                                                                   │ │  │
│  │  ├─ Eureka (Service Discovery) port 8761                        │ │  │
│  │  ├─ Config Server (Centralized Config) port 8888                │ │  │
│  │  ├─ PostgreSQL (Shared DB) port 5432                            │ │  │
│  │  ├─ Redis (Gateway Cache/Rate Limiting) port 6379              │ │  │
│  │  └─ MinIO (Object Storage) ports 9000/9001                      │ │  │
│  │                                                                   │ │  │
│  └───────────────────────────────────────────────────────────────────┘ │  │
│                                                                         │  │
└─────────────────────────────────────────────────────────────────────────┘  │
                                                                              │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │        EXTERNAL/ISOLATED: CPR REAL-TIME ASSESSMENT APP              │ │
│  │                          (Optional Deployment)                      │ │
│  │                                                                       │ │
│  │  Mobile (Expo React Native)  ←→  FastAPI Backend:                  │ │
│  │  ├─ CprScreen                    ├─ /health (GET)                  │ │
│  │  ├─ Camera capture               ├─ / (GET)                        │ │
│  │  ├─ TTS feedback                 └─ /ws/cpr?lang=en/ar/fr (WS)     │ │
│  │  └─ Haptic alerts                                                  │ │
│  │                                   PoseEngine (MediaPipe):           │ │
│  │                                   ├─ 33-landmark pose model         │ │
│  │                                   ├─ Lite complexity (CPU)          │ │
│  │                                   └─ 96%+ detection accuracy        │ │
│  │                                                                       │ │
│  │                                   CPRBiomechanics:                  │ │
│  │                                   ├─ BPM calculation                │ │
│  │                                   ├─ Arm angle (180°=straight)      │ │
│  │                                   ├─ Depth % (wrist displacement)   │ │
│  │                                   └─ Recoil % (chest rebound)       │ │
│  │                                                                       │ │
│  │                                   RulesEngine:                      │ │
│  │                                   ├─ AHA/ERC/IFRC guidelines        │ │
│  │                                   ├─ Aligns with victim_type        │ │
│  │                                   ├─ Trilingual (AR/EN/FR)          │ │
│  │                                   └─ TTS message generation          │ │
│  │                                                                       │ │
│  │  ✗ NO RabbitMQ connection                                            │ │
│  │  ✗ NO Database persistence                                          │ │
│  │  ✗ NO Frontend integration (separate web/app)                      │ │
│  │  ✓ Fully independent system (can run standalone)                    │ │
│  │                                                                       │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │  ABANDONED/INCOMPLETE: YOLOV8 VICTIM CLASSIFICATION                  │ │
│  │                                                                       │ │
│  │  Status: ❌ CODE EXISTS BUT NEVER USED                               │ │
│  │                                                                       │ │
│  │  File: /assistant IA/nlp_data/train_cpr_classification.py            │ │
│  │  Model: YOLOv8s-cls (small classification variant)                   │ │
│  │  Classes: {adult, child, infant, pregnant}                           │ │
│  │  Training: Incomplete (Windows-specific error handling)              │ │
│  │                                                                       │ │
│  │  Workaround: victim_type = "adult"  # Hardcoded in server.py        │ │
│  │                                                                       │ │
│  │  Model artifacts: Multiple .pt files (unclear versioning)            │ │
│  │  ├─ best.pt @ medical_visual_cls/weights/                           │ │
│  │  ├─ last.pt @ medical_visual_cls/weights/                           │ │
│  │  └─ best.pt @ models_v4/                                            │ │
│  │                                                                       │ │
│  │  Integration: NONE (never called, inference never attempted)         │ │
│  │                                                                       │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. CV DATA FLOW DIAGRAMS

### 2A. Disaster Detection Pipeline (FULLY INTEGRATED)

```
REAL-TIME MONITORING FLOW:
═════════════════════════════════════════════════════════════════

[Frontend User Action]
    │
    ├─→ "Refresh Disaster Alerts" button click
    │
    ▼
[API Gateway] (port 8000)
    │
    ├─→ Route: POST /api/v1/realtime
    ├─→ Auth: JWT RS256 verification
    │
    ▼
[MS4: Disaster Detection] (FastAPI, port 8000)
    │
    ├─→ /api/v1/realtime endpoint
    │
    ▼
[GEEDataAcquisition] class
    │
    ├─→ get_date_range(hazard_type='wildfire')
    ├─→ ee.Geometry.Rectangle(TUNISIA_BBOX)
    │
    ├─→ FIRMS (Fire Information for Resource Management System)
    │   └─→ Active fire detection from MODIS/VIIRS
    │
    ├─→ HydroSAR (Flood detection)
    │   └─→ Sentinel-1 SAR analysis
    │
    ├─→ CHIRPS (Precipitation)
    │   └─→ Climate Hazards Group InfraRed Precipitation
    │
    ├─→ Sentinel-2 (Optical imagery)
    │   └─→ Multi-spectral analysis for damage assessment
    │
    ├─→ AlphaEarth (Advanced classification)
    │   └─→ Proprietary remote sensing features
    │
    ▼
[Feature Engineering]
    │
    ├─ Calculate NDVI (vegetation healthiness)
    │   └─ (NIR - RED) / (NIR + RED)
    │
    ├─ Calculate NDWI (water/flood extent)
    │   └─ (GREEN - NIR) / (GREEN + NIR)
    │
    ├─ Calculate LST (land surface temperature)
    │   └─ Thermal band analysis
    │
    ├─ Extract weather metrics
    │   ├─ Wind speed, direction
    │   ├─ Humidity
    │   ├─ Temperature
    │   └─ Precipitation rate
    │
    ├─ Topographic features
    │   ├─ Elevation (DEM)
    │   ├─ Slope
    │   └─ Distance to water bodies
    │
    ▼
[Feature Matrix (8 features)]
    │
    ├─ Feature 1: NDVI
    ├─ Feature 2: LST
    ├─ Feature 3: Precipitation 48h
    ├─ Feature 4: Wind speed
    ├─ Feature 5: Humidity
    ├─ Feature 6: Elevation
    ├─ Feature 7: Slope
    └─ Feature 8: Distance to water

    ▼
[DisasterRiskModel] (Random Forest)
    │
    ├─ Load: joblib.load('data/models/disaster_model.pkl')
    │
    ├─ Model: RandomForestClassifier(
    │   n_estimators=100,
    │   max_depth=3,
    │   random_state=42
    │ )
    │
    ├─ Predict: model.predict_proba(features)
    │
    ▼
[Risk Score & Classification]
    │
    ├─ Output: probability [0.0 → 1.0]
    │
    ├─ Thresholds:
    │   ├─ [0.0-0.2]  → MINIMAL
    │   ├─ [0.2-0.4]  → LOW
    │   ├─ [0.4-0.6]  → MODERATE
    │   ├─ [0.6-0.8]  → HIGH
    │   └─ [0.8-1.0]  → CRITICAL
    │
    ▼
[Response (REST API)]
    │
    ├─ {
    │   "risk_level": "HIGH",
    │   "score": 0.72,
    │   "hazard_type": "wildfire",
    │   "location": {lat: 36.8, lon: 10.2},
    │   "timestamp": "2026-04-15T10:30:00Z"
    │ }
    │
    ▼
[RabbitMQ Publishing]
    │
    ├─→ Queue: nexusaid.disaster.alerts
    ├─→ Message: {
    │     "type": "WILDFIRE",
    │     "risk_score": 0.72,
    │     "location": {...},
    │     "action_required": true
    │   }
    │
    ├─ → [CONSUMER 1: Core-Service]
    │     └─→ Creates Intervention (auto)
    │         ├─ Status: PROPOSED
    │         ├─ Type: EMERGENCY
    │         └─ Teams are notified
    │
    └─ → [CONSUMER 2: Admin-Service]
          └─→ Persists Event Log
              ├─ event_logs table (PostgreSQL)
              ├─ Event type: DISASTER_ALERT
              ├─ JSONB payload
              └─ Timestamp indexed for queries

    ▼
[Frontend Display (WebSocket/Polling)]
    │
    ├─→ Real-time update to dashboard
    ├─→ Map visualization: alert markers
    └─→ Crisis room notification

RESPONSE TIME: ~5-10 seconds (GEE fetch + inference)
DATA PERSISTENCE: ✅ event_logs table (PostgreSQL)
EVENT BUS: ✅ RabbitMQ nexusaid.disaster.alerts
INTEGRATION: ✅ MS1 + MS3 + Frontend
```

### 2B. CPR Real-Time Assessment Pipeline (ISOLATED)

```
MOBILE CPR TRAINING SESSION:
═════════════════════════════════════════════════════════════════

[Mobile App: CprScreen]
    │
    ├─→ Camera permission check
    ├─→ Connect to server: ws://192.168.100.8:8000/ws/cpr?lang=en
    │
    ▼
[Camera Frame Capture] (30 FPS phone camera)
    │
    ├─→ User performs CPR compressions
    ├─→ Every 3rd frame (10 FPS decimation): encode to JPEG
    │
    ▼
[WebSocket Binary Send]
    │
    ├─ Frame: 480×640 JPEG (binary data)
    ├─ Protocol: WebSocket /ws/cpr
    ├─ Compression: ~15KB per frame (quality=50)
    │
    ▼
[FastAPI Backend] (server.py, port 8000)
    │
    ├─→ async def cpr_websocket(websocket, lang='en')
    ├─→ await websocket.accept()
    │
    ▼
[Frame Decoding]
    │
    ├─→ cv2.imdecode(jpeg_bytes, cv2.IMREAD_COLOR)
    ├─→ Resize to 480p (if needed)
    │
    ▼
[PoseEngine] (MediaPipe Pose)
    │
    ├─→ Convert BGR → RGB
    ├─→ pose.process(frame_rgb)
    │
    ├─→ Returns 33 landmarks:
    │   ├─ Nose, ears, shoulders, elbows, wrists
    │   ├─ Hips, knees, ankles
    │   └─ +Other body parts
    │
    ├─→ Filter to CPR-relevant (14 landmarks):
    │   ├─ Shoulders (L/R)
    │   ├─ Elbows (L/R)
    │   ├─ Wrists (L/R)
    │   ├─ Hips (L/R)
    │   └─ Nose, ears (for reference)
    │
    ▼
[CPRBiomechanics] calculation
    │
    ├─ update_wrist(wrist_y, timestamp)
    │   └─ Track wrist Y-motion history (6s buffer at 8 FPS)
    │
    ├─ Detect compression peaks/troughs
    │   ├─ Peak: wrist at highest point (release)
    │   └─ Trough: wrist at lowest point (compression)
    │
    ├─ Calculate BPM
    │   ├─ Interval between peaks (seconds)
    │   ├─ BPM = 60 / interval
    │   ├─ Smooth with 20-frame average
    │   └─ Result: ~100-120 BPM (target: AHA 2020)
    │
    ├─ Calculate arm angle (elbow)
    │   ├─ Vector: shoulder → elbow → wrist
    │   ├─ dot_product / (mag1 × mag2) = cos(θ)
    │   ├─ θ = acos(...)
    │   └─ Result: ~160° (straight) or 120° (bent)
    │
    ├─ Calculate compression depth (as % of torso)
    │   ├─ Torso height = |hip_y - shoulder_y|
    │   ├─ Wrist displacement = |peak_y - trough_y|
    │   ├─ % = (wrist_disp / torso_height) × 100
    │   └─ Target: 85% of torso height
    │
    ├─ Calculate recoil %
    │   ├─ Recoil = return to baseline after compression
    │   └─ % = (recoil_distance / compression_distance) × 100
    │
    ├─ Calculate rhythm consistency (CV)
    │   ├─ Coefficient of variation of BPM
    │   └─ Lower = more consistent (better)
    │
    ▼
[RulesEngine] evaluation
    │
    ├─→ Load: rcp_rules.json (AHA/ERC/IFRC guidelines)
    │
    ├─→ Check each metric:
    │   │
    │   ├─ BPM check:
    │   │   ├─ If bpm < 100: "Too slow"
    │   │   ├─ If bpm > 120: "Too fast"
    │   │   └─ Else: "Good rate"
    │   │
    │   ├─ Arm angle check:
    │   │   ├─ If angle < 160°: "Elbows should be straight"
    │   │   └─ Else: "Good arm position"
    │   │
    │   ├─ Depth check:
    │   │   ├─ If depth < 80%: "Push deeper"
    │   │   ├─ If depth > 90%: "Slightly less depth"
    │   │   └─ Else: "Perfect depth"
    │   │
    │   └─ Rhythm check:
    │       ├─ If CV > 0.15: "Maintain steady rhythm"
    │       └─ Else: "Excellent rhythm"
    │
    ├─→ Determine status:
    │   ├─ Status: 'good' | 'warning' | 'critical'
    │   └─ Generate corrections[] array
    │
    ├─→ Generate TTS message:
    │   ├─ Select highest-severity correction
    │   ├─ Translate to language (AR/EN/FR)
    │   └─ Return single sentence (for voice)
    │
    ├─→ Generate positive feedback (if all good):
    │   ├─ "Perfect technique!"
    │   └─ Motivational message
    │
    ▼
[Response JSON]
    │
    ├─ {
    │   "status": "warning",
    │   "bpm": 118,
    │   "arm_angle": 158,
    │   "depth_pct": 87,
    │   "recoil_pct": 92,
    │   "shoulder_aligned": true,
    │   "rhythm_cv": 0.08,
    │   "compression_count": 42,
    │   "victim_type": "adult",
    │   "corrections": [
    │     {
    │       "text": "إبقاء ذراعيك مستقيمة",
    │       "severity": "HIGH",
    │       "key": "arm_angle"
    │     }
    │   ],
    │   "positive": "نقاط جيدة جداً!",
    │   "tts_message": "إبقاء ذراعيك مستقيمة",
    │   "frame_num": 45
    │ }
    │
    ▼
[Mobile UI Update]
    │
    ├─→ FeedbackOverlay
    │   ├─ Display metrics in large font
    │   ├─ Color: green (good), Yellow (warning), red (critical)
    │   └─ Visual feedback (arrows, indicators)
    │
    ├─→ TTS Feedback
    │   ├─ speak("إبقاء ذراعيك مستقيمة")
    │   └─ Play audio immediately (no need to look)
    │
    ├─→ Haptic Feedback
    │   ├─ If critical error: vibrate(pattern=ALERT)
    │   └─ If compression detected: subtle pulse
    │
    ├─→ Session Stats
    │   ├─ Total compressions
    │   ├─ Average BPM
    │   ├─ Session duration
    │   └─ Quality score (0-100)
    │
    ▼
[Loop] (Next frame after ~125ms)
    │
    ├─ Repeat from [Frame Capture]
    │
    ▼
[Session End]
    │
    ├─ User stops training
    ├─ WebSocket close
    │
    ├─ Final stats sent to mobile
    │   └─ {
    │       "session_duration": 245,
    │       "total_compressions": 308,
    │       "avg_bpm": 115,
    │       "quality_score": 88
    │     }
    │
    ✗ NO DATABASE STORAGE
    ✗ NO MESSAGE BUS PUBLISHING
    ✗ NO INTEGRATION WITH NEXUSAID
    ✓ SESSION DATA LOST (unless user manually saves)

RESPONSE LATENCY: ~100-125ms per frame (8 FPS effective)
DATA PERSISTENCE: ❌ NONE (only in-memory during session)
EVENT BUS: ❌ DISCONNECTED
INTEGRATION: ❌ ISOLATED
```

### 2C. YOLOv8 Victim Classification (ABANDONED)

```
EXPECTED WORKFLOW (IF IMPLEMENTED):
═════════════════════════════════════════════════════════════════

[CPR Backend: server.py]
    │
    ├─→ Receive camera frame
    │
    ▼
[YOLOv8 ClassificationModel.load()]
    │
    ├─→ model = YOLO('best.pt')
    │
    ▼
[Frame preprocessing]
    │
    ├─→ Resize to 640×640
    ├─→ Normalize [0, 1]
    │
    ▼
[Inference]
    │
    ├─→ results = model.predict(frame)
    │
    ├─→ Output softmax probabilities:
    │   ├─ adult: 0.78
    │   ├─ child: 0.18
    │   ├─ infant: 0.03
    │   └─ pregnant: 0.01
    │
    ▼
[Determine victim_type]
    │
    ├─→ victim_type = argmax([0.78, 0.18, 0.03, 0.01])
    ├─→ victim_type = 'adult'
    │
    ▼
[Pass to RulesEngine]
    │
    ├─→ rules.evaluate(
    │     bpm = 115,
    │     ...
    │     victim_type = 'adult'  ← From YOLO classification
    │   )
    │
    ▼
[Apply victim-specific guidelines]
    │
    ├─→ Compression rate:
    │   ├─ Adult: 100-120 BPM ✓
    │   ├─ Child: 100-120 BPM
    │   └─ Infant: 100-120 BPM (but different hand count)
    │
    ├─→ Compression depth:
    │   ├─ Adult: ≥ 2 inches (50 mm)
    │   ├─ Child: ≥ 2 inches (50 mm)
    │   └─ Infant: ≥ 1.5 inches (40 mm)
    │
    ├─→ Rescue breaths:
    │   ├─ Adult/Child: mouth-to-mouth
    │   └─ Infant: mouth-to-nose-and-mouth
    │
    ▼
[Feedback with victim-specific guidance]
    │
    └─ Triaged recommendations based on victim type


ACTUAL WORKFLOW (CURRENT):
═════════════════════════════════════════════════════════════════

[CPR Backend: server.py line ~72]
    │
    ├─→ victim_type = "adult"  # HARDCODED
    │
    ▼
[RulesEngine]
    │
    ├─→ rules.evaluate(
    │     bpm = 115,
    │     ...
    │     victim_type = 'adult'  ← NO CLASSIFICATION
    │   )
    │
    ▼
[Standard adult guidelines]
    │
    └─ Always assumes adult victim

STATUS: ❌ YOLO inference NEVER CALLED
REASON: Model never trained to completion / accuracy unknown
WORKAROUND: Manual hardcoding is acceptable for MVP
```

---

## 3. DATABASE INTEGRATION SCHEMA

### 3A. Current State: CV NOT in Database

```
PostgreSQL: nexusaiddb
═══════════════════════════════════════════════════════════════

[MS1: Core-Service Tables]
├─ users
├─ committees
├─ volunteers
├─ interventions
├─ inventory
├─ stock_movements
├─ complaints
├─ monthly_reports
└─ domains (social, youth, health, etc.)

[MS3: Admin-Service Tables]
├─ monthly_reports (validation/finalization)
├─ donation_receipts
├─ event_logs ← NEW (for CDC/event tracking)
└─ dashboard_configs

[MS4: Disaster Detection]
├─ [NO TABLES] — Uses joblib PKL file instead

❌ MISSING TABLES (if CPR integrated):
├─ cpr_sessions
├─ cpr_metrics
├─ cpr_frames (optional, heavy)
├─ victim_classifications (if YOLO enabled)
└─ cv_model_metadata


[Disaster Model: Stored as File]
├─ Path: /Distaster Detection/data/models/disaster_model.pkl
├─ Format: joblib pickle (Python-specific)
├─ Contains:
│  ├─ Trained RandomForest model
│  ├─ Feature names (8 features)
│  ├─ Feature importances
│  ├─ Training metrics
│  └─ Timestamp
│
├─ Why not in DB?
│  ├─ Binary blob (>50MB on scale)
│  ├─ Version control via Git (not ideal)
│  ├─ Python pickle not standardized (security risk)
│  └─ One-time training (no versioning needed for MVP)
```

### 3B. Recommended Schema: If CPR Integrated

```
-- CPR Sessions
CREATE TABLE cpr_sessions (
  id UUID PRIMARY KEY,
  volunteer_id UUID REFERENCES users(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_seconds INT,
  victim_type VARCHAR(20),  -- adult | child | infant | pregnant
  language VARCHAR(5),  -- 'en' | 'ar' | 'fr'
  quality_score INT,  -- 0-100
  total_compressions INT,
  session_metadata JSONB,  -- flexible fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  INDEX (volunteer_id, start_time)
);

-- CPR Metrics (per 5-second window)
CREATE TABLE cpr_metrics (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID REFERENCES cpr_sessions(id),
  window_start_seconds INT,
  avg_bpm DECIMAL(5,2),
  avg_depth_pct DECIMAL(5,2),
  avg_recoil_pct DECIMAL(5,2),
  arm_angle_left DECIMAL(5,2),
  arm_angle_right DECIMAL(5,2),
  rhythm_cv DECIMAL(5,3),  -- coefficient of variation
  shoulder_aligned BOOLEAN,
  compression_count INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  INDEX (session_id, window_start_seconds)
);

-- Victim Classification (if YOLO enabled)
CREATE TABLE victim_classifications (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID REFERENCES cpr_sessions(id),
  frame_number INT,
  predicted_type VARCHAR(20),  -- from YOLO
  confidence DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Query examples:
SELECT 
  volunteer_id,
  COUNT(*) as total_sessions,
  AVG(quality_score) as avg_quality,
  MAX(start_time) as last_training
FROM cpr_sessions
GROUP BY volunteer_id
ORDER BY avg_quality DESC;

-- Progress tracking:
SELECT 
  DATE(start_time) as training_date,
  COUNT(*) as sessions_today,
  AVG(quality_score) as daily_avg_quality
FROM cpr_sessions
WHERE volunteer_id = 'user-123'
GROUP BY DATE(start_time)
ORDER BY training_date DESC;
```

---

## 4. MODEL DEPLOYMENT STATUS

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CV MODELS: DEPLOYMENT MATRIX                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ✅ MEDIAIPE POSE (CPR Real-Time)                                  │
│  ├─ Location: Runtime download (no local storage needed)            │
│  ├─ Version: 33-landmark v1.0.8 (fixed)                            │
│  ├─ Size: ~40MB (downloaded on first use)                          │
│  ├─ Format: TFLite (.tflite) or ONNX                               │
│  ├─ Latency: ~50ms per frame (CPU)                                 │
│  ├─ Version Control: pip dependency (fixed version)                │
│  ├─ Deployment: Containerized (Dockerfile exists)                  │
│  ├─ GPU Support: Optional (CPU-first design)                       │
│  ├─ Serving: In-process (FastAPI + threading)                      │
│  └─ Status: PRODUCTION-READY ✓                                     │
│                                                                     │
│  ✅ RANDOM FOREST (Disaster Detection)                             │
│  ├─ Location: /Distaster Detection/data/models/disaster_model.pkl  │
│  ├─ Size: ~2.5MB (small, typical for RF)                           │
│  ├─ Format: joblib pickle (Python-specific)                        │
│  ├─ Latency: ~10ms per inference (CPU)                             │
│  ├─ Version Control: Git (manual versioning)                       │
│  ├─ Deployment: Containerized (Dockerfile exists)                  │
│  ├─ GPU Support: Not needed (CPU-only)                             │
│  ├─ Serving: In-process (FastAPI)                                  │
│  ├─ Versioning: Single model (no A/B testing)                      │
│  └─ Status: PRODUCTION-READY ✓                                     │
│                                                                     │
│  ❌ YOLOV8 (Victim Classification)                                 │
│  ├─ Location: Multiple locations (/medical_visual_cls/, /models_v4/)
│  ├─ Size: ~50-100MB (YOLOv8s is larger)                            │
│  ├─ Format: PyTorch .pt files                                       │
│  ├─ Latency: ~30ms per frame (CPU) / 5ms (GPU)                     │
│  ├─ Version Control: Git LFS (not configured)                       │
│  ├─ Deployment: ❌ NOT DEPLOYED (isolated code)                    │
│  ├─ GPU Support: Required for training, optional for inference     │
│  ├─ Serving: Not integrated (would need separate service)           │
│  ├─ Versioning: Unclear (multiple model artifacts)                 │
│  └─ Status: INCOMPLETE/ABANDONED ❌                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

MODEL SERVING ARCHITECTURE COMPARISON:
═════════════════════════════════════════════════════════════════

[CPR: In-Process Model Serving]
    Mobile → FastAPI Server
              ├─ PoseEngine (MediaPipe loaded at startup)
              └─ Inference in request handler

    Pros:
    ✓ Minimal latency
    ✓ Shared memory (no serialization)
    ✓ Simple deployment (single container)

    Cons:
    ✗ Cannot scale horizontally (single container)
    ✗ High CPU per container


[Disaster: In-Process Model Serving]
    Frontend → API Gateway → MS4 (FastAPI)
                              ├─ GEEDataAcquisition
                              ├─ DisasterRiskModel (loaded at startup)
                              └─ Inference in request handler

    Same as CPR (both use FastAPI)


[Recommended: Dedicated Model Serving (if scaling needed)]
    Mobile → FastAPI Server
             ├─ Cache compiled frames
             └─ Call: gRPC/REST to Model Server
                     ├─ TensorFlow Serving (or similar)
                     ├─ GPU batching
                     └─ Model versioning/hotswap

    Not currently implemented (not needed for scale of users)
```

---

## 5. SUMMARY: CV MATURITY LEVELS

```
┌──────────────────────────────────────────────────────────────────────┐
│                      CV COMPONENT MATURITY                           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  LEVEL 1: PROTOTYPE                                                  │
│  Status: Code + Model, but not integrated                            │
│  Examples: ❌ YOLOv8 Victim Classification                           │
│  Risk: Technical debt (unused code)                                  │
│                                                                      │
│  LEVEL 2: ISOLATED PRODUCTION                                        │
│  Status: Code + Model + Running Service, but not connected           │
│  Examples: ✅ CPR Real-Time Assessment                               │
│  Risk: Data silos (no integration with volunteer system)             │
│  Opportunity: Could unlock volunteer coaching history, achievements  │
│                                                                      │
│  LEVEL 3: INTEGRATED PRODUCTION                                      │
│  Status: Code + Model + Running Service + RabbitMQ + Database        │
│  Examples: ✅ Disaster Detection (RF Model)                          │
│  Status: Fully operational, scaled architecture ready                │
│  Opportunity: Can trigger cross-service workflows                    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

**Document Generated**: April 15, 2026  
**Audit Status**: ✅ COMPLETE
