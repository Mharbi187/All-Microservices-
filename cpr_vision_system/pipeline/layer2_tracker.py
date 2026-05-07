"""
CPR Pipeline — Layer 2: Person Tracking
==========================================
Wraps ByteTrack to give each detected person a stable integer ID across frames.
This prevents the system from confusing a bystander who walks in with the rescuer.
"""

import numpy as np
from typing import List

try:
    from bytetracker import BYTETracker
    _BYTETRACK_AVAILABLE = True
except ImportError:
    _BYTETRACK_AVAILABLE = False


class _FallbackTracker:
    """
    Simple ID-stable fallback if bytetracker is not installed.
    Assigns IDs by sort order of bounding box area (largest = most prominent).
    Not frame-to-frame stable but prevents IndexError crashes.
    """
    def __init__(self):
        self._next_id = 1

    def update(self, boxes: List[dict], _frame_shape) -> List[dict]:
        # Sort by area descending, assign sequential IDs
        sorted_boxes = sorted(
            boxes,
            key=lambda b: (b["x2"] - b["x1"]) * (b["y2"] - b["y1"]),
            reverse=True,
        )
        result = []
        for i, box in enumerate(sorted_boxes):
            result.append({**box, "track_id": i + 1})
        return result


class PersonTracker:
    """
    Layer 2 — ByteTrack multi-person tracker.

    Assigns stable integer track_id values to each person across frames.
    Falls back to a simple area-based sorter if bytetracker is unavailable.
    """

    def __init__(
        self,
        track_thresh: float = 0.4,
        match_thresh: float = 0.8,
        frame_rate: int = 30,
    ) -> None:
        if _BYTETRACK_AVAILABLE:
            self._tracker = BYTETracker(
                track_thresh=track_thresh,
                match_thresh=match_thresh,
                frame_rate=frame_rate,
            )
            self._use_bytetrack = True
        else:
            self._tracker = _FallbackTracker()
            self._use_bytetrack = False

        # Consecutive-miss counter per track_id for RESCUER_LOST detection
        self._miss_count: dict = {}
        self.MAX_MISS_FRAMES = 30  # ~1 second at 30fps

    def update(self, boxes: List[dict], frame_shape: tuple) -> List[dict]:
        """
        Update tracker with new detections.

        Args:
            boxes:       Output from Layer 1 (list of bounding box dicts).
            frame_shape: Frame (height, width, channels) — required by ByteTrack.

        Returns:
            Same boxes, each augmented with track_id: int.
        """
        if not boxes:
            return []

        if self._use_bytetrack:
            dets = np.array([
                [b["x1"], b["y1"], b["x2"], b["y2"], b["confidence"]]
                for b in boxes
            ], dtype=np.float32)

            tracked = self._tracker.update(dets, frame_shape[:2], frame_shape[:2])
            result = []
            for t in tracked:
                # ByteTracker returns [x1,y1,x2,y2,track_id,score]
                result.append({
                    "x1": int(t[0]), "y1": int(t[1]),
                    "x2": int(t[2]), "y2": int(t[3]),
                    "track_id": int(t[4]),
                    "confidence": float(t[5]) if len(t) > 5 else 1.0,
                })
            return result
        else:
            return self._tracker.update(boxes, frame_shape)

    def is_rescuer_lost(self, tracked: List[dict], expected_rescuer_id: int) -> bool:
        """
        Returns True if the expected rescuer track_id has been absent
        for more than MAX_MISS_FRAMES consecutive frames.
        """
        active_ids = {t["track_id"] for t in tracked}
        if expected_rescuer_id not in active_ids:
            self._miss_count[expected_rescuer_id] = (
                self._miss_count.get(expected_rescuer_id, 0) + 1
            )
        else:
            self._miss_count[expected_rescuer_id] = 0

        return self._miss_count.get(expected_rescuer_id, 0) >= self.MAX_MISS_FRAMES
