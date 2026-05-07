"""
CPR Vision System - Signal Processor
=====================================
Signal processing for compression analysis. Updated for the 6-layer pipeline:

KEY CHANGES from original:
  - Accepts client-side capture timestamps (ms) instead of server time.time()
    → Eliminates network jitter from BPM calculation.
  - Accepts MediaPipe wrist Y (normalized 0.0–1.0) + torso_height (normalized)
    → Replaces pixel-based depth with torso-normalized depth %.
  - Exposes update(pose, timestamp_ms) and get_state() for CPRPipeline.
  - depth_torso_pct replaces average_depth_pixels everywhere.
"""

import numpy as np
from collections import deque
from typing import List, Optional
from dataclasses import dataclass, field

from .config import SignalProcessing, VisionConfig
from .utils import KalmanFilter1D, MovingAverageFilter


# ──────────────────────────────────────────────────────────────────────────────
# Data structures
# ──────────────────────────────────────────────────────────────────────────────

@dataclass
class CompressionEvent:
    """Single compression event, stored in seconds (converted from client ms)."""
    timestamp_s: float       # Client capture time in seconds
    depth_torso_pct: float   # Depth as % of torso height (distance-independent)
    duration_s: float        # Compression cycle duration
    full_recoil: bool        # True if wrist returned ≥95% of the way to baseline
    wrist_y_min: float       # Lowest normalized Y (deepest point)
    wrist_y_max: float       # Highest normalized Y (full release)


@dataclass
class SignalState:
    """
    Snapshot of signal processor state, returned by get_state().
    Consumed by layer6_logic.py (RuleEvaluator).
    """
    bpm: int                    = 0
    depth_torso_pct: float      = 0.0   # Torso-normalized depth (%) of last compression
    recoil_quality: float       = 1.0   # 0.0 = poor, 1.0 = full recoil
    time_since_last: float      = 0.0   # Seconds since last compression
    wrist_x_variance: float     = 0.0   # Horizontal wrist drift (normalized)
    compression_count: int      = 0
    phase: str                  = "WAITING"   # WAITING | COMPRESSING | RELEASING


# ──────────────────────────────────────────────────────────────────────────────
# Main class
# ──────────────────────────────────────────────────────────────────────────────

class SignalProcessor:
    """
    Signal processing engine for CPR motion analysis.

    Analyzes the vertical movement of the rescuer's wrists to:
      1. Detect individual compression events (WAITING → COMPRESSING → RELEASING)
      2. Calculate compression rate (BPM) from client-side timestamps
      3. Estimate compression depth as % of torso height  ← no camera-distance heistic
      4. Verify chest recoil quality
      5. Detect horizontal wrist drift (lateral_movement error)

    Usage (called by CPRPipeline per frame):
        signal.update(rescuer_pose, capture_timestamp_ms)
        state = signal.get_state()
    """

    def __init__(self) -> None:
        # ── Kalman filter: smooths MediaPipe wrist Y noise ──
        self.kalman_filter = KalmanFilter1D(
            process_noise=SignalProcessing.KALMAN_PROCESS_NOISE,
            measurement_noise=SignalProcessing.KALMAN_MEASUREMENT_NOISE,
        )

        # ── BPM smoothing: rolling average over last N BPM readings ──
        self.bpm_filter = MovingAverageFilter(
            window_size=SignalProcessing.BPM_SMOOTHING_WINDOW
        )

        # ── Wrist Y history (normalized, filtered) ──
        self.wrist_y_history: deque = deque(maxlen=120)   # ~4s at 30fps
        self.wrist_y_filtered: float = 0.0
        self.wrist_y_baseline: float = 0.0   # Reference: full-release position

        # ── Wrist X history for lateral drift detection ──
        self.wrist_x_history: deque = deque(maxlen=30)

        # ── Compression state machine ──
        self.state: str = "WAITING"
        self.compression_start_time_s: float = 0.0
        self.compression_min_y: float = float("inf")    # Lowest point (deepest)
        self.compression_max_y: float = float("-inf")   # Highest point (full release)

        # ── Event history ──
        self.compression_events: deque = deque(maxlen=30)  # Last 30 compressions
        self.last_compression_time_s: float = 0.0

        # ── Derived metrics (updated each frame) ──
        self.current_bpm: int = 0
        self.depth_torso_pct: float = 0.0
        self.recoil_quality: float = 1.0

        # ── Session tracking ──
        self.session_start_s: float = 0.0
        self._last_timestamp_s: float = 0.0
        self._initialized: bool = False

    # ──────────────────────────────────────────────────────────────────────────
    # Public API — called by CPRPipeline
    # ──────────────────────────────────────────────────────────────────────────

    def update(self, rescuer_pose: List[Optional[dict]], capture_timestamp_ms: float) -> None:
        """
        Main entry point. Called once per frame by CPRPipeline.

        Args:
            rescuer_pose:         33-slot list of MediaPipe landmarks (slots may be None).
                                  Landmarks have keys: x, y, z, visibility, index.
            capture_timestamp_ms: Client-side camera sensor timestamp in milliseconds.
                                  Using client time eliminates network jitter from BPM.
        """
        import mediapipe as mp
        _PL = mp.solutions.pose.PoseLandmark

        # Convert client ms → seconds for internal calculations
        timestamp_s = capture_timestamp_ms / 1000.0

        if not self._initialized:
            self.session_start_s = timestamp_s
            self._initialized = True

        # ── Extract wrist and torso landmarks (may be None if occluded) ──
        lw = rescuer_pose[_PL.LEFT_WRIST.value]
        rw = rescuer_pose[_PL.RIGHT_WRIST.value]
        ls = rescuer_pose[_PL.LEFT_SHOULDER.value]
        rs = rescuer_pose[_PL.RIGHT_SHOULDER.value]
        lh = rescuer_pose[_PL.LEFT_HIP.value]
        rh = rescuer_pose[_PL.RIGHT_HIP.value]

        # ── Cannot proceed without wrists ──
        if lw is None or rw is None:
            return

        wrist_y = (lw["y"] + rw["y"]) / 2.0
        wrist_x = (lw["x"] + rw["x"]) / 2.0

        # ── Compute torso height for normalized depth (requires shoulder + hip) ──
        torso_height = self._compute_torso_height(ls, rs, lh, rh)

        # ── Step 1: Kalman filter on wrist Y ──
        self.wrist_y_filtered = self.kalman_filter.update(wrist_y)
        self.wrist_y_history.append(self.wrist_y_filtered)

        # ── Step 2: Wrist X for lateral drift tracking ──
        self.wrist_x_history.append(wrist_x)

        # ── Step 3: Establish / adapt baseline (highest wrist position = full release) ──
        if self.wrist_y_baseline == 0.0:
            self.wrist_y_baseline = self.wrist_y_filtered
            return  # First frame: not enough history

        ALPHA = 0.01   # Slow adaptation for camera movement compensation
        if self.wrist_y_filtered < self.wrist_y_baseline:
            # Wrist moved UP (lower Y in image coords) → update baseline
            self.wrist_y_baseline = (
                ALPHA * self.wrist_y_filtered + (1.0 - ALPHA) * self.wrist_y_baseline
            )

        # ── Step 4: Run compression state machine ──
        new_compression = self._detect_compression_event(
            y_position=self.wrist_y_filtered,
            timestamp_s=timestamp_s,
            torso_height=torso_height,
        )

        # ── Step 5: Update derived metrics ──
        if new_compression:
            self._update_bpm()

        self._update_depth()
        self._update_recoil_quality()

    def get_state(self) -> SignalState:
        """
        Returns a snapshot of current signal processor state.
        Called by layer6_logic.RuleEvaluator after update().
        """
        time_since_last = 0.0
        if self.last_compression_time_s > 0.0 and self._initialized:
            # Use last known client timestamp (stored from last update)
            time_since_last = self._last_timestamp_s - self.last_compression_time_s

        return SignalState(
            bpm=self.current_bpm,
            depth_torso_pct=self.depth_torso_pct,
            recoil_quality=self.recoil_quality,
            time_since_last=max(0.0, time_since_last),
            wrist_x_variance=self._compute_wrist_x_variance(),
            compression_count=len(self.compression_events),
            phase=self.state,
        )

    def reset(self) -> None:
        """Reset all state. Call when a session ends and a new one begins."""
        self.kalman_filter = KalmanFilter1D(
            process_noise=SignalProcessing.KALMAN_PROCESS_NOISE,
            measurement_noise=SignalProcessing.KALMAN_MEASUREMENT_NOISE,
        )
        self.bpm_filter.reset()
        self.wrist_y_history.clear()
        self.wrist_x_history.clear()
        self.compression_events.clear()
        self.wrist_y_baseline = 0.0
        self.wrist_y_filtered = 0.0
        self.state = "WAITING"
        self.current_bpm = 0
        self.depth_torso_pct = 0.0
        self.recoil_quality = 1.0
        self.last_compression_time_s = 0.0
        self._initialized = False
        self._last_timestamp_s = 0.0

    # ──────────────────────────────────────────────────────────────────────────
    # Private helpers
    # ──────────────────────────────────────────────────────────────────────────

    def _compute_torso_height(self, ls, rs, lh, rh) -> float:
        """
        Torso height = vertical distance between shoulder midpoint and hip midpoint.
        Returns normalized value (0.0–1.0). Returns 0.0 if any landmark is None.
        """
        if any(lm is None for lm in [ls, rs, lh, rh]):
            return 0.0
        shoulder_mid_y = (ls["y"] + rs["y"]) / 2.0
        hip_mid_y = (lh["y"] + rh["y"]) / 2.0
        return abs(hip_mid_y - shoulder_mid_y)

    def _detect_compression_event(
        self, y_position: float, timestamp_s: float, torso_height: float
    ) -> bool:
        """
        State machine: WAITING → COMPRESSING → RELEASING → WAITING.

        All thresholds use torso-normalized displacement (not pixels).
        MIN_COMPRESSION_DISPLACEMENT is read from config as a fraction of torso height.

        Returns True when a full compression+recoil cycle is completed.
        """
        # Store for get_state() time_since_last calculation
        self._last_timestamp_s = timestamp_s

        # Anti-bounce: ignore events within minimum inter-compression interval
        elapsed = timestamp_s - self.last_compression_time_s
        if elapsed < SignalProcessing.ANTI_BOUNCE_DELAY_SEC:
            return False

        # Displacement is UPWARD movement in image coords (Y increases downward in images,
        # so pressing DOWN means Y value INCREASES for the wrist).
        # baseline = wrist at full release (smallest Y = highest in image = hands up)
        # pressing down → wrist_y increases above baseline
        displacement = y_position - self.wrist_y_baseline

        # Minimum displacement threshold: expressed as fraction of torso height
        # Falls back to a small absolute value if torso_height is unknown
        min_disp = (
            VisionConfig.MIN_COMPRESSION_DISPLACEMENT_TORSO_FRAC * torso_height
            if torso_height > 0.01
            else VisionConfig.MIN_COMPRESSION_DISPLACEMENT_ABS
        )

        if self.state == "WAITING":
            if displacement > min_disp:
                self.state = "COMPRESSING"
                self.compression_start_time_s = timestamp_s
                self.compression_min_y = y_position   # Will track the maximum Y (deepest)
                self.compression_max_y = self.wrist_y_baseline

        elif self.state == "COMPRESSING":
            # Track deepest point (highest Y value in image coordinates)
            if y_position > self.compression_min_y:
                self.compression_min_y = y_position

            # Upward movement ≥ 30% of downstroke → entering release phase
            downstroke = self.compression_min_y - self.wrist_y_baseline
            if downstroke > 0:
                recovery = self.compression_min_y - y_position
                if recovery / downstroke >= 0.30:
                    self.state = "RELEASING"

        elif self.state == "RELEASING":
            # Track highest point during release
            if y_position > self.compression_max_y:
                self.compression_max_y = y_position

            # Recoil % = how far wrist returned toward baseline
            downstroke = self.compression_min_y - self.wrist_y_baseline
            if downstroke > 0:
                recoil_pct = (self.compression_min_y - y_position) / downstroke * 100.0
            else:
                recoil_pct = 100.0

            if recoil_pct >= VisionConfig.RECOIL_THRESHOLD_PERCENT:
                duration_s = timestamp_s - self.compression_start_time_s

                # Validate cycle duration (guards against noise spikes)
                if (SignalProcessing.COMPRESSION_MIN_DURATION_SEC
                        <= duration_s
                        <= SignalProcessing.COMPRESSION_MAX_DURATION_SEC):

                    # Compute torso-normalized depth %
                    depth_pct = (
                        (self.compression_min_y - self.wrist_y_baseline)
                        / torso_height * 100.0
                        if torso_height > 0.01
                        else 0.0
                    )

                    event = CompressionEvent(
                        timestamp_s=timestamp_s,
                        depth_torso_pct=depth_pct,
                        duration_s=duration_s,
                        full_recoil=(recoil_pct >= 95.0),
                        wrist_y_min=self.compression_min_y,
                        wrist_y_max=self.compression_max_y,
                    )
                    self.compression_events.append(event)
                    self.last_compression_time_s = timestamp_s
                    self.state = "WAITING"
                    return True  # ← new compression counted
                else:
                    # Compression completed but rejected due to duration (too fast/slow).
                    # MUST reset to WAITING so we don't lock up the state machine!
                    self.state = "WAITING"

            # Safety: reset if stuck in RELEASING for too long
            if (timestamp_s - self.compression_start_time_s
                    > SignalProcessing.COMPRESSION_MAX_DURATION_SEC * 2):
                self.state = "WAITING"

        return False

    def _update_bpm(self) -> None:
        """
        Recalculate BPM from last 5 compression timestamps.
        Uses client-side timestamps → immune to server processing delay.
        Requires ≥2 events.
        """
        events = list(self.compression_events)
        if len(events) < 2:
            self.current_bpm = 0
            return

        recent = events[-5:]  # Up to last 5 compressions
        intervals = [
            recent[i].timestamp_s - recent[i - 1].timestamp_s
            for i in range(1, len(recent))
        ]

        if not intervals:
            return

        avg_interval = sum(intervals) / len(intervals)
        if avg_interval > 0:
            instant_bpm = 60.0 / avg_interval
            self.current_bpm = int(self.bpm_filter.update(instant_bpm))

    def _update_depth(self) -> None:
        """Average depth (torso %) over last 10 compressions."""
        events = list(self.compression_events)
        if not events:
            self.depth_torso_pct = 0.0
            return
        recent = events[-10:]
        self.depth_torso_pct = sum(e.depth_torso_pct for e in recent) / len(recent)

    def _update_recoil_quality(self) -> None:
        """Fraction of last 10 compressions that achieved full recoil (≥95%)."""
        events = list(self.compression_events)
        if not events:
            self.recoil_quality = 1.0
            return
        recent = events[-10:]
        self.recoil_quality = sum(1 for e in recent if e.full_recoil) / len(recent)

    def _compute_wrist_x_variance(self) -> float:
        """
        Variance of wrist X position over last 30 frames (normalized 0.0–1.0).
        High variance → lateral movement error → 'lateral_movement' rule fires.
        """
        if len(self.wrist_x_history) < 5:
            return 0.0
        return float(np.var(list(self.wrist_x_history)))
