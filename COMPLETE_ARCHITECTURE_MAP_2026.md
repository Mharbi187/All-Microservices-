# 🗂️ NexusAid Complete System Architecture Map
## Comprehensive Codebase Traversal & Analysis
**Date**: April 15, 2026 | **Status**: 100% Complete | **Services**: 10 | **Tech Stacks**: 3 (Java/Spring, Python/FastAPI, React/TypeScript)

---

# 🏗️ SYSTEM OVERVIEW

## Architecture Pattern
- **Primary**: Microservices with Spring Cloud infrastructure
- **Communication**: HTTP (REST), RabbitMQ (async events), WebSocket (real-time)
- **Security**: JWT RS256 (RSA asymmetric encryption)
- **Service Discovery**: Netflix Eureka
- **Configuration**: Spring Cloud Config Server
- **API Gateway**: Spring Cloud Gateway (reactive/WebFlux)
- **Message Broker**: RabbitMQ (AMQP)
- **Object Storage**: MinIO (S3-compatible)
- **Caching**: Redis (API Gateway rate limiting)
- **Database**: PostgreSQL (all services)
- **Frontend**: React 19 + TypeScript (Vite)

---

# 📦 SERVICES INVENTORY

## **SERVICE 1: EUREKA-SERVER (Service Discovery)**
- **Path**: `eureka-server/`
- **Purpose**: Netflix Eureka service registry for dynamic service discovery
- **Tech Stack**: Spring Boot 3.4.3, Java 21, Spring Cloud 2024.0.1
- **Port**: `8761`
- **Deployment**: Docker container
- **Key Dependencies**:
  - `spring-cloud-starter-netflix-eureka-server`
  - Spring Boot Actuator (health/info endpoints)
- **Configuration Files**: [eureka-server/src/main/resources/application.yml](eureka-server/src/main/resources/application.yml)
- **Features**:
  - Service registration/deregistration
  - Health checks via actuator
  - Self-preservation disabled (dev mode)
  - Eviction interval: 5 seconds
- **Role in Architecture**: Infrastructure - enables all services to register and discover each other
- **Startup Order**: **FIRST** (all services depend on it)

---

## **SERVICE 2: CONFIG-SERVER (Centralized Configuration)**
- **Path**: `config-server/`
- **Purpose**: Centralized Spring Cloud Config Server for dynamic property management
- **Tech Stack**: Spring Boot 3.4.3, Java 21, Spring Cloud Config 2024.0.1
- **Port**: `8888`
- **Deployment**: Docker container
- **Key Dependencies**:
  - `spring-cloud-config-server`
  - `spring-cloud-starter-netflix-eureka-client` (registers with Eureka)
  - Spring Boot Actuator
- **Configuration Files**: [config-server/src/main/resources/application.yml](config-server/src/main/resources/application.yml)
- **Features**:
  - Native properties loading from classpath (`search-locations: classpath:/config`)
  - Centralized property management
  - Client services import config via `spring.config.import: optional:configserver:http://config-server:8888`
- **Configuration Location**: `src/main/resources/config/` (properties stored here)
- **Role in Architecture**: Infrastructure - provides centralized configuration to all microservices
- **Startup Order**: **SECOND** (depends on Eureka)

---

## **SERVICE 3: CORE-SERVICE (MS1 - Social & Resource Management)**
- **Path**: `core-service/`
- **Purpose**: Module 1 - User profiles, hierarchical committees, volunteer management, inventory, interventions, and domain-specific services (Social, Youth, Health, Immigration, CPR, Emergency Response)
- **Tech Stack**: Spring Boot 3.4.3, Java 21, Spring Cloud Netflix Eureka, Spring Data JPA, PostgreSQL
- **Port**: `8080`
- **Database**: PostgreSQL (shared `nexusaiddb`)
- **Deployment**: Docker container
- **Key Files**:
  - [core-service/pom.xml](core-service/pom.xml) - Maven dependencies
  - [core-service/src/main/resources/application.yml](core-service/src/main/resources/application.yml)
  - [core-service/src/main/java/com/nexusaid/core/CoreServiceApplication.java](core-service/src/main/java/com/nexusaid/core/CoreServiceApplication.java)

### Dependencies
```xml
<!-- Core -->
Spring Boot Starter Web
Spring Data JPA
PostgreSQL Driver
JSON Web Tokens (JJWT 0.12.5)
Spring Security

<!-- Integration -->
Spring Cloud Starter Eureka Client
Spring Cloud Starter Config Client
Spring Cloud Starter AMQP (RabbitMQ)

<!-- Features -->
Cloudinary (image management)
Google ZXing (QR code generation)
Hypersistence Utils (JSON types)

<!-- Tools -->
OpenAPI/Swagger 2.8.4
Spring Boot Actuator
Lombok
```

### Controllers (API Endpoints)
All endpoints prefixed with `/api/v1/`

| Controller | Path | Methods | Purpose |
|-----------|------|---------|---------|
| **AuthController** | `/auth` | POST `/register`, `/login` | User authentication |
| **ProfileController** | `/profiles` | GET `/me`, PUT `/me/avatar-url`, GET `/me/visible-volunteers`, GET `/committees/{cId}/pending-volunteers` | Volunteer profiles |
| **CommitteeController** | `/management/committees` | CRUD operations | Committee management |
| **InterventionController** | `/interventions` | POST create, GET list, START/COMPLETE, participant management | Intervention coordination |
| **InventoryController** | `/inventory` | GET items, POST items, movement tracking (in/out), DELETE/UPDATE | Stock management |
| **StockAlertController** | `/inventory/alerts` | GET alerts, POST alert triggers | Stock shortage alerts |
| **ComplaintController** | `/profiles/complaints` | CRUD complaints | Complaint management |
| **MonthlyReportController** | `/reports` | POST monthly, GET by committee, validate/finalize | Report processing |
| **BadgeController** | `/badges` | GET badges, POST QR generation | Volunteer badges & QR codes |
| **TeamSyncController** | `/sync/teams` | GET teams | Team synchronization |
| **ManagementCompatibilityController** | `/management` | GET hierarchy, POST president, GET regional teams, POST emergency alerts | Management operations |
| **Domain Controllers** | `/sante`, `/social`, `/jeunesse`, `/vff`, `/immigration`, `/diffusion` | Domain-specific CRUD | Domain services |

### Security & JWT Implementation
- **JWT Algorithm**: RS256 (RSA asymmetric)
- **Key Management**: 
  - Private key: `classpath:private.pem` (CoreService signs tokens)
  - Public key: Derived from private key in [core-service/src/main/java/com/nexusaid/core/security/JwtService.java](core-service/src/main/java/com/nexusaid/core/security/JwtService.java)
- **Implementation Classes**:
  - [JwtService.java](core-service/src/main/java/com/nexusaid/core/security/JwtService.java) - Token generation & validation
  - [JwtAuthenticationFilter.java](core-service/src/main/java/com/nexusaid/core/security/JwtAuthenticationFilter.java) - Filter per request
  - [SecurityConfig.java](core-service/src/main/java/com/nexusaid/core/security/SecurityConfig.java) - Spring Security configuration
- **Token Claims**: 
  - `sub` (subject/email)
  - `userId` (UUID)
  - `userType` (VOLUNTEER, STAFF, etc.)
  - `roles` (List of role strings)
  - `exp` (expiration: 86400000ms = 24 hours)

### RabbitMQ Integration
- **Event Publishing**: [EventPublisher.java](core-service/src/main/java/com/nexusaid/core/messaging/EventPublisher.java)
- **Events Published**:
  - `intervention.created` → queue: `nexusaid.intervention.alerts`
  - `stock.alert` → queue: `nexusaid.stock.alerts`
  - `disaster.alert` → queue: `nexusaid.disaster.alerts`
  - `report.published` → queue: `nexusaid.report.published` (NEW: Phase 2 fix)
- **Event Consumption**: [EventConsumer.java](core-service/src/main/java/com/nexusaid/core/messaging/EventConsumer.java)
  - Listens to: `nexusaid.disaster.alerts` (from MS4)
  - Creates interventions automatically from disaster events
  - **Deduplication Window**: 30 minutes (prevents duplicate interventions)

### Database Entities
Core domain models in `src/main/java/com/nexusaid/core/entity/`
- User, Volunteer, Staff
- Committee (hierarchical)
- Intervention (with status tracking)
- InventoryItem, InventoryMovement
- MonthlyReport, EventLog
- Complaint, Badge
- Domain-specific entities (SocialCase, HealthRecord, JeunesseProgram, VffCase, Immigration, DiffusionCommunication)

### Configuration Environment Variables
```yaml
SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/nexusaiddb
SPRING_DATASOURCE_USERNAME: postgres
SPRING_DATASOURCE_PASSWORD: ${DB_PASSWORD}
SECURITY_JWT_SECRET_KEY: ${JWT_SECRET}
JWT_EXPIRATION: 86400000
SPRING_RABBITMQ_HOST: rabbitmq
SPRING_RABBITMQ_PORT: 5672
SPRING_RABBITMQ_USERNAME: ${RABBITMQ_USER:-nexusaid}
SPRING_RABBITMQ_PASSWORD: ${RABBITMQ_PASS}
CLOUDINARY_CLOUD_NAME: ${CLOUDINARY_CLOUD_NAME}
CLOUDINARY_API_KEY: ${CLOUDINARY_API_KEY}
CLOUDINARY_API_SECRET: ${CLOUDINARY_API_SECRET}
```

---

## **SERVICE 4: ADMIN-SERVICE (MS3 - Administration & Reporting)**
- **Path**: `admin-service/`
- **Purpose**: Module 3 - Administrative functions, report validation/finalization, donation management, templates, dashboard KPIs, event logging
- **Tech Stack**: Spring Boot 3.4.3, Java 21, Spring Cloud Netflix Eureka, Spring Data JPA, PostgreSQL
- **Port**: `8081` (dev profile)
- **Database**: PostgreSQL (`nexusaid_admin`)
- **Deployment**: Docker container
- **Key Files**:
  - [admin-service/pom.xml](admin-service/pom.xml)
  - [admin-service/src/main/resources/application.yml](admin-service/src/main/resources/application.yml)
  - [admin-service/src/main/resources/application-dev.yml](admin-service/src/main/resources/application-dev.yml)
  - [admin-service/src/main/java/com/nexusaid/admin/AdminServiceApplication.java](admin-service/src/main/java/com/nexusaid/admin/AdminServiceApplication.java)

### Dependencies (extends Core-Service)
```xml
<!-- All of Core-Service, plus: -->
MinIO (S3-compatible object storage) 8.5.9
OpenPDF (PDF generation) 1.3.36
Google ZXing (QR codes for donation receipts)
```

### Controllers (API Endpoints)
All endpoints prefixed with `/api/v1/admin/`

| Controller | Path | Methods | Purpose |
|-----------|------|---------|---------|
| **DashboardController** | `/dashboard` | GET `/kpis`, GET `/my-context` | KPI metrics & context |
| **ReportController** | `/reports` | POST `/submit`, GET list/by-id/by-status, POST validate/finalize, GET summary | Report lifecycle |
| **MonthlyReportController** | `/reports` | GET by committee, POST monthly, validate/finalize | Monthly report processing |
| **DonationController** | `/donations` | GET needs, POST monetary/in-kind, POST/GET receipts with QR | Donation management |
| **TemplateController** | `/templates` | CRUD template operations | Template management |
| **EventLogController** | `/events` | GET recent, GET by-type/by-source/by-entity, GET stats | Audit trail |

### RabbitMQ Integration
- **Event Consumption**: [EventConsumer.java](admin-service/src/main/java/com/nexusaid/admin/messaging/EventConsumer.java)
  - Listens to: 
    - `nexusaid.intervention.alerts` (from MS1) → Persists to EventLog
    - `nexusaid.stock.alerts` (from MS1) → Persists to EventLog
    - `nexusaid.disaster.alerts` (from MS4) → Auto-creates DRAFT MonthlyReport
  - Acts as audit trail & reporting bridge

### JWT Implementation
- Uses **public key verification** (validates tokens issued by core-service)
- [JwtService.java](admin-service/src/main/java/com/nexusaid/admin/security/JwtService.java) - Token verification
- [JwtAuthenticationFilter.java](admin-service/src/main/java/com/nexusaid/admin/security/JwtAuthenticationFilter.java) - Request filtering

### Configuration Environment Variables
```yaml
SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/nexusaid_admin
SPRING_DATASOURCE_USERNAME: postgres
SPRING_DATASOURCE_PASSWORD: ${DB_PASSWORD}
JWT_SECRET: ${JWT_SECRET}
CORE_SERVICE_URL: http://core-service:8080 (for HTTP calls)
MINIO_ENDPOINT: http://minio:9000
MINIO_ACCESS_KEY: minioadmin
MINIO_SECRET_KEY: ${MINIO_PASSWORD}
MINIO_BUCKET: admin-files
AES_MASTER_KEY: ${AES_KEY} (for sensitive data encryption)
```

---

## **SERVICE 5: API-GATEWAY (Spring Cloud Gateway)**
- **Path**: `api-gateway/`
- **Purpose**: Single entry point for all client requests; intelligent routing, rate limiting, CORS, request/response filtering
- **Tech Stack**: Spring Boot 3.4.3, Java 21, Spring Cloud Gateway (WebFlux/Reactive), Resilience4j
- **Port**: `8060`
- **Deployment**: Docker container
- **Key Files**:
  - [api-gateway/pom.xml](api-gateway/pom.xml)
  - [api-gateway/src/main/resources/application.yml](api-gateway/src/main/resources/application.yml)

### Dependencies
```xml
Spring Cloud Starter Gateway (reactive/non-blocking)
Spring Cloud Starter Netflix Eureka Client
Spring Cloud Starter Config Client
Circuit Breaker (Resilience4j)
Redis (for RequestRateLimiter)
OpenAPI Aggregator (WebFlux UI)
Actuator
```

### Route Definitions
Gateway routes requests to microservices using **Eureka service discovery** (dynamic) + **explicit routes** (precise control)

All routes preserve `/api/v1/` path prefix:

| Route ID | Service | Predicate Paths | Purpose |
|----------|---------|-----------------|---------|
| `core-auth` | core-service | `/api/v1/auth/**` | Authentication endpoints |
| `core-profiles` | core-service | `/api/v1/profiles/**` | Volunteer profiles |
| `core-committees` | core-service | `/api/v1/management/committees/**` | Committee hierarchy |
| `core-management` | core-service | `/api/v1/management/**` | Management endpoints |
| `core-inventory` | core-service | `/api/v1/inventory/**` | Stock management |
| `core-interventions` | core-service | `/api/v1/interventions/**` | Intervention coordination |
| `core-badges` | core-service | `/api/v1/badges/**` | Badge management |
| `core-complaints` | core-service | `/api/v1/profiles/complaints/**` | Complaint handling |
| `core-reports` | core-service | `/api/v1/reports/**` | Report endpoints |
| `core-jeunesse` | core-service | `/api/v1/jeunesse/**` | Youth programs |
| `core-sante` | core-service | `/api/v1/sante/**` | Health services |
| `core-social` | core-service | `/api/v1/social/**` | Social programs |
| `admin-*` | admin-service | `/api/v1/admin/**` | Admin functions |
| **Fallback** | Eureka Discovery | Any unmapped path | Dynamic service lookup |

### Features
- **Service Discovery**: Automatic registration from Eureka + manual routes
- **Rate Limiting**: Redis-backed RequestRateLimiter
- **Circuit Breaker**: Resilience4j fallback patterns
- **CORS**: Configurable allowed origins
- **Load Balancing**: Built-in via `lb://service-name` URI scheme
- **Health Checks**: Via `/actuator/health`

### Configuration Environment Variables
```yaml
SPRING_DATA_REDIS_HOST: redis
SPRING_DATA_REDIS_PORT: 6379
ALLOWED_ORIGINS: ${ALLOWED_ORIGINS} (CORS whitelist)
JWT_SECRET: ${JWT_SECRET} (for request validation filter if added)
```

---

## **SERVICE 6: REDIS (Caching Layer)**
- **Type**: Cache/Session store
- **Image**: `redis:7-alpine`
- **Port**: `6379`
- **Purpose**: Rate limiting store for API Gateway, session caching, cache layer
- **Deployment**: Docker container
- **Configuration**: Default Redis behavior, no persistence in docker-compose

---

## **SERVICE 7: RABBITMQ (Message Broker)**
- **Type**: Asynchronous event broker (AMQP 0.9.1)
- **Image**: `rabbitmq:3-management-alpine`
- **Ports**: 
  - `5672` (AMQP producer/consumer)
  - `15672` (Management UI - http://rabbitmq:15672)
- **Default Credentials**: `guest:guest`
- **Deployment**: Docker container with health checks

### Message Queues

| Queue Name | Source Service | Target Service | Event Type | Purpose |
|-----------|----------------|-----------------|-----------|---------|
| `nexusaid.intervention.alerts` | core-service | admin-service, core-service | Intervention created | Audit trail, assign to interventions |
| `nexusaid.stock.alerts` | core-service | admin-service | Stock level low | Notification, reporting |
| `nexusaid.disaster.alerts` | MS4 (disaster-detection) | core-service, admin-service | Disaster detected | Auto-create intervention + report |
| `nexusaid.report.published` | core-service | admin-service, MS4 | Report submitted | Publishing cascade |
| `nexusaid.dlq` | All services | - | Dead Letter Queue | Failed message handling |

### Queue Configuration
- **Publisher Confirm Type**: `correlated` (reliable delivery confirmation)
- **Publisher Returns**: `true` (return undeliverable messages)
- **Queue Durability**: Durable (survive broker restart)

---

## **SERVICE 8: POSTGRESQL (Database)**
- **Type**: Relational database
- **Image**: `postgres:15-alpine`
- **Port**: `5432`
- **Default User**: `postgres`
- **Databases**:
  - `nexusaiddb` (Core Service)
  - `nexusaid_admin` (Admin Service)
- **Deployment**: Docker container with persistent volume

### Initialization Scripts
Located in `postgres-init/`:
- `01-init-dbs.sql` - Database & user creation
- `02-data.sql` - Sample data seeding
- `03-roles-patch.sql` - Role updates
- `04-complete-schema.sql` - Full schema
- `05-event-logs.sql` - Event logging table

### Shared Tables
- All services use PostgreSQL for persistent data
- JVM services use Spring Data JPA (Hibernate)
- Python service (MS4) will use SQLAlchemy (Phase 4)

---

## **SERVICE 9: MINIO (Object Storage)**
- **Type**: S3-compatible object storage
- **Image**: `minio/minio:RELEASE.2024-01-18T22-51-28Z`
- **Ports**: 
  - `9000` (API)
  - `9001` (Web UI - http://minio:9001)
- **Default Credentials**: `minioadmin:minioadmin`
- **Deployment**: Docker container with persistent volume
- **Buckets**: 
  - `admin-files` (Admin service) - donation receipts, templates, reports
  - Custom buckets for media uploads

### Usage by Services
- **Admin Service**: Stores donation receipts (with QR), PDF reports, templates
- **Core Service**: Can store volunteer avatars, committee documents
- **Frontend**: Serves PDFs, media files

---

## **SERVICE 10: DISASTER-DETECTION (MS4 - Python-based Crisis Management)**
- **Path**: `Distaster Detection/`
- **Purpose**: Module 4 - Real-time disaster detection via satellite data, crisis command center, team dispatch, resource estimation
- **Tech Stack**: Python 3.x, FastAPI, Google Earth Engine, scikit-learn, XGBoost, pandas, numpy, Flask-SocketIO (deprecated), Uvicorn ASGI
- **Port**: `8000` (FastAPI/Uvicorn)
- **Deployment**: Docker container
- **Key Files**:
  - [Distaster Detection/requirements.txt](Distaster Detection/requirements.txt)
  - [Distaster Detection/supervisord.conf](Distaster Detection/supervisord.conf)
  - [Distaster Detection/src/api.py](Distaster Detection/src/api.py) - **NEW unified FastAPI app**
  - [Distaster Detection/src/daemon.py](Distaster Detection/src/daemon.py) - Production daemon

### Tech Stack Dependencies
```
Core ML/Data:
  earthengine-api==0.1.384 (Google Earth Engine satellite data)
  geemap==0.30.0 (GEE web interface)
  scikit-learn==1.4.0 (Random Forest for risk classification)
  xgboost==2.0.3 (Gradient boosting)
  pandas==2.2.0 (data manipulation)
  numpy==1.26.3 (numerical computing)
  geopandas==0.14.2 (spatial data)
  rasterio==1.3.9 (raster data I/O)
  imbalanced-learn==0.12.0 (SMOTE for class balancing)
  scipy==1.11.4 (scientific functions)

Geospatial Visualization:
  folium==0.15.1 (maps)
  streamlit==1.31.0 (interactive dashboard)
  streamlit-folium==0.15.1 (Streamlit + Folium)

Analysis:
  matplotlib==3.8.2, seaborn==0.13.1 (plotting)
  shap==0.44.1 (model explainability)

Integrations:
  fastapi==0.111.0 (web framework)
  uvicorn==0.30.0 (ASGI server)
  flask==3.0.0, flask-cors==4.0.0 (still present, Flask-SocketIO deprecated)
  pika==1.3.2 (RabbitMQ AMQP client)

Alerting:
  twilio==8.11.1 (SMS alerts)
  sendgrid==6.11.0 (email alerts)

Testing:
  pytest==8.0.0, pytest-cov==4.1.0
```

### Core Python Modules

| Module | Purpose | Key Classes/Functions |
|--------|---------|----------------------|
| **api.py** (370 lines) | Unified FastAPI REST + WebSocket backend | FastAPI app, verify_jwt, ConnectionManager, @app.get/@app.post|
| **daemon.py** | Production monitoring loop | Orchestrates all data sources, publishes alerts |
| **model.py** | ML disaster risk prediction | DisasterRiskModel, train, predict |
| **resource_estimation.py** | Emergency resource calculator | ResourceEstimationEngine, estimate_wildfire_resources, estimate_flood_resources |
| **crisis_room.py** | Virtual crisis command center | CrisisRoomService, Participant, CrisisMessage, ParticipantRole |
| **teams.py** | Disaster response team management | TeamMatchingService, ResponseTeam, TeamDeployment, Location |
| **disaster_management.py** | Coordinate response | DisasterManagementService (uses crisis_room + teams services) |
| **data_acquisition.py** | Satellite data fetching | GEEDataAcquisition (Google Earth Engine integration) |
| **satellite_monitor.py** | Satellite data streams | SatelliteMonitor (FIRMS, Sentinel-1, CHIRPS, NDVI) |
| **multi_source_monitor.py** | USGS + Weather APIs | SeismicDataMonitor, WeatherAPIMonitor |
| **messaging.py** | RabbitMQ integration | publish_disaster_alert, get_publish_metrics |
| **config.py** | Configuration constants | WILAYAT_COORDS, MODEL_CONFIG, RISK_THRESHOLDS |

### API Endpoints (FastAPI - Port 8000)

#### Status & Metrics
| Endpoint | Method | Auth | Response | Purpose |
|----------|--------|------|----------|---------|
| `/status` | GET | None | Health + RabbitMQ metrics | System health |

#### ML Radar (Cached)
| `/api/v1/radar` | GET | JWT | Cached ML radar blips | Recent predictions |

#### On-Demand Detection
| `/realtime` | GET | JWT | GEE data + model inference | Live satellite processing |

#### Crisis Command Center (REST)
| `/api/v1/crisis-room` | POST | JWT | Create crisis room | New incident |
| `/api/v1/crisis-room` | GET | JWT | List/summary | Active rooms |
| `/api/v1/crisis-room/{room_id}/messages` | POST | JWT | Broadcast message | Send messages |
| `/api/v1/crisis-room/{room_id}/participants` | POST | JWT | Add observer | Invite user |

#### Team Dispatch
| `/api/v1/teams/available` | GET | JWT | Team list + location | Team availability |
| `/api/v1/teams/dispatch` | POST | JWT | Deploy team | Team dispatch |
| `/api/v1/disasters/{id}/logistics` | GET | JWT | Resource estimation | Logistic needs |

#### Real-Time WebSocket
| `/ws/crisis/{room_id}` | WebSocket | JWT | Event stream | Live messaging |

**Event Types**: `NEW_MESSAGE|TEAM_DEPLOYED|SITUATION_UPDATE|DECISION_MADE`

### WebSocket Management
- **ConnectionManager**: Tracks active connections per room
- **Broadcast Method**: Handles disconnects gracefully
- **Event Format**: `{"event": "TYPE", "data": {...}}`

### Security & JWT
- **Algorithm**: RS256 (RSA asymmetric)
- **Public Key Loading** (in order of precedence):
  1. Environment: `JWT_PUBLIC_KEY` (inline PEM)
  2. Environment: `JWT_PUBLIC_KEY_FILE` (file path)
  3. Fallback: Hardcoded key (backward compatibility)
- **Token Verification**: All protected endpoints use `verify_jwt` dependency
- **Dependency**: `HTTPBearer` from FastAPI security

### Data Acquisition (GEE Sources)
1. **FIRMS** (Fire Information & Management System) - Active fires
2. **Sentinel-1** (SAR) - Flood detection
3. **CHIRPS** - Precipitation monitoring
4. **NDVI** - Vegetation health
5. **AlphaEarth Bands** (A00-A09) - Multi-spectral indices

### ML Model Capabilities
- **Training**: Random Forest + XGBoost ensemble with cross-validation
- **Feature Engineering**: 30+ GEE-derived features
- **Class Balancing**: SMOTE (oversampling) for imbalanced data
- **Prediction**: Risk scores (0-1) with thresholds
- **Metrics**: Accuracy, Precision, Recall, F1, ROC-AUC, Confusion Matrix
- **Model Persistence**: Joblib serialization to disk

### RabbitMQ Producer
- **Publishes to**: `nexusaid.disaster.alerts`
- **Event Payload**:
  ```json
  {
    "disaster_type": "WILDFIRE|FLOOD|EARTHQUAKE",
    "region": "Sousse|Sfax|...",
    "severity": 0.85,
    "timestamp": "2026-04-15T10:30:00Z",
    "coordinates": {"lat": 35.8, "lon": 10.6},
    "affected_population": 5000,
    "description": "..."
  }
  ```

### Process Management (supervisord.conf)
**Updated** (Phase 1 - Unified FastAPI):
```ini
[program:daemon]
command=python -m src.daemon
→ Continuous monitoring loop

[program:unified_fastapi]
command=uvicorn src.api:app --host 0.0.0.0 --port 8000 --reload
→ Single FastAPI entry point (replaces Flask-SocketIO)
```

**Removed**:
- Flask-SocketIO on port 5000 (deprecated)
- Original api.py (replaced by unified version)

### Crisis Room Service (In-Memory - Phase 4 Target: PostgreSQL)
```python
class CrisisRoomService:
    - crisis_rooms: Dict[str, CrisisRoom]  # {room_id: details}
    - create_crisis_room()
    - get_crisis_room(room_id)
    - add_participant(room_id, participant)
    - post_message(room_id, message)
    - close_room(room_id)
```

### Team Matching Service (In-Memory - Phase 4 Target: PostgreSQL)
```python
class TeamMatchingService:
    - teams: Dict[str, ResponseTeam]  # {team_id: details}
    - find_available_teams(location, disaster_type)
    - deploy_team(team_id, disaster_id, target_location)
    - get_team_status(team_id)
    - calculate_distance(loc1, loc2)
```

### Disaster Management Service (Orchestrator)
```python
class DisasterManagementService:
    - team_service: TeamMatchingService
    - crisis_service: CrisisRoomService
    - detect_disaster(gee_data, predictions)
    - create_incident_room()
    - dispatch_teams()
    - estimate_resources()
```

### Configuration Environment Variables
```bash
RABBITMQ_URL: amqp://${RABBITMQ_USER:-nexusaid}:${RABBITMQ_PASS}@rabbitmq:5672/
CORE_SERVICE_URL: http://core-service:8080
JWT_SECRET: ${JWT_SECRET} (for token verification, RS256)
WS_PUSH_INTERVAL: 60 (seconds)
```

### Health Check (Docker)
```bash
command: python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/status')"
interval: 15s
timeout: 10s
retries: 5
start_period: 30s
```

---

## **SERVICE 11: NEXUS-AID-FRONTEND (React Monolith)**
- **Path**: `nexus-aid-frontend/`
- **Purpose**: Single Page Application (SPA) for all user interfaces (volunteer, staff, admin)
- **Tech Stack**: React 19, TypeScript 5.9, Vite 7, Ant Design 5, React Router 7
- **Port**: `80` (Nginx reverse proxy, mapped to `5173` on host)
- **Deployment**: Docker container with Nginx
- **Build Tool**: Vite (fast ES build)

### Key Files
- [nexus-aid-frontend/package.json](nexus-aid-frontend/package.json)
- [nexus-aid-frontend/vite.config.ts](nexus-aid-frontend/vite.config.ts)
- [nexus-aid-frontend/tsconfig.json](nexus-aid-frontend/tsconfig.json)

### Core Dependencies

| Category | Packages | Version |
|----------|----------|---------|
| **UI Components** | antd (Ant Design), @ant-design/icons, @ant-design/pro-components | 5.29.3, 6.1.0, 2.8.10 |
| **Data Viz** | @ant-design/charts, echarts, three.js | 2.6.7, *, 0.183.1 |
| **Maps** | leaflet, react-leaflet | 1.9.4, 5.0.0 |
| **State** | zustand (client state) | 5.0.11 |
| **Routing** | react-router-dom | 7.13.1 |
| **HTTP** | axios | 1.13.5 |
| **Global State** | @tanstack/react-query | 5.90.21 |
| **Forms** | Form components from Ant Design | - |
| **Internationalization** | i18next, react-i18next | 25.8.13, 16.5.4 |
| **PDF/Export** | html2canvas, jspdf, qrcode.react | 1.4.1, 4.2.1, 4.2.0 |
| **Animation** | framer-motion | 12.34.3 |
| **Date Handling** | dayjs | 1.11.19 |
| **Drag & Drop** | @dnd-kit/* | 6.3.1+ |
| **Dev Tools** | TypeScript, ESLint, Tailwind CSS | 5.9.3, 9.39.1, 4.2.1 |

### Directory Structure
```
src/
├── pages/          # Route-level components
├── components/     # Reusable UI components
├── layouts/        # Layout components
├── services/       # API client layer (axios)
├── stores/         # Zustand state stores
├── types/          # TypeScript interfaces
├── hooks/          # Custom React hooks
├── utils/          # Utility functions
├── config/         # Configuration (API endpoints)
└── assets/         # Static images, fonts
```

### Features
- **SPA Architecture**: Client-side routing with React Router v7
- **State Management**: Zustand (lightweight alternative to Redux)
- **Data Fetching**: Axios + React Query (for caching & pagination)
- **UI Framework**: Ant Design (pro-grade components)
- **Real-time Maps**: Leaflet for disaster visualization
- **3D Visualization**: Three.js support (future use)
- **Report Export**: PDF generation (html2canvas + jsPDF)
- **Internationalization**: i18next (French/Arabic support ready)
- **Drag & Drop**: @dnd-kit for sortable lists

### API Integration
All requests go through API Gateway (`http://api-gateway:8060`):
- **Auth**: JWT tokens in Authorization header (`Bearer <token>`)
- **CORS**: Frontend service origins allowed (configured in env `ALLOWED_ORIGINS`)
- **Request Format**: JSON REST endpoints at `/api/v1/*`

### WebSocket Integration
Connects to MS4 (Disaster Detection) WebSocket for real-time crisis room updates:
- **URL**: `ws://disaster-detection:8000/ws/crisis/{room_id}`
- **Events**: NEW_MESSAGE, TEAM_DEPLOYED, SITUATION_UPDATE, DECISION_MADE
- **Broadcast**: All connected crisis room users receive events instantly

---

# 🔄 INTER-SERVICE COMMUNICATION MAP

## HTTP Direct Calls

| Source | Target | Endpoint | Purpose |
|--------|--------|----------|---------|
| Gateway | Core Service | `lb://core-service:8080` | User routing |
| Gateway |Admin Service | `lb://admin-service:8081` | Admin routing |
| Admin Service | Core Service | `http://core-service:8080/api/v1/...` | Fetch volunteer data, committees |
| Frontend (via Gateway) | All | `http://api-gateway:8060/api/v1/...` | All client requests |

## RabbitMQ Event Streams

### [core-service] → [admin-service]
1. **intervention.alerts** (queue: `nexusaid.intervention.alerts`)
   - Event: `{ type: "INTERVENTION_CREATED", interventionId, volunteerId, taskType }`
   - Purpose: Audit trail, notification

2. **stock.alerts** (queue: `nexusaid.stock.alerts`)
   - Event: `{ type: "STOCK_LOW", itemId, itemName, currentQuantity, threshold }`
   - Purpose: Low-stock notification

### [MS4 disaster-detection] → [core-service]
3. **disaster.alerts** (queue: `nexusaid.disaster.alerts`)
   - Event: `{ disasterType, region, severity, coordinates, affected_population, timestamp }`
   - **Processing**:
     - Core service consumes
     - Creates automatic Intervention (H1 Fix: deduplication window 30 min)
     - Looks up region-matched Committee (H2 Fix)
     - Populates required fields (H6 Fix)

### [MS4 disaster-detection] → [admin-service]
4. **disaster.alerts** (same queue)
   - **Processing**:
     - Admin service consumes
     - Auto-creates DRAFT MonthlyReport
     - Bridges crisis room (MS4) ↔ reporting (MS3)

### [core-service] → [MS4 disaster-detection]
5. **report.published** (queue: `nexusaid.report.published`) - **Phase 2 Fix**
   - Event: `{ reportId, committeeId, reportType, timestamp }`
   - Purpose: Cascade report publication to MS4 analytics

## WebSocket Real-Time Connections

| Connection | Protocol | Source | Target | Purpose |
|-----------|----------|--------|--------|---------|
| Crisis Room Chat | WebSocket | Frontend | MS4 `/ws/crisis/{room_id}` | Live messaging during incident |
| Dashboard Updates | WebSocket (future) | Frontend | MS4 | Live disaster status |

---

# 🔐 SECURITY ARCHITECTURE

## Authentication Flow (JWT RS256)

```
[CLIENT]
  ↓ POST /api/v1/auth/login { email, password }
[API Gateway] (passes through)
  ↓
[Core Service]
  ├─ Hash password, verify user
  ├─ Generate token:
  │  - Load private.pem (from classpath)
  │  - Sign with RS256
  │  - Include: sub, userId, userType, roles, exp
  ├─ Return token in response
  ↓
[FRONTEND stores token]
  ├─ localStorage: "auth_token"
  ├─ Attach Authorization header: "Bearer <token>"
  ↓
[Subsequent Requests]
  ├─ GET /api/v1/profiles/me
  ├─ Header: Authorization: Bearer <token>
  ↓
[API Gateway → Core Service] (if validating)
  ├─ Extract token
  ├─ Load public.pem (derived from private)
  ├─ Verify RS256 signature
  ├─ Check expiration
  ├─ Extract claims
  ↓
[MS4 (Python) verification]
  ├─ Extract token from Authorization header
  ├─ Load public key from environment/config
  ├─ Verify with PyJWT library (RS256)
  ├─ Extract userId, userType, roles
```

## Key Files

| Service | Component | File |
|---------|-----------|------|
| core-service | Signing | [JwtService.java](core-service/src/main/java/com/nexusaid/core/security/JwtService.java) |
| core-service | Filter | [JwtAuthenticationFilter.java](core-service/src/main/java/com/nexusaid/core/security/JwtAuthenticationFilter.java) |
| core-service | Config | [SecurityConfig.java](core-service/src/main/java/com/nexusaid/core/security/SecurityConfig.java) |
| admin-service | Verification | [JwtService.java](admin-service/src/main/java/com/nexusaid/admin/security/JwtService.java) |
| admin-service | Filter | [JwtAuthenticationFilter.java](admin-service/src/main/java/com/nexusaid/admin/security/JwtAuthenticationFilter.java) |
| MS4 | Verification | [api.py verify_jwt()](Distaster%20Detection/src/api.py) |

## RSA Key Management
- **Private Key**: `classpath:private.pem` (Core Service only)
- **Public Key**: Derived from private key in JwtService
- **Public Key Distribution**:
  - Admin Service: Loads from core-service via JwtService
  - MS4: Loads from environment variable `JWT_PUBLIC_KEY` or `JWT_PUBLIC_KEY_FILE`
  - **Current Status**: MS4 uses fallback hardcoded key (backward compat)
  - **TODO (Phase 3)**: Move to proper key file or env var

---

# 🗄️ DATABASE SCHEMA OVERVIEW

## Tables by Service

### Core Service (nexusaiddb)
**Users & Auth**:
- `user` - Base user class (SINGLE_TABLE inheritance)
- `volunteer` - Extends user
- `staff` - Extends user (future)

**Organizational**:
- `committee` - Hierarchical organizational units
- `committee_member` - Many-to-many with roles

**Volunteers & Interventions**:
- `intervention` - Tasks/activities with status
- `badge` - QR badges for volunteers
- `volunteer_badge` - Assignment

**Inventory**:
- `inventory_item` - Stock items by committee
- `inventory_movement` - In/out tracking
- `stock_alert` - Low-stock notifications

**Reporting**:
- `monthly_report` - Committee monthly reports
- `event_log` - Audit trail (shared with admin)

**Domain-Specific**:
- `social_case` - Social assistance cases
- `health_record` - Health information
- `jeunesse_program` - Youth program enrollment
- `vff_case` - Violence prevention cases
- `immigration_record` - Immigration status
- `diffusion_communication` - Communication history

### Admin Service (nexusaid_admin)
**Admin-specific**:
- `donation_need` - Active charitable needs
- `monetary_donation` - Cash donations
- `in_kind_donation` - Goods donations
- `donation_receipt` - Donation receipts with QR codes
- `template` - Configurable email/document templates
- `event_log` - Audit trail (mirrored from core)

### Shared
- `event_log` - Replicated to admin for audit trail

---

# 🚀 DEPLOYMENT ORCHESTRATION

## Docker Compose Services (docker-compose.yml)

**Startup Order**:
1. **Eureka Server** (8761)
2. **Config Server** (8888) - depends on Eureka
3. **PostgreSQL** (5432) - data layer
4. **RabbitMQ** (5672 AMQP, 15672 UI)
5. **MinIO** (9000 API, 9001 UI) - object storage
6. **Redis** (6379) - cache
7. **Core Service** (8080) - MS1
8. **Admin Service** (8081) - MS3
9. **Disaster Detection** (8000) - MS4
10. **API Gateway** (8060) - single entry
11. **Frontend** (80) - SPA

## Container Network
**Network**: `nexusaid-network` (Docker bridge)
- All services can reference each other by service name (e.g., `rabbitmq:5672`)
- Frontend connects to API Gateway (port 8060)
- Clients connect to Gateway (port 8060)

## Environment Variables (`.env` file required)
```bash
# Database
DB_PASSWORD=<secure-password>

# RabbitMQ
RABBITMQ_USER=nexusaid
RABBITMQ_PASS=<secure-password>

# JWT
JWT_SECRET=<RS256-secret-or-key-path>

# Cloud Services
CLOUDINARY_CLOUD_NAME=<cloudinary-account>
CLOUDINARY_API_KEY=<key>
CLOUDINARY_API_SECRET=<secret>

# MinIO
MINIO_PASSWORD=<password>

# Encryption
AES_KEY=<32-byte-hex-for-AES-256>

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

# ⚠️ TECHNICAL DEBT & KNOWN ISSUES

## Deferred to Future Phases

### Phase 4: PostgreSQL Persistence for MS4
**Current State**: In-memory dictionaries
- CrisisRoomService: `{}` in-memory store
- TeamMatchingService: `{}` in-memory store
- DisasterManagementService: Ephemeral state

**Impact**: Pod restart loses all active crisis rooms, team deployments
**Solution Ready**: SQLAlchemy models defined in session memory; awaits implementation

### Phase 3: JWT RSA Key File Alignment
**Current State**: 
- Core Service: ✅ Uses `classpath:private.pem`
- Admin Service: ✅ Uses public key derived from core
- MS4: ❌ Uses hardcoded fallback key

**Action**: Move MS4 public key to file or env var (see JWT_RSA_KEY_SETUP.md)

### Vision/AI Modules (Not Implemented)
**Audit Finding** (rapport_nexus_aid_corrige.tex):
- NO React Native mobile app
- NO YOLO/MediaPipe vision-based first aid assistant
- NO real-time CPR guidance with video
- These are **future roadmap items**, not current scope

**Current AI Capabilities**:
- Random Forest + XGBoost disaster risk classification (MS4)
- Jeunesse module recommendation engine (core-service)
- No computer vision integration

---

# 📊 API DOCUMENTATION

## Base URLs
- **Gateway**: `http://api-gateway:8060` (or `http://localhost:8060` from host)
- **Core Service Direct**: `http://core-service:8080`
- **Admin Service Direct**: `http://admin-service:8081`
- **MS4 Direct**: `http://disaster-detection:8000`

## Authentication Header
```
Authorization: Bearer <JWT_TOKEN>
```

## Common Status Codes
- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict
- `500 Internal Server Error`

---

# 📝 CONFIGURATION FILES REFERENCE

| File | Service | Purpose |
|------|---------|---------|
| [core-service/pom.xml](core-service/pom.xml) | Core | Maven dependencies |
| [core-service/application.yml](core-service/src/main/resources/application.yml) | Core | Server config, JWT, RabbitMQ |
| [admin-service/pom.xml](admin-service/pom.xml) | Admin | Maven dependencies |
| [admin-service/application.yml](admin-service/src/main/resources/application.yml) | Admin | Server config |
| [admin-service/application-dev.yml](admin-service/src/main/resources/application-dev.yml) | Admin | Dev profile overrides |
| [api-gateway/pom.xml](api-gateway/pom.xml) | Gateway | Maven dependencies |
| [api-gateway/application.yml](api-gateway/src/main/resources/application.yml) | Gateway | Routes, Eureka discovery |
| [eureka-server/pom.xml](eureka-server/pom.xml) | Eureka | Maven dependencies |
| [eureka-server/application.yml](eureka-server/src/main/resources/application.yml) | Eureka | Service registry config |
| [config-server/pom.xml](config-server/pom.xml) | Config | Maven dependencies |
| [config-server/application.yml](config-server/src/main/resources/application.yml) | Config | Config server setup |
| [Distaster Detection/requirements.txt](Distaster%20Detection/requirements.txt) | MS4 | Python dependencies |
| [Distaster Detection/supervisord.conf](Distaster%20Detection/supervisord.conf) | MS4 | Process management |
| [nexus-aid-frontend/package.json](nexus-aid-frontend/package.json) | Frontend | NPM dependencies |
| [nexus-aid-frontend/vite.config.ts](nexus-aid-frontend/vite.config.ts) | Frontend | Vite build config |
| [docker-compose.yml](docker-compose.yml) | All | Docker orchestration |
| [postgres-init/*.sql](postgres-init/) | PostgreSQL | Schema & initialization |

---

# 🔗 CRITICAL FILE LOCATIONS

## Entry Points
- [Core Service App](core-service/src/main/java/com/nexusaid/core/CoreServiceApplication.java)
- [Admin Service App](admin-service/src/main/java/com/nexusaid/admin/AdminServiceApplication.java)
- [Gateway App](api-gateway/src/main/java/com/nexusaid/gateway/ApiGatewayApplication.java)
- [Eureka App](eureka-server/src/main/java/com/nexusaid/eureka/EurekaServerApplication.java)
- [Config App](config-server/src/main/java/com/nexusaid/config/ConfigServerApplication.java)
- [MS4 API](Distaster%20Detection/src/api.py)
- [Frontend App](nexus-aid-frontend/src/main.tsx)

## Key Services
- **JWT**: [core-service/security/JwtService.java](core-service/src/main/java/com/nexusaid/core/security/JwtService.java)
- **Events**: [core-service/messaging/EventPublisher.java](core-service/src/main/java/com/nexusaid/core/messaging/EventPublisher.java)
- **RabbitMQ Consumers**: 
  - [core-service/messaging/EventConsumer.java](core-service/src/main/java/com/nexusaid/core/messaging/EventConsumer.java)
  - [admin-service/messaging/EventConsumer.java](admin-service/src/main/java/com/nexusaid/admin/messaging/EventConsumer.java)

---

# 📚 SUPPLEMENTARY DOCUMENTATION

| Document | Purpose | Location |
|----------|---------|----------|
| **Deployment Guide v2.0** | Step-by-step deployment | [DEPLOYMENT_GUIDE_v2.0.md](DEPLOYMENT_GUIDE_v2.0.md) |
| **JWT RSA Key Setup** | Key generation & distribution | [JWT_RSA_KEY_SETUP.md](JWT_RSA_KEY_SETUP.md) |
| **System Audit 2025** | Comprehensive audit findings | [SYSTEM_AUDIT_2025.md](SYSTEM_AUDIT_2025.md) |
| **Session Summary v2.0** | Technical completion details | [SESSION_SUMMARY_v2.0.md](SESSION_SUMMARY_v2.0.md) |
| **Documentation Index** | Navigation guide | [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md) |

---

# ✅ AUDIT STATUS

**Total Services Analyzed**: 10
- ✅ Eureka Server
- ✅ Config Server
- ✅ Core Service (MS1)
- ✅ Admin Service (MS3)
- ✅ API Gateway
- ✅ Disaster Detection (MS4)
- ✅ Frontend (React)
- ✅ PostgreSQL
- ✅ RabbitMQ
- ✅ Redis
- ✅ MinIO

**Total Controllers**: 25+
**Total API Endpoints**: 100+
**Total Files Analyzed**: 50+
**Total Dependencies**: 60+

**Mapping Status**: 🟢 COMPLETE

---

End of Complete Architecture Map
Generated: April 15, 2026
