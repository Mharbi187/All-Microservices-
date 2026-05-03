"""
CPR Vision System - Attention Monitor
======================================
Rescuer concentration and attention monitoring using head pose estimation.
Detects when rescuer is distracted (looking away from victim).
"""

import time
from typing import Tuple, Optional
from dataclasses import dataclass

from .config import AttentionMonitoring
from .utils import estimate_head_pose


@dataclass
class AttentionState:
    """Current attention state of rescuer."""
    
    is_focused: bool              # Currently focused on victim
    distraction_duration: float   # How long distracted (seconds)
    head_pitch: float             # Current pitch angle (degrees)
    head_yaw: float               # Current yaw angle (degrees)
    head_roll: float              # Current roll angle (degrees)
    alert_triggered: bool         # Whether alert has been triggered


class AttentionMonitor:
    """
    Monitor rescuer's attention and concentration during CPR.
    
    Uses head pose estimation (Pitch, Yaw, Roll) to determine if
    the rescuer is visually focused on the victim.
    
    Criteria for "distraction":
    - |Yaw| > 30° (looking left/right)
    - Pitch > 20° (looking up)
    - Duration > 2 seconds
    """
    
    def __init__(self):
        """Initialize attention monitoring."""
        
        # Current state
        self.is_focused = True
        self.distraction_start_time = None
        self.last_alert_time = 0.0
        
        # Head pose tracking
        self.current_pitch = 0.0
        self.current_yaw = 0.0
        self.current_roll = 0.0
        
        # Alert state
        self.alert_active = False
        
    def process_face_landmarks(self, face_landmarks, image_shape: Tuple[int, int]) -> AttentionState:
        """
        Analyze rescuer's head pose to determine attention state.
        
        Args:
            face_landmarks: MediaPipe FaceMesh landmarks
            image_shape: (height, width) of image
        
        Returns:
            AttentionState object with current status
        """
        current_time = time.time()
        
        # No face detected
        if face_landmarks is None:
            return self._handle_no_face_detected(current_time)
        
        # === STEP 1: Estimate head pose ===
        self.current_pitch, self.current_yaw, self.current_roll = estimate_head_pose(
            face_landmarks,
            image_shape
        )
        
        # === STEP 2: Determine if rescuer is focused ===
        is_currently_focused = self._is_rescuer_focused()
        
        # === STEP 3: Track distraction duration ===
        if is_currently_focused:
            # Rescuer is focused
            self.is_focused = True
            self.distraction_start_time = None
            self.alert_active = False
        else:
            # Rescuer is distracted
            if self.distraction_start_time is None:
                # Just started being distracted
                self.distraction_start_time = current_time
            
            self.is_focused = False
        
        # === STEP 4: Calculate distraction duration ===
        distraction_duration = 0.0
        if self.distraction_start_time is not None:
            distraction_duration = current_time - self.distraction_start_time
        
        # === STEP 5: Trigger alert if threshold exceeded ===
        alert_triggered = False
        if (distraction_duration >= AttentionMonitoring.DISTRACTION_TIME_THRESHOLD_SEC and
            not self.alert_active):
            
            # Check alert cooldown (don't spam alerts)
            if (current_time - self.last_alert_time) > 5.0:  # 5 second cooldown
                alert_triggered = True
                self.alert_active = True
                self.last_alert_time = current_time
        
        # === STEP 6: Build state object ===
        return AttentionState(
            is_focused=self.is_focused,
            distraction_duration=distraction_duration,
            head_pitch=self.current_pitch,
            head_yaw=self.current_yaw,
            head_roll=self.current_roll,
            alert_triggered=alert_triggered
        )
    
    def _is_rescuer_focused(self) -> bool:
        """
        Determine if rescuer is focused based on head pose angles.
        
        Criteria for "focused":
        - |Yaw| < 30° (not looking too far left/right)
        - |Pitch| < 20° (not looking too far up/down)
        - |Roll| < 25° (head not tilted excessively)
        
        Returns:
            True if rescuer appears focused on victim
        """
        yaw_ok = abs(self.current_yaw) < AttentionMonitoring.MAX_YAW_ANGLE
        pitch_ok = abs(self.current_pitch) < AttentionMonitoring.MAX_PITCH_ANGLE
        roll_ok = abs(self.current_roll) < AttentionMonitoring.MAX_ROLL_ANGLE
        
        return yaw_ok and pitch_ok and roll_ok
    
    def _handle_no_face_detected(self, current_time: float) -> AttentionState:
        """
        Handle case when face is not detected.
        
        This could mean:
        1. Rescuer's face is occluded (leaning over victim) - NORMAL
        2. Rescuer has turned away completely - DISTRACTION
        
        We use a timeout: if no face for > 3 seconds, consider distracted.
        
        Args:
            current_time: Current timestamp
        
        Returns:
            AttentionState with conservative estimates
        """
        # If face was visible before and now isn't, start tracking
        if self.distraction_start_time is None:
            self.distraction_start_time = current_time
        
        distraction_duration = current_time - self.distraction_start_time
        
        # Only trigger alert after extended absence (likely turned away)
        alert_triggered = False
        if distraction_duration > 3.0 and not self.alert_active:
            if (current_time - self.last_alert_time) > 5.0:
                alert_triggered = True
                self.alert_active = True
                self.last_alert_time = current_time
        
        return AttentionState(
            is_focused=False,
            distraction_duration=distraction_duration,
            head_pitch=0.0,
            head_yaw=0.0,
            head_roll=0.0,
            alert_triggered=alert_triggered
        )
    
    def get_attention_summary(self) -> str:
        """
        Get human-readable attention status.
        
        Returns:
            Status string
        """
        if self.is_focused:
            return "FOCUSED"
        else:
            duration = time.time() - (self.distraction_start_time or time.time())
            return f"DISTRACTED ({duration:.1f}s)"
    
    def reset(self) -> None:
        """Reset attention monitoring state."""
        self.is_focused = True
        self.distraction_start_time = None
        self.alert_active = False
        self.current_pitch = 0.0
        self.current_yaw = 0.0
        self.current_roll = 0.0
