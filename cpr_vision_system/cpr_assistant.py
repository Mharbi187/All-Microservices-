"""
CPR Vision System - CPR Assistant
==================================
Main orchestrator class that integrates all components for
real-time CPR assistance and analysis.
"""

import cv2
import time
import numpy as np
from typing import Tuple, Dict, Optional

from .config import GUIDELINES, runtime_config, SystemState
from .vision_engine import VisionEngine
from .signal_processor import SignalProcessor
from .attention_monitor import AttentionMonitor
from .decision_engine import DecisionEngine
from .feedback_manager import FeedbackManager


class CPRAssistant:
    """
    Main CPR Assistant class - orchestrates all vision and signal processing.
    
    This class integrates:
    - VisionEngine: Pose detection and tracking
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
        self.feedback_manager = FeedbackManager(enable_tts=enable_audio)
        
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
        1. Vision Engine: Detect pose, identify rescuer, track hands
        2. Signal Processor: Analyze wrist movement for compression detection
        3. Attention Monitor: Check if rescuer is focused
        4. Decision Engine: Apply CPR protocol rules
        5. Feedback Manager: Render visual overlays and provide guidance
        
        Args:
            frame: BGR image from camera
        
        Returns:
            (processed_frame, metrics_dict)
        """
        self.frame_count += 1
        current_time = time.time()
        
        # Step 1: Vision Processing - detect poses and identify rescuer
        vis_frame, vision_metadata = self.vision_engine.process_frame(frame)
        
        # Step 2: Signal Processing - analyze compression motion
        signal_metrics = {'bpm': 0, 'depth': 0, 'new_compression': False}
        
        if vision_metadata.get('rescuer_detected') and vision_metadata.get('hands_superposed'):
            # Get wrist position from vision engine
            wrist_y = vision_metadata.get('hands_y', 0)
            if wrist_y > 0:
                bpm, depth, new_compression = self.signal_processor.process_wrist_position(wrist_y)
                signal_metrics = {
                    'bpm': bpm,
                    'depth': depth,
                    'new_compression': new_compression
                }
                
                # Track history for averages
                if bpm > 0:
                    self.bpm_history.append(bpm)
                    if len(self.bpm_history) > 30:
                        self.bpm_history.pop(0)
                
                if depth > 0:
                    self.depth_history.append(depth)
                    if len(self.depth_history) > 30:
                        self.depth_history.pop(0)
        
        # Step 3: Attention Monitoring
        attention_status = {'focused': True, 'warning': None}
        if vision_metadata.get('face_detected'):
            face_landmarks = vision_metadata.get('face_landmarks')
            if face_landmarks:
                attention_status = self.attention_monitor.check_attention(face_landmarks)
        
        # Step 4: Decision Engine - apply protocol rules
        signal_summary = self.signal_processor.get_metrics_summary()
        decision = self.decision_engine.evaluate(
            vision_metadata=vision_metadata,
            signal_metrics=signal_summary,
            attention_status=attention_status,
            victim_category=self.victim_category
        )
        
        # Update state
        self.state = decision.get('state', self.state)
        
        # Step 5: Feedback Manager - render overlays
        guidelines = GUIDELINES.get(self.victim_category)
        output_frame = self.feedback_manager.render_hud(
            frame=vis_frame,
            metrics=signal_summary,
            state=self.state,
            decision=decision,
            guidelines=guidelines
        )
        
        # Audio feedback (throttled)
        if self.audio_enabled and current_time - self.last_feedback_time > 3.0:
            guidance_message = decision.get('guidance')
            if guidance_message:
                self.feedback_manager.speak(guidance_message)
                self.last_feedback_time = current_time
        
        # Build comprehensive metrics dict
        metrics = {
            'state': str(self.state),
            'bpm': signal_summary.get('current_bpm', 0),
            'compression_count': signal_summary.get('compression_count', 0),
            'avg_depth_cm': self._pixels_to_cm(signal_summary.get('avg_depth', 0)),
            'recoil_quality': signal_summary.get('recoil_quality', 0),
            'rescuer_detected': vision_metadata.get('rescuer_detected', False),
            'hands_superposed': vision_metadata.get('hands_superposed', False),
            'face_detected': vision_metadata.get('face_detected', False),
            'attention_focused': attention_status.get('focused', True),
            'guidance': decision.get('guidance', ''),
            'elapsed_time': current_time - self.session_start_time,
            'frame_count': self.frame_count
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
        In production, this should be calibrated per setup.
        
        Args:
            pixels: Displacement in pixels
        
        Returns:
            Approximate displacement in centimeters
        """
        # Approximation: at typical distance, 1 cm ≈ 15 pixels
        # This should be calibrated based on camera setup
        PIXELS_PER_CM = 15.0
        return pixels / PIXELS_PER_CM
    
    def set_victim_category(self, category: str):
        """
        Change the victim category (ADULT, CHILD, INFANT).
        
        Args:
            category: New victim category
        """
        if category in GUIDELINES:
            self.victim_category = category
            runtime_config.victim_category = category
            self.decision_engine.set_victim_category(category)
            
            if self.verbose:
                print(f"Victim category changed to: {category}")
    
    def toggle_audio(self):
        """Toggle audio feedback on/off."""
        self.audio_enabled = not self.audio_enabled
        self.feedback_manager.enable_tts = self.audio_enabled
    
    def reset(self):
        """Reset all counters and state."""
        self.signal_processor.reset()
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
        """
        Get final session metrics for summary.
        
        Returns:
            Dictionary with session statistics
        """
        signal_metrics = self.signal_processor.get_metrics_summary()
        
        return {
            'total_compressions': signal_metrics.get('compression_count', 0),
            'avg_bpm': np.mean(self.bpm_history) if self.bpm_history else 0,
            'avg_depth': np.mean(self.depth_history) if self.depth_history else 0,
            'recoil_quality': signal_metrics.get('recoil_quality', 0),
            'duration': time.time() - self.session_start_time,
            'total_frames': self.frame_count
        }
    
    def release(self):
        """Release all resources."""
        self.vision_engine.release()
        self.feedback_manager.release()
        
        if self.verbose:
            print("CPRAssistant resources released")
