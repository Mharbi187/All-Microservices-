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

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends, Request
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
        return os.environ["JWT_PUBLIC_KEY"]
    
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
def add_participant(room_id: str, req: AddParticipantRequest):
    room = crisis_service.get_crisis_room(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    prole = ParticipantRole.COORDINATOR
    if req.role.lower() == "commander": prole = ParticipantRole.COMMANDER
    elif req.role.lower() == "logistics": prole = ParticipantRole.LOGISTICS
    elif req.role.lower() == "field_medic": prole = ParticipantRole.FIELD_MEDIC
    
    room = crisis_service.handle_participant_transaction(room_id, req.user_id, req.name, prole, req.agency)
    if not room:
       raise HTTPException(status_code=404, detail="Room not found")
    return room.to_dict()

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

@app.post("/api/v1/teams/dispatch")
async def dispatch_team(req: DispatchRequest):
    loc = Location(latitude=req.lat, longitude=req.lon)
    res = team_service.deploy_team(req.team_id, "active_disaster", loc)
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
            # Echo back or process
            if data.get("type") == "READ_RECEIPT":
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)
        logger.info(f"Client disconnected from room {room_id}")
