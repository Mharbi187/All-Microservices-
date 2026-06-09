"""
Unified FastAPI backend for Tunisia Disaster Detection + Crisis Command Center

Exposes simple endpoints for:
- /status : health check
- /realtime : on-demand GEE fetch + model inference
- /api/v1/radar : cached ML radar blips
- /api/v1/crisis-room : REST endpoints for the War Room
- /api/v1/teams : Disaster response team management
- /api/v1/disasters : Disaster lifecycle management
- /ws/crisis/{room_id} : Real-time WebSocket chat and decisions
"""

import os
import json
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import numpy as np
import pandas as pd
import folium
from folium import plugins

from src.data_acquisition import GEEDataAcquisition
from src.feature_schema import from_sampled_row
from src.model import DisasterRiskModel

# NEW IMPORTS FOR C2 Integration
from src.crisis_room import CrisisRoomService, ParticipantRole, MessageType
from src.database import init_db
from src.teams import TeamMatchingService, Location
from src.disaster_management import DisasterManagementService
from src.resource_estimation import ResourceEstimationEngine

try:
    from src.messaging import get_publish_metrics
except ImportError:
    def get_publish_metrics():
        return {"rabbitmq_publish_success": -1, "rabbitmq_publish_failure": -1}

logger = logging.getLogger(__name__)

# -- RSA PUBLIC KEY (loaded from environment or config file) --
def get_public_key():
    """
    Load RS256 public key from:
    1. Environment variable JWT_PUBLIC_KEY
    2. Environment variable JWT_PUBLIC_KEY_FILE (file path)
    3. No fallback: fail fast to avoid insecure defaults
    """
    # Try environment variable (inline key)
    if "JWT_PUBLIC_KEY" in os.environ:
        return os.environ["JWT_PUBLIC_KEY"].replace("\\n", "\n")
    
    # Try environment variable (file path)
    if "JWT_PUBLIC_KEY_FILE" in os.environ:
        key_file = os.environ["JWT_PUBLIC_KEY_FILE"]
        try:
            with open(key_file, 'r') as f:
                return f.read()
        except FileNotFoundError:
            logger.warning(f"JWT_PUBLIC_KEY_FILE not found at {key_file}")
    
    raise RuntimeError("JWT public key is missing. Set JWT_PUBLIC_KEY or JWT_PUBLIC_KEY_FILE.")

JWT_ALGORITHM = "RS256"

# ── Security scheme ──────────────────────────────────────────
security_scheme = HTTPBearer(auto_error=False)


def verify_jwt(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
) -> dict:
    """
    JWT verification dependency.
    Validates tokens issued by MS1 core-service using RS256 public key.
    """
    if credentials is None:
        raise HTTPException(status_code=401, detail="Missing authorization token")
    token = credentials.credentials
    try:
        import jwt as pyjwt
        public_key = get_public_key()

        payload = pyjwt.decode(
            token,
            public_key,
            algorithms=[JWT_ALGORITHM],
            options={"verify_exp": True},
        )
        return payload
    except Exception as e:
        logger.warning("JWT validation failed: %s", e)
        raise HTTPException(status_code=401, detail="Invalid or expired token")


app = FastAPI(
    title="NexusAid Disaster Detection & Command Center API",
    description="Unified API for ML Radar Data and C2 Crisis Room Operations",
    version="2.0.0 (Merged FastAPI)",
)

# ── CORS: Parameterized (no wildcard) ───────────
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5174,http://localhost:3000"
).split(",")

ENABLE_APP_CORS = os.getenv("ENABLE_APP_CORS", "true").strip().lower() not in {"0", "false", "no"}

if ENABLE_APP_CORS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )
else:
    logger.info("FastAPI CORS middleware disabled (gateway-managed CORS mode).")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE_PATH = os.path.join(BASE_DIR, "data", "cache", "radar_cache.json")

# Initialize DB Tables
init_db()

# --- EUREKA REGISTRATION ---
@app.on_event("startup")
async def startup_event():
    try:
        import py_eureka_client.eureka_client as eureka_client
        eureka_url = os.environ.get("EUREKA_SERVER_URL", "http://eureka-server:8761/eureka")
        await eureka_client.init_async(
            eureka_server=eureka_url,
            app_name="disaster-detection",
            instance_port=8000,
            instance_host=os.getenv("HOSTNAME", "disaster-detection")
        )
        logger.info(f"Registered MS4 with Eureka at {eureka_url}")
    except Exception as e:
        logger.warning(f"Eureka Registration omitted or failed: {e}")

# -- GLOBAL C2 SERVICES (Singleton) --
crisis_service = CrisisRoomService()
team_service = TeamMatchingService()
disaster_service = DisasterManagementService(
    team_service=team_service,
    crisis_service=crisis_service
)
resource_engine = ResourceEstimationEngine()

# Pre-provision a demo Crisis Command Center for instant Frontend access
DEMO_ROOM_ID = "crisis_demo_01"
# Ensure we don't recreate it if it already exists
if not crisis_service.get_crisis_room(DEMO_ROOM_ID):
    crisis_service.create_crisis_room("disaster_demo_01", "Wildfire Jendouba Alpha", explicit_id=DEMO_ROOM_ID)
    crisis_service.activate_room(DEMO_ROOM_ID)

# --- WEBSOCKET MANAGER ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: str):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append(websocket)

    def disconnect(self, websocket: WebSocket, room_id: str):
        if room_id in self.active_connections and websocket in self.active_connections[room_id]:
            self.active_connections[room_id].remove(websocket)

    async def broadcast(self, room_id: str, message: dict):
        if room_id in self.active_connections:
            for connection in self.active_connections[room_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.warning(f"Failed to broadcast to {room_id}: {e}")

manager = ConnectionManager()

# --- MODELS ---
class SimulationRequest(BaseModel):
    wilaya_name: str = "Jendouba"
    disaster_type: str = "WILDFIRE"
    risk_score: float = 0.95
    lat: float = 36.9542
    lon: float = 8.7589

class FullSimulationRequest(BaseModel):
    scenario: str = "wildfire_jendouba"

class RiskPoint(BaseModel):
    lat: float
    lon: float
    overall_risk: float
    wildfire_risk: float | None = None
    flood_risk: float | None = None
    extreme_risk: float | None = None

class RealtimeResponse(BaseModel):
    count: int
    points: List[RiskPoint]

class DispatchRequest(BaseModel):
    team_id: str
    room_id: str | None = None
    lat: float
    lon: float

class MessageRequest(BaseModel):
    sender_id: str
    sender_name: str
    content: str
    message_type: str = "text"

class CreateRoomRequest(BaseModel):
    disaster_id: str
    name: str
    severity: str = "critical"
    lead_agency: str = "Tunisian Red Crescent"

class AddParticipantRequest(BaseModel):
    user_id: str
    name: str
    role: str = "coordinator"
    agency: str = "Red Crescent"
    email: str = ""
    phone: str = ""

# ═══════════════════════════════════════════════════════════════
#  SIMULATION SCENARIOS — Preset multi-wilaya disaster profiles
# ═══════════════════════════════════════════════════════════════
SIMULATION_SCENARIOS = {
    "wildfire_jendouba": {
        "name": "Wildfire Jendouba + Tabarka",
        "description": "Critical wildfire outbreak in the Northwest forests, extreme temperatures, strong winds spreading fire across Jendouba and Tabarka",
        "crisis_room_name": "Operation Foret Alpha",
        "disasters": [
            {
                "wilaya": "Jendouba",
                "lat": 36.5011, "lon": 8.7802,
                "risk_score": 0.95, "confidence_pct": 97.2,
                "disaster_type": "WILDFIRE",
                "is_high_risk": True,
                "satellite": {"precipitation_7d_mm": 0.0, "max_frp": 385.2, "ndvi_anomaly": -0.35},
                "weather": {"temperature": 47.0, "humidity": 12, "wind_speed": 82.0, "wind_direction": "NW", "conditions": "Clear sky — extreme heat"}
            },
            {
                "wilaya": "Le Kef",
                "lat": 36.1676, "lon": 8.7046,
                "risk_score": 0.52, "confidence_pct": 78.4,
                "disaster_type": "WILDFIRE",
                "is_high_risk": False,
                "satellite": {"precipitation_7d_mm": 2.1, "max_frp": 145.3, "ndvi_anomaly": -0.12},
                "weather": {"temperature": 41.0, "humidity": 22, "wind_speed": 45.0, "wind_direction": "W", "conditions": "Hot and dry"}
            },
        ],
        "messages": [
            {"sender": "AI Detection System", "role": "system", "content": "🔴 CRITICAL ALERT: Wildfire detected in Jendouba (FRP=385.2). Risk score 0.95. Satellite confirmation via FIRMS + Sentinel-2.", "type": "alert"},
            {"sender": "Col. Ahmed Ben Salah", "role": "commander", "content": "Crisis Room activated. All regional teams on DEFCON-2. Requesting immediate aerial reconnaissance of the Jendouba perimeter.", "type": "decision"},
            {"sender": "Dr. Fatma Trabelsi", "role": "coordinator", "content": "Medical teams Alpha and Bravo are mobilized. Setting up triage point at Jendouba General Hospital. ETA 25 minutes.", "type": "text"},
            {"sender": "Logistics Central", "role": "logistics", "content": "📦 Resource estimate: 12 fire trucks, 200 evacuee kits, 8 water tankers. Procurement initiated from Béja regional stock.", "type": "text"},
            {"sender": "AI Propagation Model", "role": "system", "content": "⚠️ PROPAGATION ALERT: Fire spread model projects NW advancement at 3.2 km/h toward Tabarka. Estimated arrival: 4 hours. Recommend preemptive evacuation of zones TB-03 through TB-07.", "type": "alert"},
            {"sender": "Capt. Khaled Mansouri", "role": "field_medic", "content": "Ground team confirms active fire fronts on ridgeline. Smoke column visible from 40km. Wind shift expected at 18:00.", "type": "text"},
        ]
    },
    "flood_nabeul": {
        "name": "Flash Floods Nabeul + Sousse",
        "description": "Severe flash flooding in the Sahel coast regions after 72h of extreme rainfall exceeding 180mm",
        "crisis_room_name": "Operation Sahel Shield",
        "disasters": [
            {
                "wilaya": "Nabeul",
                "lat": 36.4561, "lon": 10.7376,
                "risk_score": 0.92, "confidence_pct": 96.0,
                "disaster_type": "FLOOD",
                "is_high_risk": True,
                "satellite": {"precipitation_7d_mm": 187.3, "max_frp": 0.0, "water_change_pct": 0.45},
                "weather": {"temperature": 18.0, "humidity": 94, "wind_speed": 55.0, "wind_direction": "E", "conditions": "Torrential rain"}
            },
            {
                "wilaya": "Sousse",
                "lat": 35.8253, "lon": 10.6369,
                "risk_score": 0.85, "confidence_pct": 91.3,
                "disaster_type": "FLOOD",
                "is_high_risk": True,
                "satellite": {"precipitation_7d_mm": 156.8, "max_frp": 0.0, "water_change_pct": 0.38},
                "weather": {"temperature": 17.0, "humidity": 96, "wind_speed": 62.0, "wind_direction": "NE", "conditions": "Heavy storm"}
            },
            {
                "wilaya": "Monastir",
                "lat": 35.7779, "lon": 10.8261,
                "risk_score": 0.61, "confidence_pct": 82.5,
                "disaster_type": "FLOOD",
                "is_high_risk": False,
                "satellite": {"precipitation_7d_mm": 98.2, "max_frp": 0.0, "water_change_pct": 0.22},
                "weather": {"temperature": 19.0, "humidity": 89, "wind_speed": 45.0, "wind_direction": "E", "conditions": "Moderate rain"}
            },
        ],
        "messages": [
            {"sender": "AI Detection System", "role": "system", "content": "🔴 CRITICAL ALERT: Flash flood risk in Nabeul — 187mm recorded in 72h. CHIRPS + HydroSAR confirm 45% water extent increase.", "type": "alert"},
            {"sender": "Gov. Sami Bouzid", "role": "commander", "content": "Declaring State of Emergency for Nabeul Governorate. All civilian vehicles banned from coastal roads. National Guard deployed.", "type": "decision"},
            {"sender": "Dr. Leila Chaabane", "role": "coordinator", "content": "Evacuation shelters opened at 3 schools in Nabeul city. Capacity: 2,000 people. Red Crescent volunteers distributing blankets and food kits.", "type": "text"},
            {"sender": "Logistics Central", "role": "logistics", "content": "📦 Emergency supplies: 500 sandbag units, 3 water pumps, 150 emergency blankets dispatched from Tunis warehouse. ETA: 90 minutes.", "type": "text"},
            {"sender": "AI Hydrological Model", "role": "system", "content": "⚠️ RIVER LEVEL ALERT: Oued Miliane projected to exceed critical threshold (4.2m) by 02:00. Downstream communities at extreme risk.", "type": "alert"},
        ]
    },
    "earthquake_kasserine": {
        "name": "Earthquake Kasserine-Gafsa",
        "description": "Moderate earthquake (M5.2) epicenter near Kasserine with aftershock potential in the central-western region",
        "crisis_room_name": "Operation Terra Response",
        "disasters": [
            {
                "wilaya": "Kasserine",
                "lat": 35.1676, "lon": 8.8365,
                "risk_score": 0.91, "confidence_pct": 99.1,
                "disaster_type": "EARTHQUAKE",
                "is_high_risk": True,
                "satellite": {"precipitation_7d_mm": 5.0, "max_frp": 0.0, "seismic_magnitude": 5.2},
                "weather": {"temperature": 28.0, "humidity": 45, "wind_speed": 15.0, "wind_direction": "N", "conditions": "Clear"}
            },
            {
                "wilaya": "Gafsa",
                "lat": 34.4250, "lon": 8.7842,
                "risk_score": 0.72, "confidence_pct": 88.7,
                "disaster_type": "EARTHQUAKE",
                "is_high_risk": True,
                "satellite": {"precipitation_7d_mm": 3.0, "max_frp": 0.0, "seismic_magnitude": 3.8},
                "weather": {"temperature": 30.0, "humidity": 40, "wind_speed": 12.0, "wind_direction": "N", "conditions": "Clear"}
            },
            {
                "wilaya": "Sidi Bouzid",
                "lat": 35.0382, "lon": 9.4849,
                "risk_score": 0.48, "confidence_pct": 72.3,
                "disaster_type": "EARTHQUAKE",
                "is_high_risk": False,
                "satellite": {"precipitation_7d_mm": 4.0, "max_frp": 0.0, "seismic_magnitude": 2.1},
                "weather": {"temperature": 29.0, "humidity": 42, "wind_speed": 10.0, "wind_direction": "NW", "conditions": "Clear"}
            },
        ],
        "messages": [
            {"sender": "AI Seismic Monitor", "role": "system", "content": "🔴 SEISMIC ALERT: Magnitude 5.2 earthquake detected. Epicenter: 12km NE of Kasserine (35.17°N, 8.84°E). Depth: 10km. Aftershock probability: HIGH.", "type": "alert"},
            {"sender": "Gen. Nabil Touati", "role": "commander", "content": "Activating National Earthquake Response Protocol. Urban Search & Rescue teams deploying from Tunis and Sfax. Airspace restricted over Kasserine.", "type": "decision"},
            {"sender": "Dr. Amira Khelifi", "role": "field_medic", "content": "Field assessment: structural damage reported in old medina sector. 3 buildings partially collapsed. Setting up field hospital at the stadium.", "type": "text"},
            {"sender": "Logistics Central", "role": "logistics", "content": "📦 Emergency deployment: 10 rescue dog units, heavy lifting equipment, 500 tents, 2000 MREs. Convoy departing from Sfax depot.", "type": "text"},
        ]
    },
    "multi_crisis": {
        "name": "Multi-Region Crisis",
        "description": "Simultaneous wildfire in Jendouba + floods in Nabeul — tests multi-disaster coordination capacity",
        "crisis_room_name": "Operation Unified Shield",
        "disasters": [
            {
                "wilaya": "Jendouba",
                "lat": 36.5011, "lon": 8.7802,
                "risk_score": 0.93, "confidence_pct": 96.5,
                "disaster_type": "WILDFIRE",
                "is_high_risk": True,
                "satellite": {"precipitation_7d_mm": 0.0, "max_frp": 350.0, "ndvi_anomaly": -0.30},
                "weather": {"temperature": 46.0, "humidity": 14, "wind_speed": 75.0, "wind_direction": "NW", "conditions": "Extreme heat"}
            },
            {
                "wilaya": "Nabeul",
                "lat": 36.4561, "lon": 10.7376,
                "risk_score": 0.89, "confidence_pct": 93.8,
                "disaster_type": "FLOOD",
                "is_high_risk": True,
                "satellite": {"precipitation_7d_mm": 165.0, "max_frp": 0.0, "water_change_pct": 0.40},
                "weather": {"temperature": 19.0, "humidity": 92, "wind_speed": 50.0, "wind_direction": "E", "conditions": "Torrential rain"}
            },
            {
                "wilaya": "Tunis",
                "lat": 36.8065, "lon": 10.1815,
                "risk_score": 0.35, "confidence_pct": 65.0,
                "disaster_type": "FLOOD",
                "is_high_risk": False,
                "satellite": {"precipitation_7d_mm": 45.0, "max_frp": 0.0, "water_change_pct": 0.08},
                "weather": {"temperature": 22.0, "humidity": 75, "wind_speed": 30.0, "wind_direction": "NE", "conditions": "Overcast"}
            },
            {
                "wilaya": "Béja",
                "lat": 36.7256, "lon": 9.1816,
                "risk_score": 0.58, "confidence_pct": 80.0,
                "disaster_type": "WILDFIRE",
                "is_high_risk": False,
                "satellite": {"precipitation_7d_mm": 1.5, "max_frp": 180.0, "ndvi_anomaly": -0.18},
                "weather": {"temperature": 42.0, "humidity": 20, "wind_speed": 55.0, "wind_direction": "W", "conditions": "Hot and dry"}
            },
        ],
        "messages": [
            {"sender": "AI Detection System", "role": "system", "content": "🔴 MULTI-CRISIS ALERT: Simultaneous wildfire (Jendouba, FRP=350) and flash flood (Nabeul, 165mm/72h) detected. National disaster coordination required.", "type": "alert"},
            {"sender": "National Ops Director", "role": "commander", "content": "Activating dual-theater command. Northwest teams assigned to wildfire. East coast teams assigned to flood. Reserve units on standby in Tunis.", "type": "decision"},
            {"sender": "Red Crescent HQ", "role": "coordinator", "content": "All 24 regional committees notified. International assistance request prepared for IFRC. 1,200 volunteers mobilized across both theaters.", "type": "text"},
            {"sender": "AI Resource Optimizer", "role": "system", "content": "📊 RESOURCE ALLOCATION: Optimal split — 60% assets to Jendouba theater (higher casualty risk), 40% to Nabeul theater. Supply chain rerouting via Bizerte corridor.", "type": "alert"},
        ]
    }
}


# --- ML RADAR ROUTES ---
@app.get("/")
def root(request: Request) -> Any:
    payload = {
        "service": "NexusAid MS4 Disaster Detection",
        "status": "ok",
        "docs": "/docs",
        "radar": "/api/v1/radar",
        "websocket": "/ws/crisis/{room_id}",
    }
    if "text/html" in request.headers.get("accept", "").lower():
        return HTMLResponse(
            """
            <html>
              <head><title>NexusAid MS4</title></head>
              <body>
                <h2>NexusAid MS4 Disaster Detection</h2>
                <ul>
                  <li><a href="/docs">API Docs</a></li>
                  <li><a href="/api/v1/radar">Live Radar Cache</a></li>
                  <li>WebSocket: <code>/ws/crisis/{room_id}</code></li>
                </ul>
              </body>
            </html>
            """
        )
    return payload


@app.get("/status")
def status() -> Dict[str, Any]:
    radar_status = {"daemon_status": "unknown", "data_sources": {}}
    if os.path.exists(CACHE_PATH):
        try:
            with open(CACHE_PATH, 'r', encoding='utf-8') as f:
                cached = json.load(f)
            radar_status = {
                "daemon_status": cached.get("daemon_status", "unknown"),
                "data_sources": cached.get("data_sources", {}),
            }
        except Exception:
            radar_status = {"daemon_status": "unknown", "data_sources": {}}

    return {
        "status": "ok",
        "messaging": get_publish_metrics(),
        "version": "2.0 (unified FastAPI)",
        "radar": radar_status,
    }

@app.get("/api/v1/radar")
def get_cached_radar() -> Dict[str, Any]:
    if not os.path.exists(CACHE_PATH):
        return {"timestamp": None, "daemon_status": "initializing", "wilayats": {}, "cycle": 0}
    try:
        with open(CACHE_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data
    except Exception as e:
        logger.error(f"Failed to read radar cache: {e}")
        raise HTTPException(status_code=500, detail="Failed to read cache data.")

# ═══════════════════════════════════════════════════════════════
#  SIMULATION ENDPOINTS
# ═══════════════════════════════════════════════════════════════

# ─── Simulation Scenarios Data ─────────────────────────────────
DEFAULT_WILAYATS = {
    "Tunis": {"lat": 36.8065, "lon": 10.1815},
    "Ariana": {"lat": 36.8625, "lon": 10.1955},
    "Ben Arous": {"lat": 36.7531, "lon": 10.2228},
    "Manouba": {"lat": 36.8078, "lon": 10.0864},
    "Bizerte": {"lat": 37.2744, "lon": 9.8739},
    "Beja": {"lat": 36.7256, "lon": 9.1817},
    "Jendouba": {"lat": 36.5011, "lon": 8.7802},
    "Kef": {"lat": 36.1822, "lon": 8.7144},
    "Siliana": {"lat": 36.0842, "lon": 9.3708},
    "Zaghouan": {"lat": 36.4025, "lon": 10.1422},
    "Nabeul": {"lat": 36.4561, "lon": 10.7376},
    "Sousse": {"lat": 35.8256, "lon": 10.6369},
    "Monastir": {"lat": 35.7833, "lon": 10.8333},
    "Mahdia": {"lat": 35.5047, "lon": 11.0622},
    "Sfax": {"lat": 34.7400, "lon": 10.7600},
    "Kairouan": {"lat": 35.6781, "lon": 10.0963},
    "Kasserine": {"lat": 35.1675, "lon": 8.8365},
    "Sidi Bouzid": {"lat": 35.0382, "lon": 9.4849},
    "Gabes": {"lat": 33.8814, "lon": 10.0982},
    "Medenine": {"lat": 33.3549, "lon": 10.4933},
    "Tataouine": {"lat": 32.9297, "lon": 10.4518},
    "Gafsa": {"lat": 34.4250, "lon": 8.7842},
    "Tozeur": {"lat": 33.9197, "lon": 8.1336},
    "Kebili": {"lat": 33.7043, "lon": 8.9690}
}

def make_default_cache():
    cache = {
        "timestamp": datetime.utcnow().isoformat(),
        "daemon_status": "running",
        "cycle": 1,
        "wilayats": {}
    }
    for name, coords in DEFAULT_WILAYATS.items():
        cache["wilayats"][name] = {
            "coordinates": {"lat": coords["lat"], "lon": coords["lon"]},
            "risk_score": 0.12,
            "confidence_pct": 82.5,
            "is_high_risk": False,
            "disaster_type": "NONE",
            "satellite": {
                "precipitation_7d_mm": 5.0,
                "max_frp": 0.0
            },
            "weather": {
                "temperature": 24.0,
                "wind_speed": 12.0
            }
        }
    return cache

@app.get("/api/v1/simulation/scenarios")
def list_scenarios():
    """List all available preset simulation scenarios."""
    return {
        "scenarios": [
            {
                "id": k,
                "name": v["name"],
                "description": v["description"],
                "disaster_count": len(v["disasters"]),
                "high_risk_count": sum(1 for d in v["disasters"] if d.get("is_high_risk")),
            }
            for k, v in SIMULATION_SCENARIOS.items()
        ]
    }

@app.post("/api/v1/simulation/trigger")
def trigger_demo_disaster(req: SimulationRequest):
    """Bridges legacy manual single trigger request format to demo cache"""
    try:
        if os.path.exists(CACHE_PATH):
            with open(CACHE_PATH, 'r', encoding='utf-8') as f:
                data = json.load(f)
        else:
            data = make_default_cache()
        
        data["wilayats"][req.wilaya_name] = {
            "coordinates": {"lat": req.lat, "lon": req.lon},
            "risk_score": req.risk_score,
            "confidence_pct": 98.5,
            "is_high_risk": req.risk_score >= 0.7,
            "disaster_type": req.disaster_type,
            "satellite": {"precipitation_7d_mm": 0.0, "max_frp": 320.5},
            "weather": {"temperature": 45.0, "wind_speed": 75.0}
        }
        data["timestamp"] = datetime.utcnow().isoformat()
        data["daemon_status"] = "demo_active"

        os.makedirs(os.path.dirname(CACHE_PATH), exist_ok=True)
        with open(CACHE_PATH, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)

        return {"success": True, "message": f"Demo disaster triggered at {req.wilaya_name}", "data": data["wilayats"][req.wilaya_name]}
    except Exception as e:
        logger.error(f"Failed to trigger demo disaster: {e}")
        raise HTTPException(status_code=500, detail="Simulation failed")


@app.post("/api/v1/simulation/full")
def trigger_full_simulation(req: FullSimulationRequest):
    """
    🎯 FULL END-TO-END SIMULATION
    Orchestrates an entire disaster scenario across all microservices:
      Phase 1 → Injects multi-wilaya disaster data into the ML radar cache
      Phase 2 → Auto-creates an activated Crisis Room
      Phase 3 → Dispatches all available response teams
      Phase 4 → Populates crisis room with realistic messages
    The React frontend auto-picks up Phase 1 via its 5-second polling on /api/v1/radar.
    """
    scenario = SIMULATION_SCENARIOS.get(req.scenario)
    if not scenario:
        raise HTTPException(
            status_code=404,
            detail=f"Scenario '{req.scenario}' not found. Available: {list(SIMULATION_SCENARIOS.keys())}"
        )

    results = {
        "scenario": req.scenario,
        "scenario_name": scenario["name"],
        "phases": {}
    }

    # ────── PHASE 1: Inject disasters into radar cache ──────
    try:
        if os.path.exists(CACHE_PATH):
            with open(CACHE_PATH, 'r', encoding='utf-8') as f:
                data = json.load(f)
        else:
            data = {"timestamp": None, "daemon_status": "initializing", "wilayats": {}, "cycle": 0}

        for d in scenario["disasters"]:
            data["wilayats"][d["wilaya"]] = {
                "coordinates": {"lat": d["lat"], "lon": d["lon"]},
                "risk_score": d["risk_score"],
                "confidence_pct": d["confidence_pct"],
                "disaster_type": d["disaster_type"],
                "is_high_risk": d.get("is_high_risk", d["risk_score"] >= 0.7),
                "satellite": d.get("satellite", {}),
                "weather": d.get("weather", {}),
            }

        data["timestamp"] = datetime.utcnow().isoformat()
        data["daemon_status"] = "running"
        data["cycle"] = data.get("cycle", 0) + 1
        data["data_sources"] = {
            "firms_active": True,
            "chirps_lag_days": 0,
            "hydrosar_available": True,
            "sentinel2_latest": datetime.utcnow().strftime("%Y-%m-%d"),
        }

        os.makedirs(os.path.dirname(CACHE_PATH), exist_ok=True)
        with open(CACHE_PATH, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)

        results["phases"]["1_radar_injection"] = {
            "status": "success",
            "wilayats_injected": len(scenario["disasters"]),
            "high_risk_count": sum(1 for d in scenario["disasters"] if d.get("is_high_risk")),
        }
    except Exception as e:
        logger.error(f"Phase 1 failed: {e}")
        results["phases"]["1_radar_injection"] = {"status": "error", "error": str(e)}

    # ────── PHASE 2: Create & Activate Crisis Room ──────
    room_id = None
    disaster_id = f"disaster_{req.scenario}_{int(datetime.utcnow().timestamp())}"
    try:
        room = crisis_service.create_crisis_room(
            disaster_id,
            scenario["crisis_room_name"],
        )
        crisis_service.activate_room(room.id)
        room_id = room.id

        # Add key participants
        participants = [
            ("sim_commander_01", "Col. Ahmed Ben Salah", ParticipantRole.COMMANDER, "Tunisian Red Crescent"),
            ("sim_coordinator_01", "Dr. Fatma Trabelsi", ParticipantRole.COORDINATOR, "Ministry of Health"),
            ("sim_logistics_01", "Logistics Central", ParticipantRole.LOGISTICS, "Red Crescent Supply Chain"),
            ("sim_medic_01", "Dr. Amira Khelifi", ParticipantRole.FIELD_MEDIC, "Emergency Medical Services"),
        ]
        for uid, name, role, agency in participants:
            crisis_service.handle_participant_transaction(room.id, uid, name, role, agency)

        results["phases"]["2_crisis_room"] = {
            "status": "success",
            "room_id": room_id,
            "room_name": scenario["crisis_room_name"],
            "participants": len(participants),
        }
    except Exception as e:
        logger.error(f"Phase 2 failed: {e}")
        results["phases"]["2_crisis_room"] = {"status": "error", "error": str(e)}

    # ────── PHASE 3: Dispatch available teams ──────
    try:
        available_teams = team_service.get_available_teams()
        dispatched = []
        # Target = first high-risk disaster coordinates
        primary = next((d for d in scenario["disasters"] if d.get("is_high_risk")), scenario["disasters"][0])
        target_loc = Location(latitude=primary["lat"], longitude=primary["lon"])

        for team in available_teams[:5]:  # Dispatch up to 5 teams
            res = team_service.deploy_team(team.id, disaster_id, target_loc)
            if res["success"]:
                dispatched.append({"team_id": team.id, "team_name": team.name})

        results["phases"]["3_team_dispatch"] = {
            "status": "success",
            "teams_dispatched": len(dispatched),
            "teams": dispatched,
            "target": {"lat": primary["lat"], "lon": primary["lon"], "wilaya": primary["wilaya"]},
        }
    except Exception as e:
        logger.error(f"Phase 3 failed: {e}")
        results["phases"]["3_team_dispatch"] = {"status": "error", "error": str(e)}

    # ────── PHASE 4: Populate Crisis Room with messages ──────
    if room_id:
        try:
            role_map = {
                "system": MessageType.SYSTEM,
                "commander": MessageType.DECISION,
                "coordinator": MessageType.TEXT,
                "logistics": MessageType.TEXT,
                "field_medic": MessageType.TEXT,
            }
            msg_type_map = {
                "alert": MessageType.ALERT,
                "decision": MessageType.DECISION,
                "text": MessageType.TEXT,
                "system": MessageType.SYSTEM,
            }
            sent_count = 0
            for msg in scenario.get("messages", []):
                mtype = msg_type_map.get(msg.get("type", "text"), MessageType.TEXT)
                sender_id = f"sim_{msg['role']}_01"
                crisis_service.handle_msg_transaction(
                    room_id, sender_id, msg["sender"], msg["content"], message_type=mtype
                )
                sent_count += 1

            results["phases"]["4_messages"] = {
                "status": "success",
                "messages_sent": sent_count,
            }
        except Exception as e:
            logger.error(f"Phase 4 failed: {e}")
            results["phases"]["4_messages"] = {"status": "error", "error": str(e)}

    results["crisis_room_id"] = room_id
    results["success"] = all(
        p.get("status") == "success" for p in results["phases"].values()
    )

    return results


@app.post("/api/v1/simulation/reset")
def reset_simulation():
    """
    Clears the radar cache and resets it to a clean initial state.
    Use this between simulation runs during demonstrations.
    """
    try:
        clean_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "daemon_status": "running",
            "wilayats": {},
            "cycle": 0,
            "data_sources": {
                "firms_active": True,
                "chirps_lag_days": 0,
                "hydrosar_available": True,
                "sentinel2_latest": datetime.utcnow().strftime("%Y-%m-%d"),
            }
        }
        os.makedirs(os.path.dirname(CACHE_PATH), exist_ok=True)
        with open(CACHE_PATH, 'w', encoding='utf-8') as f:
            json.dump(clean_data, f, indent=2)

        return {"success": True, "message": "Radar cache reset to clean state. All wilaya data cleared."}
    except Exception as e:
        logger.error(f"Reset failed: {e}")
        raise HTTPException(status_code=500, detail="Reset failed")

@app.get("/realtime", response_model=RealtimeResponse)
def realtime() -> RealtimeResponse:
    gee = GEEDataAcquisition()
    model = DisasterRiskModel()
    try:
        model.load()
    except Exception:
        pass
    composite = gee.create_composite_image(include_sentinel=False)
    df = gee.sample_data(composite, num_pixels=1000, scale=1000)
    if df.empty:
        return RealtimeResponse(count=0, points=[])

    canonical_rows = []
    points_meta = []
    now = datetime.utcnow()
    for _, row in df.iterrows():
        geom = row.get(".geo")
        if not isinstance(geom, dict) or "coordinates" not in geom:
            continue
        coords = geom["coordinates"]
        lat = float(coords[1])
        lon = float(coords[0])
        canonical_rows.append(from_sampled_row(row, lat=lat, lon=lon, event_date=now))
        points_meta.append((lat, lon))

    if not canonical_rows:
        return RealtimeResponse(count=0, points=[])

    model_df = pd.DataFrame(canonical_rows)

    try:
        _, overall_risk = model.predict(model_df)
    except Exception:
        overall_risk = np.zeros(len(model_df))
    wildfire_risk = np.clip(model_df["max_frp"].to_numpy() / 350.0, 0, 1)
    flood_risk = np.clip(
        (model_df["precipitation_7d"].to_numpy() / 100.0) + np.maximum(model_df["water_change_pct"].to_numpy(), 0),
        0,
        1,
    )
    extreme_risk = np.clip(
        (model_df["wind_speed"].to_numpy() / 60.0) + (model_df["temperature"].to_numpy() / 50.0),
        0,
        1,
    )

    points = []
    for idx, (lat, lon) in enumerate(points_meta):
        points.append(
            RiskPoint(
                lat=lat, lon=lon,
                overall_risk=float(overall_risk[idx]),
                wildfire_risk=float(wildfire_risk[idx]),
                flood_risk=float(flood_risk[idx]),
                extreme_risk=float(extreme_risk[idx])
            )
        )
    return RealtimeResponse(count=len(points), points=points)

@app.get("/api/v1/disasters/monitor", response_class=HTMLResponse)
def get_disaster_monitor():
    """
    Builds a live Folium map from daemon cache.
    No direct GEE calls here: frontend must stay responsive even when GEE is slow.
    """
    if not os.path.exists(CACHE_PATH):
        return HTMLResponse(
            """
            <html>
              <body style="font-family: Arial, sans-serif; padding: 24px;">
                <h3>Radar Cache Initializing</h3>
                <p>The daemon has not produced the first cycle yet.</p>
                <p>Check <a href="/api/v1/radar">/api/v1/radar</a> or <a href="/status">/status</a>.</p>
              </body>
            </html>
            """
        )

    try:
        with open(CACHE_PATH, "r", encoding="utf-8") as f:
            radar = json.load(f)
    except Exception as e:
        logger.error(f"Failed to read monitor cache: {e}")
        return HTMLResponse(
            """
            <html>
              <body style="font-family: Arial, sans-serif; padding: 24px;">
                <h3>Radar Cache Unavailable</h3>
                <p>Unable to read daemon cache at the moment.</p>
                <p>Check <a href="/status">/status</a> for daemon health.</p>
              </body>
            </html>
            """,
            status_code=503,
        )

    wilayats = radar.get("wilayats", {})
    daemon_status = str(radar.get("daemon_status", "unknown")).lower()
    timestamp = radar.get("timestamp")

    # Base Map centered on Tunisia
    m = folium.Map(
        location=[34.0, 9.0], 
        zoom_start=7,
        tiles='cartodbdark_matter'
    )

    heat_data = []
    for wilaya_name, payload in wilayats.items():
        coords = payload.get("coordinates") or {}
        lat = coords.get("lat")
        lon = coords.get("lon")
        if lat is None or lon is None:
            continue

        risk = float(payload.get("risk_score", 0) or 0)
        confidence_pct = float(payload.get("confidence_pct", 0) or 0)
        disaster_type = str(payload.get("disaster_type", "NONE"))
        sat = payload.get("satellite", {}) or {}
        weather = payload.get("weather", {}) or {}

        if risk >= 0.7:
            color = "#ef4444"
        elif risk >= 0.35:
            color = "#f59e0b"
        else:
            color = "#22c55e"

        marker_radius = 6 + (risk * 10)
        popup_html = f"""
        <div style="font-family: Arial, sans-serif; min-width: 220px;">
          <h4 style="margin: 0 0 8px 0;">{wilaya_name}</h4>
          <div><b>Risk:</b> {risk:.2f}</div>
          <div><b>Confidence:</b> {confidence_pct:.1f}%</div>
          <div><b>Type:</b> {disaster_type}</div>
          <hr style="margin: 8px 0;" />
          <div><b>Rain 7d:</b> {float(sat.get("precipitation_7d_mm", 0) or 0):.1f} mm</div>
          <div><b>Max FRP:</b> {float(sat.get("max_frp", 0) or 0):.1f}</div>
          <div><b>Temp:</b> {float(weather.get("temperature", 0) or 0):.1f} °C</div>
          <div><b>Wind:</b> {float(weather.get("wind_speed", 0) or 0):.1f} km/h</div>
        </div>
        """

        folium.CircleMarker(
            location=[lat, lon],
            radius=marker_radius,
            color=color,
            fill=True,
            fill_color=color,
            fill_opacity=0.75,
            weight=2,
            popup=folium.Popup(popup_html, max_width=280),
            tooltip=f"{wilaya_name}: {risk:.2f} ({disaster_type})",
        ).add_to(m)

        heat_data.append([lat, lon, max(risk, 0.05)])

    if heat_data:
        plugins.HeatMap(heat_data, radius=20, blur=14, min_opacity=0.2).add_to(m)

    status_color = "#22c55e" if daemon_status == "running" else "#f59e0b" if daemon_status == "stale" else "#ef4444"
    status_label = daemon_status.upper()
    header_html = f"""
    <div style="
      position: fixed;
      top: 12px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      background: rgba(15, 23, 42, 0.92);
      color: #e2e8f0;
      border: 1px solid rgba(148, 163, 184, 0.25);
      border-radius: 12px;
      padding: 10px 14px;
      font-family: Arial, sans-serif;
      box-shadow: 0 8px 20px rgba(0,0,0,0.35);
    ">
      <span style="font-weight: 700;">MS4 Radar Monitor</span>
      <span style="margin: 0 8px; opacity: .55;">|</span>
      <span>Status: <b style="color: {status_color};">{status_label}</b></span>
      <span style="margin: 0 8px; opacity: .55;">|</span>
      <span>Updated: {timestamp or "N/A"}</span>
    </div>
    """
    m.get_root().html.add_child(folium.Element(header_html))

    # Custom CSS for Glassmorphism inside Folium
    custom_css = """
    <style>
        .leaflet-container { background: #0f172a !important; }
        .folium-map { border-radius: 20px; }
        .leaflet-control-zoom { border: none !important; margin: 20px !important; }
        .leaflet-control-zoom-in, .leaflet-control-zoom-out { 
            background: rgba(15, 23, 42, 0.8) !important; 
            color: white !important; 
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.1) !important;
            border-radius: 8px !important;
        }
    </style>
    """
    m.get_root().header.add_child(folium.Element(custom_css))

    return m._repr_html_()

# --- CRISIS ROOM REST ENDPOINTS ---

@app.post("/api/v1/crisis-room")
def create_crisis_room(req: CreateRoomRequest):
    room = crisis_service.create_crisis_room(req.disaster_id, req.name)
    crisis_service.activate_room(room.id)
    return room.to_dict()

@app.post("/api/v1/crisis-room/{room_id}/participants")
async def add_participant(room_id: str, req: AddParticipantRequest, background_tasks: BackgroundTasks):
    room = crisis_service.get_crisis_room(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    try:
        prole = ParticipantRole(req.role.lower())
    except ValueError:
        prole = ParticipantRole.volunteer
    
    try:
        room = crisis_service.handle_participant_transaction(room_id, req.user_id, req.name, prole, req.agency)
        if not room:
           raise HTTPException(status_code=404, detail="Room not found")
           
        # Envoyer un message système pour annoncer l'arrivée
        sys_msg = crisis_service.handle_msg_transaction(
            room_id=room_id,
            sender_id="system",
            sender_name="System",
            content=f"L'utilisateur {req.name} ({req.role}) a été ajouté à la salle de crise.",
            message_type=MessageType.SYSTEM
        )
        if sys_msg:
            await manager.broadcast(room_id, {
                "event": "NEW_MESSAGE",
                "data": sys_msg.to_dict()
            })
    except Exception as e:
        if str(e) == "DuplicateParticipant":
            raise HTTPException(status_code=400, detail="Ce volontaire est déjà membre de la salle de crise.")
        raise HTTPException(status_code=500, detail=str(e))
       
    # Trigger notifications in background
    try:
        from src.notification_service import notify_volunteer
        background_tasks.add_task(
            notify_volunteer,
            name=req.name,
            role=req.role,
            room_id=room_id,
            disaster_name=room.disaster_name,
            phone=req.phone,
            email=req.email
        )
    except Exception as e:
        logger.error(f"Failed to add notification task: {e}")
        
    return room.to_dict()

@app.get("/api/v1/volunteers/{user_id}/crisis-rooms")
def get_volunteer_crisis_rooms(user_id: str):
    try:
        rooms = crisis_service.get_rooms_by_participant(user_id)
        return rooms
    except Exception as e:
        logger.error(f"Error fetching rooms for volunteer {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class UpdateRoleRequest(BaseModel):
    role: str

@app.delete("/api/v1/crisis-room/{room_id}/participants/{user_id}")
async def remove_participant(room_id: str, user_id: str):
    success = crisis_service.remove_participant(room_id, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Participant or room not found")
    
    # Broadcast participant left
    await manager.broadcast(room_id, {
        "event": "PARTICIPANT_LEFT",
        "data": {"user_id": user_id}
    })
    
    return {"success": True}

@app.put("/api/v1/crisis-room/{room_id}/participants/{user_id}/role")
async def update_participant_role(room_id: str, user_id: str, req: UpdateRoleRequest):
    try:
        new_role = ParticipantRole(req.role.lower())
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid role")
        
    success = crisis_service.update_participant_role(room_id, user_id, new_role)
    if not success:
        raise HTTPException(status_code=404, detail="Participant or room not found")
        
    # Optionnel: Notifier le changement de rôle par websocket
    sys_msg = crisis_service.handle_msg_transaction(
        room_id=room_id,
        sender_id="system",
        sender_name="System",
        content=f"Le rôle d'un membre a été mis à jour vers {req.role}.",
        message_type=MessageType.SYSTEM
    )
    if sys_msg:
        await manager.broadcast(room_id, {
            "event": "NEW_MESSAGE",
            "data": sys_msg.to_dict()
        })
        
    return {"success": True}

@app.get("/api/v1/crisis-room/active")
def get_active_crisis_rooms():
    from src.database import SessionLocal
    from src.crisis_room import CrisisRoom, CrisisRoomStatus
    db = SessionLocal()
    try:
        rooms = db.query(CrisisRoom).filter(CrisisRoom.status == CrisisRoomStatus.ACTIVE).all()
        return [r.to_dict() for r in rooms]
    finally:
        db.close()

class CloseRoomRequest(BaseModel):
    closed_by: str
    final_report: str

@app.post("/api/v1/crisis-room/{room_id}/close")
def close_crisis_room(room_id: str, req: CloseRoomRequest):
    result = crisis_service.close_room(room_id, req.closed_by, req.final_report)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result

@app.get("/api/v1/crisis-room/{room_id}/summary")
def get_crisis_summary(room_id: str):
    summary = crisis_service.get_room_summary(room_id)
    if "error" in summary:
        raise HTTPException(status_code=404, detail=summary["error"])
    return summary

@app.post("/api/v1/crisis-room/{room_id}/messages")
async def send_message(room_id: str, req: MessageRequest):
    room = crisis_service.get_crisis_room(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    mtype = MessageType.TEXT
    if req.message_type == 'alert': mtype = MessageType.ALERT
    elif req.message_type == 'decision': mtype = MessageType.DECISION
    elif req.message_type == 'system': mtype = MessageType.SYSTEM

    msg = crisis_service.handle_msg_transaction(room_id, req.sender_id, req.sender_name, req.content, message_type=mtype)
    if not msg:
       raise HTTPException(status_code=404, detail="Failed to save message")
    
    # Broadcast to WebSocket clients
    await manager.broadcast(room_id, {
        "event": "NEW_MESSAGE",
        "data": msg.to_dict()
    })
    return msg.to_dict()

@app.post("/api/v1/crisis-room/{room_id}/cpr-metrics")
async def ingest_cpr_metrics(room_id: str, data: dict):
    """
    Ingest CPR metrics from the Computer Vision module and broadcast
    them in real-time to the Crisis Room WebSockets.
    """
    await manager.broadcast(room_id, {
        "event": "CPR_METRICS_UPDATE",
        "data": data
    })
    return {"success": True}

# --- TEAMS ENDPOINTS ---

@app.get("/api/v1/teams/available")
def get_available_teams():
    return [t.to_dict() for t in team_service.get_available_teams()]

@app.get("/api/v1/teams/all")
def get_all_teams():
    return [t.to_dict() for t in team_service.get_all_teams()]

@app.get("/api/v1/volunteers/search")
def search_volunteers(q: str = "", room_id: Optional[str] = None):
    from src.database import SessionLocal
    from sqlalchemy import text
    
    db = SessionLocal()
    results = []
    try:
        query_str = f"%{q.lower()}%"
        # Search directly in the MS1 users and volunteers tables (by name or email)
        sql = """
            SELECT u.id, u.full_name, u.email, dtm.specialty, dtm.team_type, c.name, u.phone
            FROM users u
            JOIN volunteers v ON u.id = v.id
            LEFT JOIN disaster_team_members dtm ON v.id = dtm.volunteer_id
            LEFT JOIN committees c ON v.committee_id = c.id
            WHERE (LOWER(u.full_name) LIKE :q OR LOWER(u.email) LIKE :q)
        """
        params = {"q": query_str}
        if room_id:
            sql += " AND CAST(u.id AS VARCHAR) NOT IN (SELECT user_id FROM room_participants WHERE room_id = :room_id)"
            params["room_id"] = room_id
            
        sql += " LIMIT 20"
        
        cursor = db.execute(text(sql), params)
        for r in cursor:
            # 0: id, 1: name, 2: email, 3: specialty, 4: team_type, 5: committee_name, 6: phone
            role = r[3] or "Bénévole"
            team_type = r[4]
            committee = r[5]
            
            # Construct a rich agency description (e.g. "Comité Régional de Tunis (RDRT)")
            agency_parts = []
            if committee:
                agency_parts.append(committee)
            if team_type:
                agency_parts.append(team_type)
            agency = " - ".join(agency_parts) if agency_parts else "Croissant Rouge"
            
            results.append({
                "id": str(r[0]),
                "name": r[1],
                "email": r[2] or "",
                "role": role,
                "agency": agency,
                "phone": r[6] or "21650000000"
            })
        return results
    finally:
        db.close()

@app.post("/api/v1/teams/dispatch")
async def dispatch_team(req: DispatchRequest):
    loc = Location(latitude=req.lat, longitude=req.lon)
    
    disaster_id = "active_disaster"
    if req.room_id:
        room = crisis_service.get_crisis_room(req.room_id)
        if room:
            disaster_id = room.disaster_id
            
    res = team_service.deploy_team(req.team_id, disaster_id, loc)
    if not res["success"]:
        raise HTTPException(status_code=400, detail=res["error"])
    
    # Broadcast deployment to all active rooms
    for room_id in manager.active_connections:
        await manager.broadcast(room_id, {
            "event": "TEAM_DEPLOYED",
            "data": res["team"]
        })
    return res

# --- LOGISTICS ENDPOINTS ---

@app.get("/api/v1/disasters/{disaster_id}/logistics")
def get_logistics_plan(
    disaster_id: str,
    affected_area_km2: float = 50,
    pop: int = 5000,
    user: dict = Depends(verify_jwt)
):
    """
    Dynamic resource estimation endpoint.
    Requires valid JWT token.
    """
    resources = resource_engine.estimate_wildfire_resources(
        affected_area_km2=affected_area_km2,
        affected_population=pop,
        fire_severity='high'
    )
    df_plan = resource_engine.generate_procurement_plan(resources)
    return {
        "total_cost_usd": resource_engine.calculate_total_cost(resources),
        "procurement_plan": df_plan.to_dict(orient="records")
    }

# --- WEBSOCKET ENDPOINT ---
@app.websocket("/ws/crisis/{room_id}")
async def crisis_websocket(websocket: WebSocket, room_id: str):
    """
    Unified WebSocket endpoint for crisis room real-time comms.
    Replaces separate Flask-SocketIO server.
    """
    await manager.connect(websocket, room_id)
    try:
        while True:
            # Receive client messages (typing indicators, read receipts, etc.)
            data = await websocket.receive_json()
            # Broadcast typing and read events to other participants
            if data.get("type") in ["TYPING_START", "TYPING_STOP", "READ_RECEIPT"]:
                await manager.broadcast(room_id, {
                    "event": data.get("type"),
                    "data": data
                })
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)
        logger.info(f"Client disconnected from room {room_id}")
