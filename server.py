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
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import py_eureka_client.eureka_client as eureka_client

from cpr_vision_system.pipeline import CPRPipeline

app = FastAPI(
    title="CPR Training Assistant API",
    version="3.0.0",
    description="Real-time CPR guidance via WebSocket binary stream.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    eureka_server = os.environ.get("EUREKA_CLIENT_SERVICE_URL_DEFAULTZONE", "http://eureka-server:8761/eureka")
    # Initialize py_eureka_client dynamically on startup
    await eureka_client.init_async(eureka_server=eureka_server,
                                   app_name="cpr-assistant",
                                   instance_port=8000)

@app.on_event("shutdown")
async def shutdown_event():
    await eureka_client.stop_async()


@app.get("/health")
async def health_check():
    """Simple liveness probe for load balancers."""
    return {"status": "ok", "version": "3.0.0"}


@app.websocket("/ws/session/{session_id}")
async def cpr_session(ws: WebSocket, session_id: str):
    """
    CPR session WebSocket endpoint.

    Two-message protocol per frame (Option A):
      1. Client sends a JSON text frame:  {"ts": <capture_timestamp_ms>}
      2. Client sends a text frame:       <Base64 JPEG String>
    Server responds with a JSON text frame containing CPR feedback.

    Each connection owns its own CPRPipeline instance.
    No shared global state. No global locks.
    """
    await ws.accept()
    pipeline = CPRPipeline(session_id=session_id)

    try:
        while True:
            # ── Step 1: Receive JSON metadata text frame ──────────────────
            raw_meta = await ws.receive_text()
            try:
                meta = json.loads(raw_meta)
            except json.JSONDecodeError:
                meta = {}

            import base64
            # ── Step 2: Receive Base64 text frame ─────────────────────
            raw_b64 = await ws.receive_text()
            raw_frame = base64.b64decode(raw_b64)

            # ── Step 3: Process through the 6-layer pipeline ──────────────
            try:
                result = await pipeline.process(raw_frame, meta)
            except Exception:
                result = {
                    "status": "ERROR",
                    "detail": traceback.format_exc(limit=3),
                }

            # ── Step 4: Send JSON response back to client ─────────────────
            await ws.send_json(result)

    except WebSocketDisconnect:
        # Normal disconnect — release MediaPipe resources
        pipeline.cleanup()

    except Exception as exc:
        # Unexpected error — still clean up
        pipeline.cleanup()
        raise
