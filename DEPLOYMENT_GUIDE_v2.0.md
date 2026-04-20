# NexusAid MS4 Consolidation & C2 Integration - Deployment Guide

**Version**: 2.0 (Unified FastAPI)  
**Date**: 2025  
**Status**: Ready for testing

---

## 1. Breaking Changes & Migration Steps

### 1.1 Docker Compose Update

**Before** (Distaster Detection service ran 3 processes):
```yaml
distaster-detection:
  image: nexusaid/detection:latest
  ports:
    - "5000:5000"  # Flask-SocketIO
    - "8000:8000"  # FastAPI
```

**After** (Single unified FastAPI app):
```yaml
distaster-detection:
  image: nexusaid/detection:latest
  ports:
    - "8000:8000"  # Unified: ML Radar + C2 Crisis Room
```

### 1.2 Frontend WebSocket Connection

**Before** (Dual servers—unpredictable routing):
```typescript
// useCrisisSocket.ts
const WS_BASE = `ws://${window.location.host}/api/v1/ws`;
// Could route to Flask or FastAPI depending on gateway config
```

**After** (Single endpoint—guaranteed):
```typescript
// useCrisisSocket.ts
const WS_BASE = "ws://localhost:8000";  // ← Direct to unified FastAPI
// Or via API Gateway: `ws://${window.location.host}/api/v1/crisis`
```

### 1.3 API Gateway Spring Cloud Gateway Config

**Update** `api-gateway/src/main/resources/application.yml`:

```yaml
spring:
  cloud:
    gateway:
      routes:
        # ... existing routes ...
        
        # NEW: WebSocket routing for crisis command center
        - id: crisis-websocket
          uri: ws://distaster-detection:8000  # Unified FastAPI
          predicates:
            - Path=/api/v1/ws/**
          filters:
            - StripPrefix=2  # Remove /api/v1, leave /ws/...
            
        # REST routes (unchanged)
        - id: disaster-detection-api
          uri: http://distaster-detection:8000
          predicates:
            - Path=/api/v1/radar/**,/api/v1/crisis-room/**,/api/v1/teams/**,/api/v1/disasters/**
```

---

## 2. JWT Configuration Alignment

### 2.1 Core Service (MS1) - private.pem setup

**File**: `core-service/src/main/resources/application.yml`

```yaml
# BEFORE (HMAC—deprecated)
security:
  jwt:
    secret-key: 404E635266556A586E3272357538782F413F4428472B4B6250645367566B59

# AFTER (RSA)
security:
  jwt:
    private-key-path: classpath:private.pem
    algorithm: RS256
    expiration: 86400000  # 24 hours
```

**Action**: Ensure `core-service/src/main/resources/private.pem` exists with valid PKCS8 RSA private key.

```bash
# Generate locally for testing (if missing):
openssl genrsa -out private.key 2048
openssl pkcs8 -topk8 -inform PEM -outform PEM -in private.key -out private.pem -nocrypt
rm private.key
```

### 2.2 Admin Service (MS3) - public.pem setup

**File**: `admin-service/src/main/resources/application.yml`

```yaml
# BEFORE (HMAC—deprecated)
security:
  jwt:
    secret: 404E635266556A586E3272357538782F413F4428472B4B6250645367566B59

# AFTER (RSA)
security:
  jwt:
    public-key-path: classpath:public.pem
    algorithm: RS256
```

**Action**: Ensure `admin-service/src/main/resources/public.pem` exists with matching public key from core-service.

```bash
# Extract public from private.pem:
openssl rsa -in private.pem -pubout -out public.pem
# Copy to both core-service AND admin-service resources folder
```

### 2.3 MS4 (Distaster Detection) - .env configuration

**File**: `Distaster Detection/.env`

```bash
# NEW: RSA public key path (for JWT verification)
JWT_PUBLIC_KEY_PATH=/app/config/public.pem
JWT_ALGORITHM=RS256

# PostgreSQL configuration (for Phase 4)
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=nexusaid_detection
POSTGRES_USER=detection_user
POSTGRES_PASSWORD=secure_password_here

# RabbitMQ (for disaster alerts)
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,http://api-gateway:8888

# WebSocket push interval (seconds)
WS_PUSH_INTERVAL=60
```

**Action**: Mount `public.pem` from shared volume:

```yaml
# docker-compose.yml
distaster-detection:
  volumes:
    - ./config/public.pem:/app/config/public.pem:ro
```

---

## 3. Unified FastAPI Application Structure

### 3.1 Entry Point

**File**: `Distaster Detection/src/api.py`

```python
from fastapi import FastAPI
from src.crisis_room import CrisisRoomService
from src.teams import TeamMatchingService
from src.disaster_management import DisasterManagementService

app = FastAPI(title="NexusAid Disaster Detection & Command Center")

# Global singletons
crisis_service = CrisisRoomService()
team_service = TeamMatchingService()
disaster_service = DisasterManagementService(
    team_service=team_service,
    crisis_service=crisis_service
)
```

### 3.2 Updated Imports

Ensure requirements.txt includes:

```txt
fastapi==0.150.0
uvicorn[standard]==0.35.0
pydantic==2.0.0
python-jose[cryptography]==3.3.0
cryptography==43.0.0
# Remove: flask-socketio (Flask no longer used)
```

### 3.3 supervisord.conf After Update

```ini
[supervisord]
nodaemon=true
logfile=/dev/stdout
logfile_maxbytes=0
loglevel=info

# Background GEE satellite monitoring (unchanged)
[program:daemon]
command=python -m src.daemon
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
autorestart=true

# UNIFIED: All REST + WebSocket on single FastAPI app
[program:unified_fastapi]
command=uvicorn src.api:app --host 0.0.0.0 --port 8000 --reload
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
autorestart=true
priority=999
```

**⚠️ DEPRECATED**: `websocket_server.py` no longer launched.

---

## 4. Report Published Event Integration (MS3)

### 4.1 ReportSubmissionService.java Enhancement

**File**: `admin-service/src/main/java/.../ReportSubmissionService.java`

```java
@Service
@RequiredArgsConstructor
public class ReportSubmissionService {
    
    private final ReportInstanceRepository reportRepository;
    private final EventPublisher eventPublisher;  // ← NEW INJECTION
    
    @Transactional
    public ReportInstance submitReport(ReportSubmitRequest request, UUID submitterId) {
        // ... save report blocks ...
        
        ReportInstance finalizedReport = reportRepository.save(savedReport);
        
        // ← NEW: Publish CDC event to RabbitMQ
        eventPublisher.publishReportPublished(
            finalizedReport.getId(),
            finalizedReport.getTemplate().getCommitteeId(),
            finalizedReport.getTemplate().getTemplateType()
        );
        
        return finalizedReport;
    }
}
```

### 4.2 RabbitMQ Event Flow

```
MS3 ReportSubmissionService.submitReport()
  ↓
publishReportPublished{reportId, committeeId, reportType}
  ↓
RabbitMQ nexusaid.exchange (routing_key: report.published)
  ↓
MS1 EventConsumer @RabbitListener(queues="nexusaid.reports")
  ↓
Log + Aggregate in Dashboard
```

---

## 5. Frontend Integration Checklist

### 5.1 Crisis Room API Calls

| Endpoint | Method | Frontend Component | Payload |
|----------|--------|-------------------|---------|
| `/api/v1/crisis-room` | POST | RoomCreationModal | `{disaster_id, name, severity, lead_agency}` |
| `/api/v1/crisis-room/{id}/summary` | GET | CrisisRoomPage | ✓ returns `{room_metadata, situation_board}` |
| `/api/v1/teams/available` | GET | TeamDispatcher | ✓ returns `[{id, name, team_type.name, base_location_name, ...}]` |
| `/api/v1/teams/dispatch` | POST | TeamDispatcher | `{team_id, lat, lon}` |
| `/api/v1/crisis-room/{id}/messages` | POST | CrisisMessagingPanel | `{sender_id, sender_name, content, message_type}` |
| `/api/v1/disasters/{id}/logistics` | GET | LogisticsProcurement | ✓ requires JWT; returns `{total_cost_usd, procurement_plan[]}` |

### 5.2 WebSocket Connection

```typescript
// useCrisisSocket.ts
const WS_BASE = `ws://${window.location.host}`;  // Re-route to gateway if needed

export function useCrisisSocket(roomId: string) {
  const [messages, setMessages] = useState<CrisisMessage[]>([]);
  
  useEffect(() => {
    const ws = new WebSocket(`${WS_BASE}/ws/crisis/${roomId}`);
    
    ws.onmessage = (event) => {
      const { event: type, data } = JSON.parse(event.data);
      if (type === "NEW_MESSAGE") {
        setMessages(prev => [...prev, data]);
      }
    };
    
    return () => ws.close();
  }, [roomId]);
  
  return { messages };
}
```

---

## 6. Deployment Checklist

### Pre-deployment

- [ ] **JWT Keys**: Verify `core-service:private.pem` + `admin-service:public.pem` exist in classpath
- [ ] **Config Files**: Update `application.yml` in all 3 services (MS1, MS3, MS4)
- [ ] **Dependencies**: Run `mvn clean package` (Java) + `pip install -r requirements.txt` (Python)
- [ ] **Docker Image**: Build new image for Distaster Detection with updated supervisord config
- [ ] **Frontend**: Update `useCrisisSocket.ts` WebSocket URL if using API Gateway

### Deployment

```bash
# 1. Stop old containers
docker-compose down

# 2. Rebuild MS4 image (updated supervisord, no Flask-SocketIO)
docker build -t nexusaid/detection:2.0 ./Distaster\ Detection

# 3. Update compose file (remove port 5000)
# 4. Start services
docker-compose up -d

# 5. Verify
docker logs distaster-detection  # Should show ONE uvicorn process on :8000
curl http://localhost:8000/status  # Should return health check
```

### Post-deployment Validation

```bash
# 1. Test ML Radar endpoint
curl http://localhost:8000/api/v1/radar | jq .

# 2. Test Crisis Room REST
curl -X POST http://localhost:8000/api/v1/crisis-room \
  -H "Content-Type: application/json" \
  -d '{"disaster_id":"disaster_1","name":"Test Room","severity":"critical"}'

# 3. Test WebSocket connection
wscat -c ws://localhost:8000/ws/crisis/crisis_demo_01

# 4. Frontend: Open browser DevTools → Network
# Watch for WebSocket upgrade to /ws/crisis/{roomId}
# Should show 101 Switching Protocols (successful)
```

---

## 7. Diagram: Service Architecture (v2.0)

```
┌────────────────────────────────────────────────────────────────┐
│  FRONTEND (React TypeScript)                                   │
│  ├─ Dashboard: GET /api/v1/radar (cached blips)               │
│  ├─ CrisisRoomPage: REST /api/v1/crisis-room/{id}/summary    │
│  ├─ TeamDispatcher: GET /api/v1/teams/available (enriched)   │
│  └─ WebSocket: ws://localhost:8000/ws/crisis/{roomId}         │
└────────────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────────────────────────────┐
        │  API GATEWAY (Spring Cloud Gateway)       │
        │  Routes: /api/v1/* → backends             │
        │  WS: /api/v1/ws/* → distaster-detection   │
        └───────────────────────────────────────────┘
                ↙              ↙              ↙
    ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────────┐
    │ CORE-SERVICE     │  │ ADMIN-SERVICE    │  │ DISTASTER DETECTION (MS4)    │
    │ (Spring Boot)    │  │ (Spring Boot)    │  │ (Unified FastAPI v2.0)       │
    │                  │  │                  │  │                              │
    │ JwtService       │  │ JwtFilter        │  │ ┌─ /api/v1/radar             │
    │ (RS256 sign)     │  │ (RS256 verify)   │  │ ├─ /realtime (ML inference)  │
    │                  │  │                  │  │ ├─ /api/v1/crisis-room       │
    │ ╔════════════╗   │  │ EventConsumer    │  │ ├─ /api/v1/teams            │
    │ ║ RabbitMQ   ║   │  │ (volunteer,      │  │ ├─ /api/v1/disasters        │
    │ ║ Publisher  ║──→├→→┤  intervention    │  │ └─ /ws/crisis/{room_id}      │
    │ ╚════════════╝   │  │  events)         │  │    (NEW unified endpoint)    │
    │                  │  │                  │  │                              │
    │ PostgreSQL:      │  │ PostgreSQL:      │  │ Services (in-memory):        │
    │ - Volunteer      │  │ - Report         │  │ - CrisisRoomService         │
    │ - Intervention   │  │ - Donation       │  │ - TeamMatchingService       │
    │ - Committee      │  │ - Committee      │  │ - DisasterManagementService │
    │                  │  │ NEW:             │  │ - ResourceEstimationEngine  │
    │                  │  │ publishReport()  │  │                              │
    │                  │  │ → report.pub[1]  │  │ Background:                  │
    │                  │  │   event to RMQ   │  │ - daemon.py (GEE loop)      │
    │                  │  │                  │  │ (NO MORE Flask-SocketIO)    │
    └──────────────────┘  └──────────────────┘  └──────────────────────────────┘
            ↑                       ↑                              ↑
            │                       │                              │
            └───────────────────────┴──────────────────────────────┘
                         RabbitMQ Broker
                    (nexusaid.exchange, DLX)
```

---

## 8. Rollback Plan (If Issues)

If deployment fails, restore previous version:

```bash
# 1. Stop containers
docker-compose down

# 2. Restore old config files (from git)
git checkout admin-service/src/main/resources/application.yml
git checkout core-service/src/main/resources/application.yml
git checkout Distaster\ Detection/supervisord.conf

# 3. Rebuild old image (with Flask-SocketIO + api.py separate)
git checkout Distaster\ Detection/src/api.py
docker build -t nexusaid/detection:1.0 ./Distaster\ Detection

# 4. Update compose to reference old image + port 5000
# 5. Restart
docker-compose up -d
```

---

## 9. Ongoing Maintenance

### Monitoring

```bash
# Watch unified FastAPI logs
docker logs -f distaster-detection

# Check process count in container
docker exec distaster-detection ps aux | grep python
# Should show: 1 daemon.py + 1 uvicorn process (2 total)
```

### Performance Notes

- Unified FastAPI reduces context-switching vs dual Flask/Uvicorn
- ConnectionManager scales to 1000s of concurrent WebSocket connections
- In-memory CrisisRoomService suitable for ~100 active rooms; Phase 4 (PostgreSQL) enables scale-out

---

## 10. Next Phase: MS4 Persistence (Planned)

After this deployment stabilizes, implement Phase 4:

```python
# src/models.py (SQLAlchemy)
class CrisisRoom(Base):
    __tablename__ = "crisis_rooms"
    id = Column(String, primary_key=True)
    disaster_id = Column(String, nullable=False)
    name = Column(String, nullable=False)
    status = Column(String, default="ACTIVE")
    created_at = Column(DateTime, server_default=func.now())

class CrisisMessage(Base):
    __tablename__ = "crisis_messages"
    id = Column(String, primary_key=True)
    room_id = Column(String, ForeignKey("crisis_rooms.id"))
    sender_id = Column(String)
    content = Column(String)
    type = Column(String, default="TEXT")
    timestamp = Column(DateTime, server_default=func.now())

# Services: Refactor from {} dicts → database.query().all()
```

---

**Questions?** Contact DevOps team or see conversation summary at /memories/session/consolidation_progress.md

