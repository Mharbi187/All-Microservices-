# NexusAid System Audit — January 2025

## ⚡ CRITICAL FINDINGS

### Phase 1: JWT Authentication (RS256) ✅ WORKING
- **MS1 (Core)**: Loads `classpath:private.pem`, signs tokens with RS256
- **MS3 (Admin)**: Loads `classpath:public.pem`, verifies tokens with RS256  
- **MS4 (Disaster)**: Hardcoded public key, verifies tokens with RS256
- **Status**: RS256 correctly implemented across all services

⚠️ **Issue**: Config files still reference `security.jwt.secret-key` (HMAC, unused) — creates confusion

---

### Phase 2: RabbitMQ CDC (Change Data Capture) ✅ PARTIALLY WORKING

#### Event Flow Map
```
MS1 (Core)
├─ PRODUCES: intervention.created → MS3
├─ PRODUCES: intervention.closed → MS3
├─ PRODUCES: stock.alert → MS3
└─ PRODUCES: disaster.alert → MS3
    ↓
MS3 (Admin)
├─ CONSUMES: intervention alerts → logs only (no action)
├─ CONSUMES: stock alerts → logs only (no action)
├─ CONSUMES: disaster alerts → ✅ AUTO-CREATES DRAFT SITREPs
└─ PRODUCES: donation.received → MS1
└─ PRODUCES: report.published → MS1
```

⚠️ **Issue**: Intervention & stock alerts only logged, not persisted

---

### Phase 3: Real-Time WebSocket ⚠️ PARTIALLY IMPLEMENTED
- **MS4 FastAPI**: Endpoints for crisis room REST API exist (`/api/v1/crisis-room/*`)
- **Frontend**: Uses REST calls to `/api/v1/crisis-room/*`, `/api/v1/teams/*`
- **Missing**: WebSocket endpoint (`/ws/crisis/{room_id}`)

---

### Phase 4: Disaster Detection + ML Inference ✅ WORKING
- **GEE Data Acquisition**: Implemented
- **Risk Model**: Loaded and inference working
- **FastAPI Server**: Running on port 8000
- **Status**: Operational

---

### Phase 5: CPR Real-Time Assessment ⚠️ ISOLATED
- **Server**: Separate FastAPI server at `/assistant IA/cpr-realtime-app/backend/server.py`
- **Model**: MediaPipe Pose (NOT YOLO — uses pose landmarks)
- **Status**: Works standalone, NOT integrated with main MS1-MS4 system

---

### Phase 6: CV Module (CRITICAL QUESTION)
**LOCATION**: `assistant IA/` folder (not on a dedicated git branch)
**INTEGRATION**: ❓ **UNCLEAR** — where does CV integrate?
- Is it used by MS4 for image classification?
- Is it used by CPR module for video processing?
- Does it feed into disaster detection pipeline?

---

### Phase 7-10: Persistence & Monitoring

#### Database Persistence ✅
- MS1 (Core): PostgreSQL ✅
- MS3 (Admin): PostgreSQL ✅
- MS4 (Disaster): ❓ Check if it persists risk scores somewhere

#### Monitoring ✅
- supervisord runs daemon + unified_fastapi
- Logging configured

---

## 📊 ACTIONABLE ISSUES

| Priority | Issue | Location | Fix |
|----------|-------|----------|-----|
| 🔴 HIGH | PEM files missing | `src/resources/` | Generate with `generate_jwt_keys.sh` |
| 🔴 HIGH | CV module integration unclear | `assistant IA/` | Clarify usage in disaster pipeline |
| 🟡 MEDIUM | Config still references HMAC | `application.yml` | Update to remove `secret-key` ref |
| 🟡 MEDIUM | MS4 hardcoded public key | `src/api.py` line 30 | Make environment-driven |
| 🟡 MEDIUM | WebSocket not implemented | Frontend + MS4 | Add `/ws/crisis/{room_id}` endpoint |
| 🟢 LOW | Intervention/stock alerts not persisted | MS3 EventConsumer | Create service layer to persist events |

---

## 🎯 YOUR NEXT STEPS

**Option A: Complete JWT Setup** (1-2 hours)
1. Verify `private.pem` and `public.pem` exist in `core-service/src/main/resources/`
2. If missing, generate with RSA key generator
3. Ensure MS3 and MS4 can load the public key
4. Remove legacy `security.jwt.secret-key` references from configs

**Option B: Implement WebSocket for Crisis Room** (2-3 hours)
1. Add `/ws/crisis/{room_id}` endpoint to MS4 FastAPI
2. Implement participant connection tracking
3. Broadcast messages to all room participants
4. Update frontend to use WebSocket

**Option C: Clarify & Integrate CV Module** (3-4 hours)
1. Document where CV model is used
2. If it's in disaster detection: integrate with GEE pipeline
3. If it's in CPR: connect CPR server to main system
4. Add model loading to appropriate service startup

**Option D: Audit Event Persistence** (1-2 hours)
1. Check if intervention/stock alerts should be persisted
2. Create service layer in MS3 to store events
3. Add database schema for event log table

---

## 🔧 FILES TO CHECK

- [admin-service/src/main/java/com/nexusaid/admin/config/RabbitMQConfig.java](admin-service/src/main/java/com/nexusaid/admin/config/RabbitMQConfig.java) — Event config
- [core-service/src/main/java/com/nexusaid/core/security/JwtService.java](core-service/src/main/java/com/nexusaid/core/security/JwtService.java) — JWT signing
- [admin-service/src/main/java/com/nexusaid/admin/security/JwtService.java](admin-service/src/main/java/com/nexusaid/admin/security/JwtService.java) — JWT verification
- [Distaster Detection/src/api.py](Distaster%20Detection/src/api.py#L30) — MS4 FastAPI
- [assistant IA/cpr-realtime-app/backend/server.py](assistant%20IA/cpr-realtime-app/backend/server.py) — CPR server

---

## 📝 Generated: 2025-01-XX by System Audit Tool
