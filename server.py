"""
CPR Training System — FastAPI WebSocket Server
================================================
Replaces the old Flask-based api_server.py.

Key design decisions:
  - One CPRPipeline per WebSocket connection (no global state, no global lock)
  - Option A two-message protocol: text (JSON metadata) then text (Base64 JPEG)
  - asyncio-native: no blocking calls in the WebSocket handler
  - Structured status codes: all error states map to specific enum values

Run with:
    uvicorn server:app --host 0.0.0.0 --port 8000 --workers 1
"""

import json
import traceback
import os
import base64
import logging
import jwt
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import py_eureka_client.eureka_client as eureka_client
import time

from cpr_vision_system.pipeline import CPRPipeline

# Structured audit logger (no frame data, no raw tokens)
audit_log = logging.getLogger("cpr.audit")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s %(message)s"
)

# Constants for security
MAX_PAYLOAD_SIZE = 1024 * 1024 * 2 # 2 MB max per frame

JWT_PUBLIC_KEY = os.environ.get("JWT_PUBLIC_KEY", "")

# ==============================================================================
# 🎮 DEMO SIMULATION MODE
# Set to True ONLY for controlled presentations. Production must be False.
# The CI/CD pipeline blocks deployment when this flag is True.
# ==============================================================================
SIMULATION_MODE = False

# ❌ Release gate: refuse to start if simulation mode is on in production
_ENV = os.environ.get("APP_ENV", "production")
if SIMULATION_MODE and _ENV == "production":
    raise RuntimeError(
        "[RELEASE GATE] SIMULATION_MODE=True is not allowed in a production environment. "
        "Set APP_ENV=development to override for demos."
    )

def _get_simulation_payload(start_time: float) -> dict:
    elapsed = time.time() - start_time
    # Baseline perfect CPR
    metrics = {
        "bpm": 110,
        "depth_torso_pct": 5.2,
        "recoil_quality": 95.0,
        "elbow_angle": 170.0,
        "compression_count": int(max(0, (elapsed - 8) * (110 / 60))),
        "torso_height": 0.35,
    }
    ui_commands = []
    
    if elapsed < 3.0:
        # Phase 1: Booting up / finding pose
        metrics.update({"compression_count": 0, "bpm": 0, "depth_torso_pct": 0})
    elif elapsed < 8.0:
        # Phase 2: User is in position but arms are bent (Trigger Voice: Tendez vos bras)
        metrics.update({"compression_count": 0, "bpm": 0, "depth_torso_pct": 0, "elbow_angle": 110.0})
        ui_commands.append({"id": "arms_bent", "severity": "HIGH", "text_ar": "مد ذراعيك بقوة", "text_en": "Straighten your arms", "text_fr": "Tendez vos bras", "value": 110.0})
    elif elapsed < 20.0:
        # Phase 3: Perfect CPR (Green banner)
        pass
    elif elapsed < 28.0:
        # Phase 4: User gets tired (Trigger Voices: Trop lent + Appuyez plus fort)
        metrics.update({"bpm": 85, "depth_torso_pct": 2.8})
        ui_commands.append({"id": "too_slow", "severity": "MEDIUM", "text_ar": "أسرع قليلاً", "text_en": "Push faster", "text_fr": "Trop lent, accélérez", "value": 85.0})
        ui_commands.append({"id": "too_shallow", "severity": "HIGH", "text_ar": "اضغط بقوة أكبر", "text_en": "Push harder", "text_fr": "Appuyez plus fort", "value": 2.8})
    else:
        # Phase 5: Recovers
        pass

    return {
        "status": "ACTIVE",
        "victim_type": "adult",
        "metrics": metrics,
        "ui_commands": ui_commands,
        "low_visibility_warning": False,
        "frame_annotated": None # Keeps the raw camera feed visible
    }

@asynccontextmanager
async def lifespan(app: FastAPI):
    eureka_server = os.environ.get("EUREKA_CLIENT_SERVICE_URL_DEFAULTZONE", "http://localhost:8761/eureka")
    # Initialize py_eureka_client dynamically on startup
    await eureka_client.init_async(eureka_server=eureka_server,
                                   app_name="cpr-assistant",
                                   instance_port=8000)
    yield
    await eureka_client.stop_async()

app = FastAPI(
    title="CPR Training Assistant API",
    version="3.0.0",
    description="Real-time CPR guidance via WebSocket binary stream.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)



@app.get("/health")
async def health_check():
    """Simple liveness probe for load balancers."""
    return {"status": "ok", "version": "3.0.0"}


@app.websocket("/ws/session/{session_id}")
async def cpr_session(ws: WebSocket, session_id: str):
    """
    CPR session WebSocket endpoint.

    Two-message protocol per frame (Option A):
      1. Client sends a JSON text frame:  {"ts": <capture_timestamp_ms>, "token": "<jwt>"}
      2. Client sends a text frame:       <Base64 JPEG String>
    Server responds with a JSON text frame containing CPR feedback.
    """
    await ws.accept()
    pipeline = CPRPipeline(session_id=session_id)
    is_authenticated = False
    
    # Session context — updated per-frame from mobile client
    session_context = {
        "victim_type": "ADULT",
        "rescuer_count": 1,
        "mode": "online",
    }

    try:
        while True:
            # ── Step 1: Receive JSON metadata text frame ──────────────────
            raw_meta = await ws.receive_text()
            try:
                meta = json.loads(raw_meta)
            except json.JSONDecodeError:
                meta = {}

            # JWT Authentication on the first frame
            if not is_authenticated:
                token = meta.get("token")
                if not token or not JWT_PUBLIC_KEY:
                    audit_log.warning("[AUTH] Rejected unauthenticated session: %s", session_id)
                    await ws.send_json({"status": "ERROR", "error": "UNAUTHORIZED"})
                    await ws.close(code=4003)
                    return
                try:
                    pub_key = JWT_PUBLIC_KEY.replace('\\n', '\n')
                    claims = jwt.decode(token, pub_key, algorithms=["RS256"])
                    is_authenticated = True
                    audit_log.info("[AUTH] Session authenticated: %s sub=%s", session_id, claims.get("sub", "?"))
                except Exception as e:
                    audit_log.warning("[AUTH] Invalid token for session %s: %s", session_id, str(e))
                    await ws.send_json({"status": "ERROR", "error": "INVALID_TOKEN"})
                    await ws.close(code=4003)
                    return

            # Update session context from client metadata (every frame)
            session_context["victim_type"] = meta.get("victim_type", session_context["victim_type"])
            session_context["rescuer_count"] = int(meta.get("rescuer_count", session_context["rescuer_count"]))
            session_context["mode"] = meta.get("mode", session_context["mode"])

            # ── Step 2: Receive Base64 text frame ─────────────────────
            raw_b64 = await ws.receive_text()
            
            if len(raw_b64) > MAX_PAYLOAD_SIZE:
                 await ws.send_json({"status": "ERROR", "error": "PAYLOAD_TOO_LARGE"})
                 continue

            try:
                raw_frame = base64.b64decode(raw_b64)
            except Exception:
                await ws.send_json({"status": "ERROR", "error": "MALFORMED_BASE64"})
                continue

            # ── Step 3: Process through the 6-layer pipeline ──────────────
            try:
                if SIMULATION_MODE:
                    # Setup simulation timer securely on first frame
                    if not hasattr(ws, "sim_start_time"):
                        ws.sim_start_time = time.time()
                    await pipeline.process(raw_frame, meta)
                    result = _get_simulation_payload(ws.sim_start_time)
                else:
                    # Pass full session context to pipeline so it can adapt rules
                    result = await pipeline.process(raw_frame, {**meta, **session_context})
            except Exception:
                result = {
                    "status": "ERROR",
                    "error_code": "PIPELINE_FAILURE",
                    "message": "An internal error occurred during frame processing. Try reconnecting.",
                    "detail": traceback.format_exc(limit=3),
                }

            # ── Step 4: Send JSON response back to client ─────────────────
            await ws.send_json(result)

    except WebSocketDisconnect:
        audit_log.info("[SESSION] Disconnected: %s frames_processed=%s", session_id, 'n/a')
        pipeline.cleanup()

    except Exception:
        audit_log.error("[SESSION] Unexpected error in session %s", session_id, exc_info=True)
        pipeline.cleanup()
        raise
