"""
CPR Detection - Ultralytics YOLOv8 Pipeline
=============================================
Uses:
  - YOLOv8s-pose  → person detection + 17-keypoint pose estimation
  - best.pt       → victim classification (adult / child / infant / pregnant)

Both models run through the ultralytics API for unified, high-perf inference.

Usage:
    python run_cpr_detection.py              # Default camera
    python run_cpr_detection.py --camera 1   # Specific camera
    python run_cpr_detection.py --video path/to/video.mp4
"""

import os
import cv2
import json
import numpy as np
import time
import argparse
from pathlib import Path
from collections import deque
from enum import Enum

# ─── Ultralytics import ──────────────────────────────────────────────────────

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
    print("✓ Ultralytics YOLO loaded")
except ImportError:
    YOLO_AVAILABLE = False
    print("✗ ultralytics not installed. Run: pip install ultralytics")

# ─── Load rcp_rules.json ──────────────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).parent
RULES_PATH = SCRIPT_DIR / "cpr_mobile_app" / "rcp_rules.json"
if RULES_PATH.exists():
    with open(RULES_PATH, encoding="utf-8") as f:
        RCP_RULES = json.load(f)
    print(f"✓ Loaded rcp_rules.json ({len(RCP_RULES.get('error_conditions', {}))} error conditions)")
else:
    RCP_RULES = {}
    print(f"✗ rcp_rules.json not found at {RULES_PATH}")

# ─── Model paths ──────────────────────────────────────────────────────────────

# YOLOv8s-pose: auto-downloaded by ultralytics on first run
POSE_MODEL_ID = "yolov8s-pose.pt"

# Victim classifier: your custom model
CLASSIFIER_PATH = SCRIPT_DIR / "cpr_mobile_app" / "best.pt"

# ═══════════════════════════════════════════════════════════════════════════════
#  CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

class CPRConfig:
    """AHA 2020 / ERC 2021 parameters + detection thresholds."""
    TARGET_BPM_MIN = 100
    TARGET_BPM_MAX = 120
    TARGET_DEPTH_CM_ADULT = (5.0, 6.0)

    # Detection
    HAND_OVERLAP_THRESHOLD = 60   # pixels — max distance between wrists for "hands together"
    MIN_COMPRESSION_MOVEMENT = 15 # pixels — minimum vertical displacement to start detection
    ANTI_BOUNCE_SEC = 0.25        # minimum interval between counted compressions

    # Signal processing
    BPM_WINDOW = 12               # compressions to average for BPM
    SMOOTHING_ALPHA = 0.3

    # YOLO confidence thresholds
    POSE_CONFIDENCE = 0.5
    CLASSIFIER_CONFIDENCE = 0.6

    # Classification cooldown (don't re-classify every frame)
    CLASSIFY_INTERVAL_SEC = 3.0


class CompressionState(Enum):
    WAITING = 1
    COMPRESSING = 2
    RELEASING = 3


# YOLOv8-pose keypoint indices (COCO 17-keypoint format)
class KP:
    NOSE = 0
    LEFT_EYE = 1
    RIGHT_EYE = 2
    LEFT_EAR = 3
    RIGHT_EAR = 4
    LEFT_SHOULDER = 5
    RIGHT_SHOULDER = 6
    LEFT_ELBOW = 7
    RIGHT_ELBOW = 8
    LEFT_WRIST = 9
    RIGHT_WRIST = 10
    LEFT_HIP = 11
    RIGHT_HIP = 12
    LEFT_KNEE = 13
    RIGHT_KNEE = 14
    LEFT_ANKLE = 15
    RIGHT_ANKLE = 16


# ═══════════════════════════════════════════════════════════════════════════════
#  CPR DETECTOR — YOLOv8 edition
# ═══════════════════════════════════════════════════════════════════════════════

class CPRDetector:
    """
    Real-time CPR quality detection using ultralytics YOLOv8.

    Pipeline per frame:
    1. YOLOv8s-pose  → detect persons + 17 keypoints
    2. Select rescuer → person with hands together + over another body
    3. Analyze motion → compression state machine on wrist Y
    4. best.pt        → classify victim type (periodically)
    5. Build metrics  → bpm, depth, recoil, arm angle, errors
    """

    def __init__(self):
        # ── Load models ──
        self.pose_model = None
        self.classifier_model = None

        if YOLO_AVAILABLE:
            print("Loading YOLOv8s-pose model...")
            self.pose_model = YOLO(POSE_MODEL_ID)
            print(f"✓ Pose model loaded: {POSE_MODEL_ID}")

            if CLASSIFIER_PATH.exists():
                print(f"Loading classifier: {CLASSIFIER_PATH}")
                self.classifier_model = YOLO(str(CLASSIFIER_PATH))
                # Print the actual class names from the model
                if hasattr(self.classifier_model, 'names'):
                    print(f"✓ Classifier loaded: best.pt")
                    print(f"  Model classes: {self.classifier_model.names}")
                    print(f"  Model task: {self.classifier_model.task}")
                else:
                    print(f"✓ Classifier loaded: best.pt (no class names found)")
            else:
                print(f"✗ Classifier not found at {CLASSIFIER_PATH}")

        # ── Compression analysis state ──
        self.state = CompressionState.WAITING
        self.compression_count = 0
        self.compression_times = deque(maxlen=CPRConfig.BPM_WINDOW)
        self.current_bpm = 0

        # Position tracking
        self.wrist_y_history = deque(maxlen=30)
        self.baseline_y = None
        self.peak_y = None       # deepest point in compression
        self.release_y = None    # highest point in release

        # Depth tracking
        self.depths_px = deque(maxlen=30)
        self.recoil_quality = 100.0
        self.last_compression_time = 0

        # Victim classification
        self.victim_type = "adult"
        self.victim_confidence = 0.0
        self.last_classify_time = 0
        self.class_names = {0: "adult", 1: "child", 2: "infant", 3: "pregnant"}

        # Torso reference (for normalized depth)
        self.torso_height_px = 0

        # Timing
        self.session_start = time.time()

    # ══════════════════════════════════════════════════════════════════════════
    #  MAIN PROCESSING
    # ══════════════════════════════════════════════════════════════════════════

    def process_frame(self, frame: np.ndarray):
        """
        Process a single video frame through the full pipeline.

        Returns:
            (annotated_frame, metrics_dict)
        """
        if frame is None or self.pose_model is None:
            return frame, self._empty_metrics()

        try:
            return self._process_frame_inner(frame)
        except Exception as e:
            import traceback
            print(f"  [ERROR] process_frame failed: {e}")
            traceback.print_exc()
            return frame, self._empty_metrics()

    def _process_frame_inner(self, frame: np.ndarray):
        """Inner processing — separated so exceptions are caught cleanly."""
        h, w = frame.shape[:2]
        now = time.time()

        # ── 1. YOLOv8s-pose inference ──
        results = self.pose_model(frame, conf=CPRConfig.POSE_CONFIDENCE, verbose=False)

        best_person_kps = None
        hands_together = False

        if results and len(results) > 0 and results[0].keypoints is not None:
            kps_all = results[0].keypoints

            if kps_all.xy is not None and kps_all.xy.numel() > 0:
                # ── 2. Select the rescuer (person with hands closest together) ──
                best_person_kps, hands_together = self._select_rescuer(kps_all, w, h)

        # ── 3. Analyze pose if rescuer found ──
        arm_angle = None
        wrist_center = None

        if best_person_kps is not None:
            kp = best_person_kps  # shape (17, 2) in pixel coords

            # Wrist positions
            lw = kp[KP.LEFT_WRIST]
            rw = kp[KP.RIGHT_WRIST]
            wrist_center = (float((lw[0] + rw[0]) / 2), float((lw[1] + rw[1]) / 2))

            # Shoulders and hips for torso height
            ls = kp[KP.LEFT_SHOULDER]
            rs = kp[KP.RIGHT_SHOULDER]
            lh = kp[KP.LEFT_HIP]
            rh = kp[KP.RIGHT_HIP]

            shoulder_mid_y = float((ls[1] + rs[1]) / 2)
            hip_mid_y = float((lh[1] + rh[1]) / 2)
            self.torso_height_px = abs(hip_mid_y - shoulder_mid_y)

            # Arm angle (elbow angle)
            arm_angle = self._compute_arm_angle(kp)

            # ── 4. Compression detection state machine ──
            if hands_together:
                self._analyze_compression(wrist_center[1], now)

                # Draw hand indicator
                cx, cy = int(wrist_center[0]), int(wrist_center[1])
                cv2.circle(frame, (cx, cy), 16, (0, 255, 255), -1)
                cv2.circle(frame, (cx, cy), 19, (255, 255, 0), 2)

            # Draw skeleton from YOLO results
            try:
                frame = results[0].plot(img=frame)
            except Exception:
                pass  # Non-critical — just skip skeleton drawing

        # ── 5. Periodic victim classification ──
        if self.classifier_model and (now - self.last_classify_time) > CPRConfig.CLASSIFY_INTERVAL_SEC:
            self._classify_victim(frame)
            self.last_classify_time = now

        # ── 6. Compute derived metrics ──
        depth_px = float(np.mean(self.depths_px)) if self.depths_px else 0
        depth_torso_pct = (depth_px / self.torso_height_px * 100) if self.torso_height_px > 0 else 0
        depth_cm = self._pixel_to_cm(depth_torso_pct)

        # Time since last compression (for pause detection)
        time_since_last = now - self.last_compression_time if self.last_compression_time > 0 else 0

        # ── 7. Draw HUD ──
        frame = self._draw_hud(frame, arm_angle, depth_cm, hands_together)

        # ── 8. Build metrics response ──
        metrics = {
            'bpm': round(float(self.current_bpm), 1),
            'compression_count': int(self.compression_count),
            'depth_cm': round(float(depth_cm), 1),
            'depth_torso_pct': round(depth_torso_pct, 1),
            'recoil_quality': round(self.recoil_quality, 0),
            'elapsed_time': round(now - self.session_start, 1),
            'arm_angle': round(arm_angle, 0) if arm_angle else None,
            'hands_together': hands_together,
            'victim_type': self.victim_type,
            'victim_confidence': round(self.victim_confidence, 2),
            'torso_height_px': round(self.torso_height_px, 0),
            'time_since_last_compression': round(time_since_last, 1),
        }

        return frame, metrics

    # ══════════════════════════════════════════════════════════════════════════
    #  RESCUER SELECTION
    # ══════════════════════════════════════════════════════════════════════════

    def _select_rescuer(self, kps_all, w, h):
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

            lw = kp[KP.LEFT_WRIST]
            rw = kp[KP.RIGHT_WRIST]

            # Skip if wrists not detected (zero coordinates)
            if (lw[0] == 0 and lw[1] == 0) or (rw[0] == 0 and rw[1] == 0):
                continue

            dist = np.sqrt((lw[0] - rw[0])**2 + (lw[1] - rw[1])**2)

            if dist < best_distance:
                best_distance = dist
                best_kps = kp

        if best_kps is not None and best_distance < CPRConfig.HAND_OVERLAP_THRESHOLD:
            hands_together = True

        return best_kps, hands_together

    # ══════════════════════════════════════════════════════════════════════════
    #  COMPRESSION STATE MACHINE
    # ══════════════════════════════════════════════════════════════════════════

    def _analyze_compression(self, wrist_y: float, timestamp: float):
        """State machine: WAITING → COMPRESSING → RELEASING → WAITING"""

        self.wrist_y_history.append(wrist_y)
        if len(self.wrist_y_history) < 3:
            return

        # Initialize baseline
        if self.baseline_y is None:
            self.baseline_y = wrist_y
            return

        # Movement trend (recent 5 frames)
        recent = list(self.wrist_y_history)[-5:]
        movement = recent[-1] - recent[0]  # positive = moving down in image

        if self.state == CompressionState.WAITING:
            if abs(movement) > CPRConfig.MIN_COMPRESSION_MOVEMENT:
                self.state = CompressionState.COMPRESSING
                self.peak_y = wrist_y
                self.baseline_y = recent[0]

        elif self.state == CompressionState.COMPRESSING:
            # Track deepest point
            if abs(wrist_y - self.baseline_y) > abs(self.peak_y - self.baseline_y):
                self.peak_y = wrist_y

            # Detect reversal → releasing
            depth = abs(self.peak_y - self.baseline_y)
            returned = abs(wrist_y - self.peak_y)
            if returned > depth * 0.35 and depth > CPRConfig.MIN_COMPRESSION_MOVEMENT:
                self.state = CompressionState.RELEASING
                self.release_y = wrist_y

        elif self.state == CompressionState.RELEASING:
            # Track release point
            if abs(wrist_y - self.baseline_y) < abs(self.release_y - self.baseline_y):
                self.release_y = wrist_y

            # Cycle complete?
            depth = abs(self.peak_y - self.baseline_y)
            recoil = abs(self.release_y - self.peak_y)
            recoil_pct = (recoil / depth * 100) if depth > 0 else 0

            if recoil_pct > 70:
                self._register_compression(timestamp, depth, recoil_pct)
                self.state = CompressionState.WAITING
                self.baseline_y = wrist_y

    def _register_compression(self, timestamp, depth_px, recoil_pct):
        """Count a completed compression."""
        # Anti-bounce
        if timestamp - self.last_compression_time < CPRConfig.ANTI_BOUNCE_SEC:
            return

        self.compression_count += 1
        self.compression_times.append(timestamp)
        self.last_compression_time = timestamp

        # Store depth
        self.depths_px.append(depth_px)

        # Update running recoil quality
        n = self.compression_count
        self.recoil_quality = ((n - 1) * self.recoil_quality + recoil_pct) / n

        # Calculate BPM
        if len(self.compression_times) >= 2:
            times = list(self.compression_times)
            intervals = [times[i+1] - times[i] for i in range(len(times) - 1)]
            avg_interval = np.mean(intervals)
            if avg_interval > 0:
                raw_bpm = 60.0 / avg_interval
                # Smooth BPM
                alpha = CPRConfig.SMOOTHING_ALPHA
                self.current_bpm = alpha * raw_bpm + (1 - alpha) * self.current_bpm

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

                if top1_conf >= CPRConfig.CLASSIFIER_CONFIDENCE:
                    if hasattr(result, 'names') and result.names:
                        detected_name = result.names.get(top1_idx, None)
                    detected_conf = top1_conf

            # Case 2: Detection model (has boxes)
            elif result.boxes is not None and len(result.boxes) > 0:
                # Pick the detection with highest confidence
                confs = result.boxes.conf.cpu().numpy()
                cls_ids = result.boxes.cls.cpu().numpy().astype(int)
                best_idx = confs.argmax()
                best_conf = float(confs[best_idx])
                best_cls = int(cls_ids[best_idx])

                if best_conf >= CPRConfig.CLASSIFIER_CONFIDENCE:
                    if hasattr(result, 'names') and result.names:
                        detected_name = result.names.get(best_cls, None)
                    detected_conf = best_conf

            # Apply the classification
            if detected_name and detected_conf >= CPRConfig.CLASSIFIER_CONFIDENCE:
                # Normalize name to match rcp_rules.json (lowercase)
                normalized = detected_name.lower().strip()
                # Map common variations
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
    #  ARM ANGLE CALCULATION
    # ══════════════════════════════════════════════════════════════════════════

    def _compute_arm_angle(self, kp):
        """Compute average elbow angle (shoulder→elbow→wrist)."""
        angles = []

        # Left arm
        ls, le, lw = kp[KP.LEFT_SHOULDER], kp[KP.LEFT_ELBOW], kp[KP.LEFT_WRIST]
        if all(p[0] > 0 or p[1] > 0 for p in [ls, le, lw]):
            angles.append(self._angle_at(ls, le, lw))

        # Right arm
        rs, re, rw = kp[KP.RIGHT_SHOULDER], kp[KP.RIGHT_ELBOW], kp[KP.RIGHT_WRIST]
        if all(p[0] > 0 or p[1] > 0 for p in [rs, re, rw]):
            angles.append(self._angle_at(rs, re, rw))

        return np.mean(angles) if angles else None

    def _angle_at(self, a, b, c):
        """Angle at point b formed by a-b-c."""
        ba = np.array([a[0] - b[0], a[1] - b[1]])
        bc = np.array([c[0] - b[0], c[1] - b[1]])
        cos_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-8)
        return np.degrees(np.arccos(np.clip(cos_angle, -1, 1)))

    # ══════════════════════════════════════════════════════════════════════════
    #  DEPTH ESTIMATION
    # ══════════════════════════════════════════════════════════════════════════

    def _pixel_to_cm(self, depth_torso_pct):
        """Convert torso-% depth to approximate cm."""
        # Average torso heights: adult≈45cm, child≈30cm, infant≈18cm
        torso_cm = {"adult": 45, "child": 30, "infant": 18, "pregnant": 45}
        tcm = torso_cm.get(self.victim_type, 45)
        return (depth_torso_pct / 100) * tcm

    # ══════════════════════════════════════════════════════════════════════════
    #  HUD DRAWING
    # ══════════════════════════════════════════════════════════════════════════

    def _draw_hud(self, frame, arm_angle, depth_cm, hands_together):
        h, w = frame.shape[:2]

        # ── Panel background ──
        overlay = frame.copy()
        cv2.rectangle(overlay, (10, 10), (310, 210), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.65, frame, 0.35, 0, frame)

        y0 = 35
        # Title + victim type
        cv2.putText(frame, f"CPR Assistant | {self.victim_type.upper()}", (20, y0),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

        # BPM
        bpm = self.current_bpm
        bpm_color = (0, 255, 0) if CPRConfig.TARGET_BPM_MIN <= bpm <= CPRConfig.TARGET_BPM_MAX else \
                    (0, 165, 255) if bpm > 0 else (128, 128, 128)
        cv2.putText(frame, f"BPM: {bpm:.0f}", (20, y0 + 35),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, bpm_color, 2)

        # Compressions
        cv2.putText(frame, f"Compressions: {self.compression_count}", (20, y0 + 65),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

        # Depth
        d_color = (0, 255, 0) if 5.0 <= depth_cm <= 6.0 else (0, 165, 255) if depth_cm > 0 else (128, 128, 128)
        cv2.putText(frame, f"Depth: ~{depth_cm:.1f} cm", (20, y0 + 90),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, d_color, 1)

        # Arm angle
        if arm_angle is not None:
            a_color = (0, 255, 0) if arm_angle >= 160 else (0, 165, 255)
            cv2.putText(frame, f"Arm angle: {arm_angle:.0f} deg", (20, y0 + 115),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, a_color, 1)

        # Recoil
        r_color = (0, 255, 0) if self.recoil_quality >= 85 else (0, 165, 255)
        cv2.putText(frame, f"Recoil: {self.recoil_quality:.0f}%", (20, y0 + 140),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, r_color, 1)

        # Time
        elapsed = time.time() - self.session_start
        cv2.putText(frame, f"Time: {int(elapsed//60):02d}:{int(elapsed%60):02d}", (20, y0 + 165),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (150, 150, 150), 1)

        # ── Hands status ──
        if hands_together:
            cv2.putText(frame, "HANDS READY", (w - 160, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

        # ── Guidance at bottom ──
        if self.current_bpm > 0:
            if self.current_bpm < CPRConfig.TARGET_BPM_MIN:
                msg, color = "Plus vite!", (0, 165, 255)
            elif self.current_bpm > CPRConfig.TARGET_BPM_MAX:
                msg, color = "Ralentissez!", (0, 165, 255)
            else:
                msg, color = "Bon rythme!", (0, 255, 0)
            ts = cv2.getTextSize(msg, cv2.FONT_HERSHEY_SIMPLEX, 0.9, 2)[0]
            cv2.putText(frame, msg, ((w - ts[0]) // 2, h - 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2)

        return frame

    def _empty_metrics(self):
        return {
            'bpm': 0, 'compression_count': 0, 'depth_cm': 0,
            'depth_torso_pct': 0, 'recoil_quality': 0, 'elapsed_time': 0,
            'arm_angle': None, 'hands_together': False,
            'victim_type': self.victim_type, 'victim_confidence': 0,
            'torso_height_px': 0, 'time_since_last_compression': 0,
        }

    def reset(self):
        self.state = CompressionState.WAITING
        self.compression_count = 0
        self.compression_times.clear()
        self.current_bpm = 0
        self.wrist_y_history.clear()
        self.depths_px.clear()
        self.baseline_y = None
        self.recoil_quality = 100.0
        self.session_start = time.time()

    def release(self):
        pass  # YOLO models don't need explicit cleanup


# ═══════════════════════════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description='CPR Detection — YOLOv8')
    parser.add_argument('--camera', '-c', type=int, default=0)
    parser.add_argument('--video', '-v', type=str)
    args = parser.parse_args()

    if not YOLO_AVAILABLE:
        print("\nInstall ultralytics first: pip install ultralytics")
        return

    # Open source
    cap = cv2.VideoCapture(args.video if args.video else args.camera)
    if not args.video:
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    if not cap.isOpened():
        print("Error: cannot open video source")
        return

    print(f"\n{'='*50}")
    print("  CPR Detection — YOLOv8s-pose + best.pt")
    print(f"{'='*50}")
    print("  q = quit  |  r = reset")
    print(f"{'='*50}\n")

    detector = CPRDetector()

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            frame, metrics = detector.process_frame(frame)
            cv2.imshow("CPR Detection (YOLOv8)", frame)

            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break
            elif key == ord('r'):
                detector.reset()
                print("Reset!")

    except KeyboardInterrupt:
        pass

    finally:
        print(f"\n{'='*50}")
        print("  Session Summary")
        print(f"{'='*50}")
        print(f"  Compressions: {detector.compression_count}")
        print(f"  BPM: {detector.current_bpm:.0f}")
        print(f"  Victim type: {detector.victim_type} ({detector.victim_confidence:.0%})")
        print(f"{'='*50}\n")

        detector.release()
        cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
