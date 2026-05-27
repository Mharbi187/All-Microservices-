"""
CPR Pipeline — Layer 4: Pose Estimation
==========================================
Uses YOLO pose26n (Ultralytics) to estimate the 17 COCO keypoints per person.

Replaces MediaPipe entirely — the whole pipeline now runs on a single model
family (Ultralytics YOLO), removing the mediapipe dependency from runtime.

Output format:
  A 17-slot list per person. Each slot is either:
    {"x": float, "y": float, "z": float, "visibility": float, "index": int}
  or None (if the keypoint has confidence < MIN_KP_CONF).

Coordinates are NORMALIZED to [0, 1] (divided by frame width/height)
so that signal_processor.py and layer6_logic.py receive the same scale
they previously expected from MediaPipe.

COCO 17-keypoint index reference (matches PoseLandmarks in config.py):
  0  nose          1  left_eye       2  right_eye
  3  left_ear      4  right_ear
  5  left_shoulder 6  right_shoulder
  7  left_elbow    8  right_elbow
  9  left_wrist   10  right_wrist
  11 left_hip     12 right_hip
  13 left_knee    14 right_knee
  15 left_ankle   16 right_ankle
"""

import numpy as np
from typing import List, Optional, Dict
from ultralytics import YOLO

# COCO indices of the 6 upper-body keypoints required for a valid rescuer pose
# (shoulders, elbows, wrists)
_CRITICAL_INDICES = [5, 6, 7, 8, 9, 10]

# Keypoints below this confidence are treated as None (occluded)
MIN_KP_CONF = 0.30


class PoseEstimator:
    """
    Layer 4 — YOLO pose estimation with pose26n.pt.

    One YOLO model instance is created at init and reused every frame.
    Runs full-frame inference, then assigns the correct detection to each
    tracked person using IoU between the YOLO box and the tracker box.

    Returns normalized (0-1) keypoint coordinates.
    """

    IOU_THRESHOLD = 0.25   # Min IoU to accept a YOLO detection as matching a tracked person

    def __init__(self, model_path: str = "yolo26n-pose.pt") -> None:
        # yolo26n-pose.pt is the official Ultralytics YOLO26 nano pose model.
        # Auto-downloaded on first run. Matches the YOLO26 family of v26.pt and best.pt.
        self.model = YOLO(model_path)
        print(f"[Layer 4] Pose model loaded: {model_path}")

    def process(self, frame: np.ndarray, pair: dict) -> Dict[str, Optional[List]]:
        """
        Run YOLO pose on the full frame, assign keypoints to rescuer and victim.

        Args:
            frame: Full BGR frame.
            pair:  {"rescuer": <tracked person dict>, "victim": <tracked person dict>}

        Returns:
            {"rescuer_pose": List[17] | None, "victim_pose": List[17] | None}
            Each slot: {x, y, z, visibility, index} normalized to [0, 1], or None.
        """
        h, w = frame.shape[:2]

        results = self.model(frame, verbose=False)
        if not results or results[0].keypoints is None or results[0].boxes is None:
            return {"rescuer_pose": None, "victim_pose": None}

        kps_xy   = results[0].keypoints.xy.cpu().numpy()    # (N, 17, 2) in pixels
        kps_conf = results[0].keypoints.conf.cpu().numpy()  # (N, 17)
        boxes    = results[0].boxes.xyxy.cpu().numpy()       # (N, 4) in pixels

        rescuer_pose = self._assign_pose(kps_xy, kps_conf, boxes, pair["rescuer"], w, h)
        victim_pose  = self._assign_pose(kps_xy, kps_conf, boxes, pair["victim"],  w, h)

        return {"rescuer_pose": rescuer_pose, "victim_pose": victim_pose}

    def check_visibility(self, pose: Optional[List]) -> bool:
        """
        Returns True only if all 6 critical upper-body keypoints are present
        and have confidence > 0.5. This is the gate before Layer 6 evaluates rules.
        """
        if not pose:
            return False
        for idx in _CRITICAL_INDICES:
            lm = pose[idx] if idx < len(pose) else None
            if lm is None or lm["visibility"] < 0.5:
                return False
        return True

    def cleanup(self) -> None:
        """No-op — YOLO models don't need explicit teardown (unlike MediaPipe)."""
        pass

    # ────────────────────────────────────────────────────────────────
    # Private helpers
    # ────────────────────────────────────────────────────────────────

    def _assign_pose(
        self,
        kps_xy:   np.ndarray,
        kps_conf: np.ndarray,
        boxes:    np.ndarray,
        person:   dict,
        frame_w:  int,
        frame_h:  int,
    ) -> Optional[List]:
        """
        Find the YOLO detection whose bounding box best overlaps with `person`,
        then build and return a normalized 17-slot keypoint list.
        """
        pb = np.array([person["x1"], person["y1"], person["x2"], person["y2"]], dtype=float)

        best_iou   = -1.0
        best_index = -1
        for i, box in enumerate(boxes):
            iou = self._iou(pb, box)
            if iou > best_iou:
                best_iou   = iou
                best_index = i

        if best_index < 0 or best_iou < self.IOU_THRESHOLD:
            return None

        xy   = kps_xy[best_index]    # (17, 2) pixels
        conf = kps_conf[best_index]  # (17,)

        pose: List[Optional[dict]] = [None] * 17
        for i in range(17):
            kp_conf = float(conf[i])
            if kp_conf < MIN_KP_CONF:
                continue   # treat low-confidence keypoints as occluded → slot stays None
            pose[i] = {
                "x":          float(xy[i][0]) / frame_w,   # normalize to [0, 1]
                "y":          float(xy[i][1]) / frame_h,   # normalize to [0, 1]
                "z":          0.0,                          # YOLO pose is 2-D only
                "visibility": kp_conf,
                "index":      i,
            }
        return pose

    @staticmethod
    def _iou(a: np.ndarray, b: np.ndarray) -> float:
        """Intersection-over-Union between two [x1, y1, x2, y2] boxes."""
        ix1 = max(a[0], b[0])
        iy1 = max(a[1], b[1])
        ix2 = min(a[2], b[2])
        iy2 = min(a[3], b[3])
        inter = max(0.0, ix2 - ix1) * max(0.0, iy2 - iy1)
        if inter == 0.0:
            return 0.0
        area_a = (a[2] - a[0]) * (a[3] - a[1])
        area_b = (b[2] - b[0]) * (b[3] - b[1])
        union  = area_a + area_b - inter
        return inter / union if union > 0 else 0.0
