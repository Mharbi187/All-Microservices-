"""
CPR Pipeline — Layer 4: Pose Estimation
==========================================
Runs MediaPipe Pose ONCE on the full frame per role, then assigns landmarks
to the correct person by checking containment within their padded bounding box.

CRITICAL DESIGN DECISION — Full-frame, not per-crop:
  During CPR the rescuer's wrists extend BEYOND their own bounding box
  (they reach down toward the victim's chest). Per-crop MediaPipe would
  systematically return None for the most critical keypoints every frame.
  Full-frame + 20% bbox padding solves this.
"""

import cv2
import numpy as np
from typing import List, Optional, Dict

import mediapipe as mp

# Critical landmark indices that must be visible for a valid rescuer pose
_PL = mp.solutions.pose.PoseLandmark
_CRITICAL_INDICES = [
    _PL.LEFT_WRIST.value,   _PL.RIGHT_WRIST.value,
    _PL.LEFT_ELBOW.value,   _PL.RIGHT_ELBOW.value,
    _PL.LEFT_SHOULDER.value, _PL.RIGHT_SHOULDER.value,
]


class PoseEstimator:
    """
    Layer 4 — MediaPipe Pose, full-frame landmark assignment.

    Two MediaPipe model instances are created ONCE in __init__ and reused.
    NEVER instantiate mp.solutions.pose.Pose() inside a per-frame method.

    Returns a 33-slot list per person (slots may be None if the landmark
    is outside the person's padded bounding box).
    """

    BBOX_PAD_FRAC = 0.20   # 20% bbox expansion to capture reaching wrists

    def __init__(self) -> None:
        """Create MediaPipe models once. Call cleanup() when session ends."""
        _pose = mp.solutions.pose

        # Rescuer model: complexity=1 for accurate joint angle measurement
        self.rescuer_model = _pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            smooth_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )

        # Victim model: complexity=0 for speed (only needs gross body position)
        self.victim_model = _pose.Pose(
            static_image_mode=False,
            model_complexity=0,
            smooth_landmarks=False,
            min_detection_confidence=0.4,
            min_tracking_confidence=0.4,
        )

    def process(self, frame: np.ndarray, pair: dict) -> Dict[str, Optional[List]]:
        """
        Run MediaPipe on the full frame for each role, assign landmarks.

        Args:
            frame: Full BGR frame.
            pair:  {"rescuer": <tracked person dict>, "victim": <tracked person dict>}

        Returns:
            {"rescuer_pose": List[33] | None, "victim_pose": List[33] | None}
            Each list slot is a landmark dict {x,y,z,visibility,index} or None.
        """
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        frame_h, frame_w = frame.shape[:2]

        rescuer_pose = self._run_and_assign(
            frame_rgb, self.rescuer_model, pair["rescuer"], frame_w, frame_h
        )
        victim_pose = self._run_and_assign(
            frame_rgb, self.victim_model, pair["victim"], frame_w, frame_h
        )

        return {"rescuer_pose": rescuer_pose, "victim_pose": victim_pose}

    def check_visibility(self, pose: Optional[List]) -> bool:
        """
        Returns True only if all 6 critical landmarks are present and visible.
        A None slot means the landmark was outside the padded bbox — treated as
        invisible. This is the gate before Layer 6 runs rule evaluation.
        """
        if not pose:
            return False
        for idx in _CRITICAL_INDICES:
            lm = pose[idx]
            if lm is None or lm["visibility"] < 0.5:
                return False
        return True

    def cleanup(self) -> None:
        """Release MediaPipe resources. Call when WebSocket session ends."""
        self.rescuer_model.close()
        self.victim_model.close()

    # ────────────────────────────────────────────────────────────────
    # Private
    # ────────────────────────────────────────────────────────────────

    def _run_and_assign(
        self,
        frame_rgb: np.ndarray,
        model,
        person: dict,
        frame_w: int,
        frame_h: int,
    ) -> Optional[List]:
        """
        Run MediaPipe on the full frame, then populate a 33-slot list.
        Landmarks whose (x,y) fall outside the 20%-padded person bbox are
        left as None — they belong to the other person in frame.

        ⚠️  Do NOT set visibility=0 for out-of-bbox landmarks.
        That would cause check_visibility() to silently freeze all corrections.
        Use None instead and handle None in check_visibility().
        """
        results = model.process(frame_rgb)
        if not results.pose_landmarks:
            return None

        # Compute padded bbox in normalized (0–1) coordinates
        pad_x = (person["x2"] - person["x1"]) * self.BBOX_PAD_FRAC
        pad_y = (person["y2"] - person["y1"]) * self.BBOX_PAD_FRAC
        bx1 = max(0.0, (person["x1"] - pad_x) / frame_w)
        bx2 = min(1.0, (person["x2"] + pad_x) / frame_w)
        by1 = max(0.0, (person["y1"] - pad_y) / frame_h)
        by2 = min(1.0, (person["y2"] + pad_y) / frame_h)

        # Allocate 33-slot list (index-stable, matches MediaPipe PoseLandmark enum)
        lms: List[Optional[dict]] = [None] * 33
        for i, lm in enumerate(results.pose_landmarks.landmark):
            if bx1 <= lm.x <= bx2 and by1 <= lm.y <= by2:
                lms[i] = {
                    "x": lm.x,
                    "y": lm.y,
                    "z": lm.z,
                    "visibility": lm.visibility,
                    "index": i,
                }
            # else: leave as None — this landmark belongs to the other person
        return lms
