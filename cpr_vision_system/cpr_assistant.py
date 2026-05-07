"""
CPR Vision System - CPR Assistant
==================================
Main orchestrator class that integrates all components for
real-time CPR assistance and analysis.

Uses YOLOv8s-pose for person detection and 17-keypoint pose
estimation, combined with signal processing, attention monitoring,
and decision engine modules.
"""

import cv2
import time
import numpy as np
from typing import Tuple, Dict, Optional

from .config import GUIDELINES, runtime_config, SystemState, PoseLandmarks
from .vision_engine import VisionEngine
from .signal_processor import SignalProcessor
from .attention_monitor import AttentionMonitor
from .decision_engine import DecisionEngine
from .feedback_manager import FeedbackManager


class CPRAssistant:
    """
    Main CPR Assistant class — orchestrates all vision and signal processing.

    This class integrates:
    - VisionEngine: YOLOv8 pose detection, victim classification, face mesh
    - SignalProcessor: Compression analysis (BPM, depth)
    - AttentionMonitor: Rescuer focus tracking
    - DecisionEngine: CPR protocol logic
    - FeedbackManager: Visual and audio feedback

    Usage:
        assistant = CPRAssistant(victim_category="ADULT")
        while True:
            frame = camera.read()
            processed_frame, metrics = assistant.process_frame(frame)
            cv2.imshow("CPR", processed_frame)
    """

    def __init__(self,
                 victim_category: str = "ADULT",
                 enable_audio: bool = True,
                 verbose: bool = False):
        """
        Initialize CPR Assistant with all components.

        Args:
            victim_category: "ADULT", "CHILD", or "INFANT"
            enable_audio: Enable text-to-speech feedback
            verbose: Enable verbose logging
        """
        self.victim_category = victim_category
        self.audio_enabled = enable_audio
        self.verbose = verbose

        # Update runtime config
        runtime_config.victim_category = victim_category
        runtime_config.verbose_logging = verbose

        # Initialize components
        self.vision_engine = VisionEngine()
        self.signal_processor = SignalProcessor()
        self.attention_monitor = AttentionMonitor()
        self.decision_engine = DecisionEngine()
        self.feedback_manager = FeedbackManager()

        # State tracking
        self.state = SystemState.DETECTING_RESCUER
        self.session_start_time = time.time()
        self.frame_count = 0
        self.last_feedback_time = 0

        # Metrics history for averaging
        self.bpm_history = []
        self.depth_history = []

        if verbose:
            print(f"CPRAssistant initialized for {victim_category} victim")
            print(f"Guidelines: {GUIDELINES[victim_category]}")

    def process_frame(self, frame: np.ndarray) -> Tuple[np.ndarray, Dict]:
        """
        Process a single video frame through the entire CPR analysis pipeline.

        Pipeline:
        1. VisionEngine (YOLOv8): Detect pose, identify rescuer, classify victim
        2. Draw skeleton overlay via YOLO
        3. SignalProcessor: Analyze wrist movement for compression detection
        4. AttentionMonitor: Check if rescuer is focused
        5. DecisionEngine: Apply CPR protocol rules
        6. FeedbackManager: Render HUD overlays
        7. Build comprehensive metrics dict

        Args:
            frame: BGR image from camera

        Returns:
            (processed_frame, metrics_dict)
        """
        self.frame_count += 1
        current_time = time.time()

        # ── Step 1: Vision Processing (YOLOv8 pose + classification) ──
        vis_frame, vision_metadata = self.vision_engine.process_frame(frame)

        # ── Step 2: Draw visualisation (skeleton, hand indicator) ──
        vis_frame = self.vision_engine.draw_visualization(vis_frame, vision_metadata)

        # ── Step 3: Signal Processing — compression motion ──
        signal_metrics = {'bpm': 0, 'depth': 0, 'new_compression': False}

        if vision_metadata.get('rescuer_detected') and vision_metadata.get('hands_superposed'):
            rescuer = vision_metadata.get('rescuer')
            if rescuer:
                # Get wrist Y-coordinate for compression tracking
                wrist_y = None

                if rescuer.left_wrist and rescuer.right_wrist:
                    wrist_y = (rescuer.left_wrist[1] + rescuer.right_wrist[1]) / 2
                elif rescuer.left_wrist:
                    wrist_y = rescuer.left_wrist[1]
                elif rescuer.right_wrist:
                    wrist_y = rescuer.right_wrist[1]

                # Prefer hands_center if available
                if hasattr(rescuer, 'hands_center') and rescuer.hands_center:
                    wrist_y = rescuer.hands_center[1]

                if wrist_y and wrist_y > 0:
                    bpm, depth, new_compression = self.signal_processor.process_wrist_position(wrist_y)
                    signal_metrics = {
                        'bpm': bpm,
                        'depth': depth,
                        'new_compression': new_compression
                    }

                    # Track history
                    if bpm > 0:
                        self.bpm_history.append(bpm)
                        if len(self.bpm_history) > 30:
                            self.bpm_history.pop(0)
                    if depth > 0:
                        self.depth_history.append(depth)
                        if len(self.depth_history) > 30:
                            self.depth_history.pop(0)

        # ── Step 4: Attention Monitoring ──
        attention_status = {'focused': True, 'warning': None}
        if vision_metadata.get('face_detected'):
            face_landmarks = vision_metadata.get('face_landmarks')
            if face_landmarks:
                img_shape = (frame.shape[0], frame.shape[1])
                attention_state = self.attention_monitor.process_face_landmarks(
                    face_landmarks, img_shape
                )
                attention_status = {
                    'focused': attention_state.is_focused,
                    'warning': 'DISTRACTED' if not attention_state.is_focused else None,
                    'distraction_duration': attention_state.distraction_duration
                }

        # ── Step 5: Decision Engine — protocol rules ──
        signal_summary = self.signal_processor.get_metrics_summary()
        decision_metrics = {
            'current_bpm': signal_summary.get('bpm', 0),
            'compression_count': signal_summary.get('total_compressions', 0),
            'avg_depth': signal_summary.get('average_depth_pixels', 0),
            'recoil_quality': signal_summary.get('recoil_quality', 0)
        }
        decision = self.decision_engine.evaluate(
            vision_metadata=vision_metadata,
            signal_metrics=decision_metrics,
            attention_status=attention_status,
            victim_category=self.victim_category
        )

        # Update state
        self.state = decision.get('state', self.state)

        # ── Step 6: Skip backend HUD — React Native frontend renders its own UI ──
        # Only pass the YOLO skeleton frame (vis_frame) to the mobile app.
        # The frontend handles all metrics display, guidance text, and TTS.
        output_frame = vis_frame

        # ── Step 7: Build comprehensive metrics dict ──
        # Sync victim type from VisionEngine's classifier
        victim_type = vision_metadata.get('victim_type', self.victim_category.lower())
        victim_confidence = vision_metadata.get('victim_confidence', 0.0)

        metrics = {
            'state': str(self.state),
            'bpm': signal_summary.get('bpm', 0),
            'compression_count': signal_summary.get('total_compressions', 0),
            'avg_depth_cm': self._pixels_to_cm(signal_summary.get('average_depth_pixels', 0)),
            'recoil_quality': signal_summary.get('recoil_quality', 0) * 100,
            'rescuer_detected': vision_metadata.get('rescuer_detected', False),
            'hands_superposed': vision_metadata.get('hands_superposed', False),
            'hands_on_chest': vision_metadata.get('hands_on_chest', False),
            'face_detected': vision_metadata.get('face_detected', False),
            'attention_focused': attention_status.get('focused', True),
            'guidance': decision.get('guidance', ''),
            'elapsed_time': current_time - self.session_start_time,
            'frame_count': self.frame_count,
            'victim_type': victim_type,
            'victim_confidence': round(victim_confidence, 2),
        }

        if self.verbose and self.frame_count % 30 == 0:
            print(f"[{self.frame_count}] BPM: {metrics['bpm']:.0f}, "
                  f"Compressions: {metrics['compression_count']}, "
                  f"State: {metrics['state']}")

        return output_frame, metrics

    def _pixels_to_cm(self, pixels: float) -> float:
        """
        Convert pixel displacement to approximate centimeters.
        Uses a rough approximation based on typical camera setup.
        """
        PIXELS_PER_CM = 15.0
        return pixels / PIXELS_PER_CM

    def set_victim_category(self, category: str):
        """Change the victim category (ADULT, CHILD, INFANT)."""
        if category in GUIDELINES:
            self.victim_category = category
            runtime_config.victim_category = category
            if hasattr(self.decision_engine, 'set_victim_category'):
                self.decision_engine.set_victim_category(category)
            if self.verbose:
                print(f"Victim category changed to: {category}")

    def toggle_audio(self):
        """Toggle audio feedback on/off."""
        self.audio_enabled = not self.audio_enabled

    def reset(self):
        """Reset all counters and state."""
        self.signal_processor.reset()
        if hasattr(self.decision_engine, 'reset'):
            self.decision_engine.reset()
        self.attention_monitor.reset()
        self.bpm_history.clear()
        self.depth_history.clear()
        self.session_start_time = time.time()
        self.frame_count = 0
        self.state = SystemState.DETECTING_RESCUER

        if self.verbose:
            print("CPRAssistant reset complete")

    def get_final_metrics(self) -> Dict:
        """Get final session metrics for summary."""
        signal_metrics = self.signal_processor.get_metrics_summary()

        return {
            'total_compressions': signal_metrics.get('total_compressions', 0),
            'avg_bpm': np.mean(self.bpm_history) if self.bpm_history else 0,
            'avg_depth': np.mean(self.depth_history) if self.depth_history else 0,
            'recoil_quality': signal_metrics.get('recoil_quality', 0),
            'duration': time.time() - self.session_start_time,
            'total_frames': self.frame_count
        }

    def release(self):
        """Release all resources."""
        self.vision_engine.release()
        if self.verbose:
            print("CPRAssistant resources released")
