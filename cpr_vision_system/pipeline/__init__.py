"""
CPR Pipeline Package — Orchestrator
=====================================
CPRPipeline is the single class instantiated per WebSocket session.

One instance per connection: no shared global state, no global locks.
Concurrency scales linearly with CPU cores.
"""

import time
import json
import cv2
import numpy as np
from typing import Optional

from .layer1_detection  import PersonDetector
from .layer2_tracker    import PersonTracker
from .layer3_selector   import PairSelector
from .layer4_pose       import PoseEstimator
from .layer5_classifier import VictimClassifier
from .layer6_logic      import RuleEvaluator
from cpr_vision_system.signal_processor import SignalProcessor


class CPRPipeline:
    """
    Orchestrates all 6 pipeline layers for one CPR session.

    Instantiated per WebSocket connection in server.py.
    Owns the lifecycle of all layer objects including MediaPipe models.

    Usage:
        pipeline = CPRPipeline(session_id="abc-123")
        result   = await pipeline.process(raw_frame_bytes, meta_dict)
        pipeline.cleanup()  # on WebSocketDisconnect
    """

    def __init__(self, session_id: str) -> None:
        self.session_id  = session_id
        self.detector    = PersonDetector()       # Layer 1
        self.tracker     = PersonTracker()        # Layer 2
        self.selector    = PairSelector()         # Layer 3
        self.pose        = PoseEstimator()        # Layer 4 — YOLO pose
        self.classifier  = VictimClassifier()     # Layer 5
        self.evaluator   = RuleEvaluator()        # Layer 6
        self.signal      = SignalProcessor()      # BPM / recoil state

        # Track rescuer's stable track_id for RESCUER_LOST detection
        self._rescuer_id: Optional[int] = None
        self._session_start: float = time.time()

    async def process(self, raw_frame: bytes, meta: dict) -> dict:
        """
        Execute all 6 layers in order for one camera frame.

        Args:
            raw_frame: Raw JPEG bytes received from the mobile WebSocket.
            meta:      JSON metadata dict {"ts": <capture_timestamp_ms>}.

        Returns:
            Dict conforming to the WebSocket Server→Client schema.
        """
        # Decode JPEG bytes → BGR frame
        np_arr = np.frombuffer(raw_frame, np.uint8)
        frame  = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if frame is None:
            return {"status": "ERROR", "detail": "Failed to decode frame"}

        ts_ms = float(meta.get("ts", time.time() * 1000))

        # ── Layer 1: Person Detection ─────────────────────────────────────
        boxes = self.detector.detect(frame)
        if len(boxes) == 0:
            return {"status": "NO_PERSON_DETECTED"}

        # ── Layer 2: Tracking ─────────────────────────────────────────────
        tracked = self.tracker.update(boxes, frame.shape)
        
        rescuer_count = int(meta.get("rescuer_count", 1))

        if len(tracked) == 0:
            return {"status": "NO_PERSON_DETECTED"}
            
        if len(tracked) < 2 and rescuer_count >= 2:
            return {"status": "VICTIM_NOT_VISIBLE"}

        # RESCUER_LOST check (if we already know the rescuer's track_id)
        if self._rescuer_id is not None:
            if self.tracker.is_rescuer_lost(tracked, self._rescuer_id):
                self.signal.reset()
                self._rescuer_id = None
                return {"status": "RESCUER_LOST"}

        # ── Layer 3: Pair Selection ───────────────────────────────────────
        pair = self.selector.select(tracked, expected_rescuers=rescuer_count)
        if pair is None:
            return {"status": "VICTIM_NOT_VISIBLE"}

        # Store rescuer track_id for future RESCUER_LOST detection
        self._rescuer_id = pair["rescuer"]["track_id"]

        # ── Layer 4: Pose Estimation ──────────────────────────────────────
        poses = self.pose.process(frame, pair)
        if poses["rescuer_pose"] is None:
            return {"status": "RESCUER_POSE_LOST"}

        low_vis = not self.pose.check_visibility(poses["rescuer_pose"])

        # ── Layer 5: Victim Classification (cached every 3s) ─────────────
        victim_info = self.classifier.classify(
            frame, pair["victim"], current_time=ts_ms / 1000.0
        )

        # ── Signal Processor: update before Layer 6 ──────────────────────
        self.signal.update(poses["rescuer_pose"], capture_timestamp_ms=ts_ms)
        signal_state = self.signal.get_state()

        # ── Layer 6: Rule Evaluation ──────────────────────────────────────
        result = self.evaluator.evaluate(
            rescuer_pose=poses["rescuer_pose"],
            victim_type=victim_info["victim_type"],
            signal=signal_state,
            low_visibility=low_vis,
        )

        # Attach victim confidence and echo back client timestamp
        result["victim_confidence"]    = victim_info["confidence"]
        result["capture_timestamp_ms"] = int(ts_ms)
        
        # Attach debug bounding boxes
        result["debug_rescuer"] = pair["rescuer"]
        result["debug_victim"]  = pair["victim"]

        return result

    def cleanup(self) -> None:
        """
        Release all resources. Must be called on WebSocket disconnect.
        """
        self.pose.cleanup()
