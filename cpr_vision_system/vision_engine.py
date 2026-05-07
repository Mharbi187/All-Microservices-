"""
CPR Vision System - Vision Engine (YOLOv8 Edition)
====================================================
Core computer vision module handling:
- Person detection and tracking (YOLOv8s-pose)
- Multi-person handling and rescuer identification
- Victim classification (best.pt)
- Face detection for attention monitoring (MediaPipe Face Mesh)
- Skeleton visualisation drawn by YOLO
"""

import cv2
import numpy as np
import time
from pathlib import Path
from typing import List, Tuple, Optional, Dict
from dataclasses import dataclass

from .config import VisionConfig, PoseLandmarks, runtime_config

# ─── Ultralytics import ──────────────────────────────────────────────────────
try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False
    print("✗ ultralytics not installed. Run: pip install ultralytics")

# ─── MediaPipe (face mesh only) ──────────────────────────────────────────────
try:
    import mediapipe as mp
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    MEDIAPIPE_AVAILABLE = False
    print("✗ mediapipe not installed (attention monitoring disabled)")


# ─── Model paths ──────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).parent.parent  # Project root
POSE_MODEL_ID = "yolov8n-pose.pt"
CLASSIFIER_PATH = SCRIPT_DIR / "cpr_mobile_app" / "best.pt"


@dataclass
class PersonDetection:
    """Detected person with pose landmarks."""

    person_id: int
    keypoints: np.ndarray          # (17, 2) pixel coordinates from YOLO
    visibility_score: float        # Average keypoint confidence
    bbox: Tuple[int, int, int, int]  # Bounding box (x, y, w, h)

    # Key body points (pixel coordinates)
    left_wrist: Optional[Tuple[float, float]] = None
    right_wrist: Optional[Tuple[float, float]] = None
    left_shoulder: Optional[Tuple[float, float]] = None
    right_shoulder: Optional[Tuple[float, float]] = None
    left_hip: Optional[Tuple[float, float]] = None
    right_hip: Optional[Tuple[float, float]] = None

    # Derived features
    hands_center: Optional[Tuple[float, float]] = None
    chest_roi: Optional[Tuple[int, int, int, int]] = None
    is_rescuer: bool = False


class VisionEngine:
    """
    Main vision processing engine — YOLOv8 edition.

    Handles all computer vision tasks including person detection,
    17-keypoint pose estimation, victim classification, and facial
    landmark detection for attention monitoring.
    """

    def __init__(self):
        """Initialize YOLO models and optional MediaPipe face mesh."""

        # ── YOLOv8s-pose (person detection + 17 keypoints) ──
        self.pose_model = None
        self.classifier_model = None

        if YOLO_AVAILABLE:
            print("Loading YOLOv8s-pose model...")
            self.pose_model = YOLO(POSE_MODEL_ID)
            print(f"✓ Pose model loaded: {POSE_MODEL_ID}")

            if CLASSIFIER_PATH.exists():
                print(f"Loading classifier: {CLASSIFIER_PATH}")
                self.classifier_model = YOLO(str(CLASSIFIER_PATH))
                if hasattr(self.classifier_model, 'names'):
                    print(f"✓ Classifier loaded: best.pt")
                    print(f"  Model classes: {self.classifier_model.names}")
                    print(f"  Model task: {self.classifier_model.task}")
            else:
                print(f"✗ Classifier not found at {CLASSIFIER_PATH}")

        # ── MediaPipe Face Mesh (DISABLED to reduce latency) ──
        # Attention monitoring adds ~100ms per frame on CPU.
        # Re-enable when GPU acceleration is available.
        self.face_mesh = None

        # ── Internal state ──
        self.detected_persons: List[PersonDetection] = []
        self.rescuer: Optional[PersonDetection] = None
        self.face_landmarks = None

        # Victim classification state
        self.victim_type = "adult"
        self.victim_confidence = 0.0
        self.last_classify_time = 0

        # Frame dimensions
        self.frame_width = 0
        self.frame_height = 0

        # Last YOLO results (for skeleton drawing)
        self._last_results = None

    # ══════════════════════════════════════════════════════════════════════════
    #  MAIN PROCESSING
    # ══════════════════════════════════════════════════════════════════════════

    def process_frame(self, frame: np.ndarray) -> Tuple[np.ndarray, Dict]:
        """
        Main processing pipeline for each video frame.

        Pipeline:
        1. YOLOv8s-pose → detect persons + 17 keypoints
        2. Select rescuer (person with hands closest together)
        3. MediaPipe Face Mesh → detect face for attention monitoring
        4. Periodic victim classification (best.pt)
        5. Return processed frame and metadata

        Args:
            frame: BGR image from camera

        Returns:
            (processed_frame, metadata_dict)
        """
        if frame is None or self.pose_model is None:
            return frame, self._empty_metadata()

        self.frame_height, self.frame_width = frame.shape[:2]
        now = time.time()

        # ── STEP 1: YOLOv8s-pose inference ──
        results = self.pose_model(frame, conf=VisionConfig.POSE_CONFIDENCE, verbose=False)
        self._last_results = results

        self.detected_persons = []
        self.rescuer = None
        hands_together = False
        best_person_kps = None

        if results and len(results) > 0 and results[0].keypoints is not None:
            kps_all = results[0].keypoints
            if kps_all.xy is not None and kps_all.xy.numel() > 0:
                best_person_kps, hands_together = self._select_rescuer(kps_all)

        # ── STEP 2: Build PersonDetection for rescuer ──
        if best_person_kps is not None:
            person = self._build_person_detection(best_person_kps, hands_together)
            self.detected_persons.append(person)
            if hands_together:
                person.is_rescuer = True
                self.rescuer = person

        # ── STEP 3: Face detection (attention monitoring) ──
        self.face_landmarks = None
        if self.face_mesh is not None:
            image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            image_rgb.flags.writeable = False
            face_results = self.face_mesh.process(image_rgb)
            if face_results.multi_face_landmarks:
                self.face_landmarks = face_results.multi_face_landmarks[0]

        # ── STEP 4: Periodic victim classification ──
        if (self.classifier_model and best_person_kps is not None and
                (now - self.last_classify_time) > VisionConfig.CLASSIFY_INTERVAL_SEC):
            self._classify_victim(frame)
            self.last_classify_time = now

        # ── STEP 5: Build metadata ──
        metadata = self._build_metadata(hands_together)

        return frame, metadata

    # ══════════════════════════════════════════════════════════════════════════
    #  VISUALIZATION (YOLO skeleton + hand indicator)
    # ══════════════════════════════════════════════════════════════════════════

    def draw_visualization(self, frame: np.ndarray, metadata: Dict) -> np.ndarray:
        """
        Draw visual feedback overlays on frame.

        Custom skeleton + bounding boxes with victim classification labels
        instead of YOLO's default "person" label.
        """
        if not runtime_config.show_skeleton:
            return frame

        # ── COCO skeleton connections ──
        SKELETON = [
            (5, 6), (5, 7), (7, 9), (6, 8), (8, 10),   # arms
            (5, 11), (6, 12), (11, 12),                   # torso
            (11, 13), (13, 15), (12, 14), (14, 16),       # legs
            (0, 1), (0, 2), (1, 3), (2, 4),               # head
        ]

        # Draw all detected persons with skeleton
        if self._last_results and len(self._last_results) > 0:
            result = self._last_results[0]
            if result.keypoints is not None and result.keypoints.xy is not None:
                xy = result.keypoints.xy.cpu().numpy()
                boxes = result.boxes

                for i in range(len(xy)):
                    kp = xy[i]

                    # ── Bounding box ──
                    if boxes is not None and i < len(boxes):
                        x1, y1, x2, y2 = boxes.xyxy[i].cpu().numpy().astype(int)
                        conf = float(boxes.conf[i])

                        # Use victim classification label instead of "person"
                        label = f"{self.victim_type} {self.victim_confidence:.0%}" if self.victim_confidence > 0 else self.victim_type
                        color = (0, 255, 0) if metadata.get('hands_superposed') and i == 0 else (255, 165, 0)

                        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

                        # Label background
                        text_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)[0]
                        cv2.rectangle(frame, (x1, y1 - text_size[1] - 8), (x1 + text_size[0] + 4, y1), color, -1)
                        cv2.putText(frame, label, (x1 + 2, y1 - 4),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)

                    # ── Skeleton lines ──
                    for (a, b) in SKELETON:
                        pt1 = kp[a]
                        pt2 = kp[b]
                        if pt1[0] > 0 and pt1[1] > 0 and pt2[0] > 0 and pt2[1] > 0:
                            cv2.line(frame,
                                     (int(pt1[0]), int(pt1[1])),
                                     (int(pt2[0]), int(pt2[1])),
                                     (0, 255, 0), 2)

                    # ── Keypoints ──
                    for j in range(len(kp)):
                        x, y = int(kp[j][0]), int(kp[j][1])
                        if x > 0 and y > 0:
                            cv2.circle(frame, (x, y), 4, (0, 0, 255), -1)

        # ── Hand indicator (yellow circle at hands center) ──
        if self.rescuer and metadata.get("hands_superposed"):
            hc = self.rescuer.hands_center
            if hc:
                cx, cy = int(hc[0]), int(hc[1])
                cv2.circle(frame, (cx, cy), 16, (0, 255, 255), -1)
                cv2.circle(frame, (cx, cy), 19, (255, 255, 0), 2)

        return frame

    # ══════════════════════════════════════════════════════════════════════════
    #  RESCUER SELECTION
    # ══════════════════════════════════════════════════════════════════════════

    def _select_rescuer(self, kps_all):
        """
        Select the person most likely performing CPR.
        Criteria: person with hands closest together (CPR hand position).
        """
        best_kps = None
        best_distance = float('inf')
        hands_together = False

        xy = kps_all.xy.cpu().numpy()  # (N, 17, 2)

        for i in range(len(xy)):
            kp = xy[i]
            lw = kp[PoseLandmarks.LEFT_WRIST]
            rw = kp[PoseLandmarks.RIGHT_WRIST]

            # Skip if wrists not detected
            if (lw[0] == 0 and lw[1] == 0) or (rw[0] == 0 and rw[1] == 0):
                continue

            dist = np.sqrt((lw[0] - rw[0])**2 + (lw[1] - rw[1])**2)
            if dist < best_distance:
                best_distance = dist
                best_kps = kp

        if best_kps is not None and best_distance < VisionConfig.HAND_SUPERPOSITION_THRESHOLD_PX:
            hands_together = True

        return best_kps, hands_together

    # ══════════════════════════════════════════════════════════════════════════
    #  PERSON DETECTION BUILDER
    # ══════════════════════════════════════════════════════════════════════════

    def _build_person_detection(self, kp: np.ndarray, hands_together: bool) -> PersonDetection:
        """Build a PersonDetection dataclass from a (17, 2) keypoint array."""
        KP = PoseLandmarks

        lw = (float(kp[KP.LEFT_WRIST][0]), float(kp[KP.LEFT_WRIST][1]))
        rw = (float(kp[KP.RIGHT_WRIST][0]), float(kp[KP.RIGHT_WRIST][1]))
        ls = (float(kp[KP.LEFT_SHOULDER][0]), float(kp[KP.LEFT_SHOULDER][1]))
        rs = (float(kp[KP.RIGHT_SHOULDER][0]), float(kp[KP.RIGHT_SHOULDER][1]))
        lh = (float(kp[KP.LEFT_HIP][0]), float(kp[KP.LEFT_HIP][1]))
        rh = (float(kp[KP.RIGHT_HIP][0]), float(kp[KP.RIGHT_HIP][1]))

        hands_center = ((lw[0] + rw[0]) / 2, (lw[1] + rw[1]) / 2)

        # Bounding box from all keypoints
        xs = kp[:, 0]
        ys = kp[:, 1]
        valid = (xs > 0) | (ys > 0)
        if valid.any():
            min_x, max_x = xs[valid].min(), xs[valid].max()
            min_y, max_y = ys[valid].min(), ys[valid].max()
            bbox = (int(min_x), int(min_y), int(max_x - min_x), int(max_y - min_y))
        else:
            bbox = (0, 0, 0, 0)

        return PersonDetection(
            person_id=0,
            keypoints=kp,
            visibility_score=1.0,
            bbox=bbox,
            left_wrist=lw,
            right_wrist=rw,
            left_shoulder=ls,
            right_shoulder=rs,
            left_hip=lh,
            right_hip=rh,
            hands_center=hands_center,
            is_rescuer=hands_together
        )

    # ══════════════════════════════════════════════════════════════════════════
    #  VICTIM CLASSIFICATION (best.pt)
    # ══════════════════════════════════════════════════════════════════════════

    def _classify_victim(self, frame):
        """Run best.pt classifier to determine victim type."""
        try:
            results = self.classifier_model(frame, verbose=False)
            if not results or len(results) == 0:
                return

            result = results[0]
            detected_name = None
            detected_conf = 0.0

            # Case 1: Classification model (has probs)
            if result.probs is not None:
                top1_idx = result.probs.top1
                top1_conf = float(result.probs.top1conf)
                if top1_conf >= VisionConfig.CLASSIFIER_CONFIDENCE:
                    if hasattr(result, 'names') and result.names:
                        detected_name = result.names.get(top1_idx, None)
                    detected_conf = top1_conf

            # Case 2: Detection model (has boxes)
            elif result.boxes is not None and len(result.boxes) > 0:
                confs = result.boxes.conf.cpu().numpy()
                cls_ids = result.boxes.cls.cpu().numpy().astype(int)
                best_idx = confs.argmax()
                best_conf = float(confs[best_idx])
                best_cls = int(cls_ids[best_idx])
                if best_conf >= VisionConfig.CLASSIFIER_CONFIDENCE:
                    if hasattr(result, 'names') and result.names:
                        detected_name = result.names.get(best_cls, None)
                    detected_conf = best_conf

            # Apply the classification
            if detected_name and detected_conf >= VisionConfig.CLASSIFIER_CONFIDENCE:
                normalized = detected_name.lower().strip()
                name_map = {
                    'adulte': 'adult', 'adult': 'adult',
                    'enfant': 'child', 'child': 'child',
                    'nourrisson': 'infant', 'infant': 'infant', 'bebe': 'infant', 'baby': 'infant',
                    'enceinte': 'pregnant', 'pregnant': 'pregnant',
                }
                self.victim_type = name_map.get(normalized, normalized)
                self.victim_confidence = detected_conf
                print(f"  [Classification] {detected_name} → {self.victim_type} ({detected_conf:.0%})")

        except Exception as e:
            print(f"  [Classification error] {e}")

    # ══════════════════════════════════════════════════════════════════════════
    #  METADATA
    # ══════════════════════════════════════════════════════════════════════════

    def _build_metadata(self, hands_together: bool) -> Dict:
        """Build metadata dictionary with detection results."""
        metadata = {
            "rescuer_detected": self.rescuer is not None,
            "hands_superposed": hands_together,
            "hands_on_chest": hands_together,  # Simplified: if hands together → on chest
            "face_detected": self.face_landmarks is not None,
            "confidence": 1.0 if self.rescuer else 0.0,
            "rescuer": self.rescuer,
            "face_landmarks": self.face_landmarks,
            "victim_type": self.victim_type,
            "victim_confidence": self.victim_confidence,
        }
        return metadata

    def _empty_metadata(self) -> Dict:
        """Return an empty metadata dict when no processing is possible."""
        return {
            "rescuer_detected": False,
            "hands_superposed": False,
            "hands_on_chest": False,
            "face_detected": False,
            "confidence": 0.0,
            "rescuer": None,
            "face_landmarks": None,
            "victim_type": self.victim_type if hasattr(self, 'victim_type') else "adult",
            "victim_confidence": 0.0,
        }

    # ══════════════════════════════════════════════════════════════════════════
    #  CLEANUP
    # ══════════════════════════════════════════════════════════════════════════

    def release(self):
        """Release resources."""
        if self.face_mesh is not None:
            self.face_mesh.close()
        # YOLO models don't need explicit cleanup
