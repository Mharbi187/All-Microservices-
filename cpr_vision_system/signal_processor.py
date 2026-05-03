"""
CPR Vision System - Signal Processor
=====================================
Advanced signal processing for compression analysis:
- Temporal filtering (Kalman, Moving Average)
- Peak detection algorithm
- BPM calculation
- Compression depth estimation
- Chest recoil verification
"""

import numpy as np
import time
from collections import deque
from typing import Tuple, Optional, List
from dataclasses import dataclass

from .config import SignalProcessing, VisionConfig
from .utils import KalmanFilter1D, MovingAverageFilter


@dataclass
class CompressionEvent:
    """Single compression event data."""
    
    timestamp: float          # Time of compression (seconds)
    depth_pixels: float       # Compression depth in pixels
    duration: float           # Compression duration (seconds)
    full_recoil: bool         # Whether chest fully recoiled
    wrist_y_min: float        # Lowest Y position (deepest compression)
    wrist_y_max: float        # Highest Y position (full release)


class SignalProcessor:
    """
    Signal processing engine for CPR motion analysis.
    
    Analyzes the vertical movement of the rescuer's wrists to:
    1. Detect individual compression events
    2. Calculate compression rate (BPM)
    3. Estimate compression depth
    4. Verify chest recoil
    """
    
    def __init__(self):
        """Initialize signal processing components."""
        
        # Kalman filter for wrist Y-position smoothing
        self.kalman_filter = KalmanFilter1D(
            process_noise=SignalProcessing.KALMAN_PROCESS_NOISE,
            measurement_noise=SignalProcessing.KALMAN_MEASUREMENT_NOISE
        )
        
        # Moving average filter for BPM smoothing
        self.bpm_filter = MovingAverageFilter(
            window_size=SignalProcessing.BPM_SMOOTHING_WINDOW
        )
        
        # Signal state
        self.wrist_y_history = deque(maxlen=100)  # Last 100 Y positions
        self.wrist_y_filtered = 0.0
        self.wrist_y_baseline = 0.0  # Reference position (full release)
        
        # Compression detection state machine
        self.state = "WAITING"  # States: WAITING, COMPRESSING, RELEASING
        self.compression_start_time = 0.0
        self.compression_min_y = float('inf')
        self.compression_max_y = float('-inf')
        
        # Compression history
        self.compression_events: deque = deque(maxlen=30)  # Last 30 compressions
        self.last_compression_time = 0.0
        
        # Metrics
        self.current_bpm = 0
        self.average_depth_pixels = 0.0
        self.recoil_quality = 1.0  # 0.0 = poor, 1.0 = excellent
        
    def process_wrist_position(self, wrist_y: float) -> Tuple[int, float, bool]:
        """
        Process new wrist Y-position measurement.
        
        This is the main signal processing pipeline:
        1. Filter raw measurement (Kalman)
        2. Detect compression events (peak detection)
        3. Calculate BPM
        4. Assess compression quality
        
        Args:
            wrist_y: Current Y-coordinate of rescuer's wrist (pixels)
        
        Returns:
            (current_bpm, compression_depth_pixels, new_compression_detected)
        """
        current_time = time.time()
        
        # === STEP 1: Filter noisy measurement ===
        self.wrist_y_filtered = self.kalman_filter.update(wrist_y)
        self.wrist_y_history.append(self.wrist_y_filtered)
        
        # Initialize baseline if this is first measurement
        if self.wrist_y_baseline == 0.0:
            self.wrist_y_baseline = self.wrist_y_filtered
            return (0, 0.0, False)
        
        # === STEP 2: Update baseline (highest position = full release) ===
        # Baseline adapts slowly to handle camera movement
        alpha = 0.01  # Adaptation rate
        if self.wrist_y_filtered > self.wrist_y_baseline:
            self.wrist_y_baseline = (alpha * self.wrist_y_filtered + 
                                     (1 - alpha) * self.wrist_y_baseline)
        
        # === STEP 3: Compression State Machine ===
        new_compression = self._detect_compression_event(
            self.wrist_y_filtered,
            current_time
        )
        
        # === STEP 4: Calculate BPM ===
        if new_compression:
            self._update_bpm()
        
        # === STEP 5: Calculate average compression depth ===
        self._update_average_depth()
        
        # === STEP 6: Assess recoil quality ===
        self._update_recoil_quality()
        
        return (self.current_bpm, self.average_depth_pixels, new_compression)
    
    def _detect_compression_event(self, y_position: float, timestamp: float) -> bool:
        """
        Detect compression events using a state machine approach.
        
        State transitions:
        WAITING → COMPRESSING: Y position decreases significantly
        COMPRESSING → RELEASING: Y position starts increasing
        RELEASING → WAITING: Y position returns near baseline
        
        This approach is more robust than simple peak detection because
        it tracks the entire compression-release cycle.
        
        Args:
            y_position: Current filtered Y position
            timestamp: Current time
        
        Returns:
            True if a new compression was detected and counted
        """
        # Anti-bounce: prevent counting same compression multiple times
        if (timestamp - self.last_compression_time) < SignalProcessing.ANTI_BOUNCE_DELAY_SEC:
            return False
        
        # Displacement from baseline
        displacement = self.wrist_y_baseline - y_position
        
        # === STATE MACHINE ===
        
        if self.state == "WAITING":
            # Looking for start of compression (downward movement)
            if displacement > VisionConfig.MIN_COMPRESSION_DISPLACEMENT_PX:
                self.state = "COMPRESSING"
                self.compression_start_time = timestamp
                self.compression_min_y = y_position
                self.compression_max_y = self.wrist_y_baseline
        
        elif self.state == "COMPRESSING":
            # Track lowest point
            if y_position < self.compression_min_y:
                self.compression_min_y = y_position
            
            # Detect start of release (upward movement)
            if (y_position - self.compression_min_y) > (VisionConfig.MIN_COMPRESSION_DISPLACEMENT_PX * 0.3):
                self.state = "RELEASING"
        
        elif self.state == "RELEASING":
            # Track highest point during release
            if y_position > self.compression_max_y:
                self.compression_max_y = y_position
            
            # Check if returned to baseline (compression complete)
            recoil_percent = ((y_position - self.compression_min_y) / 
                             (self.wrist_y_baseline - self.compression_min_y)) * 100
            
            if recoil_percent >= VisionConfig.RECOIL_THRESHOLD_PERCENT:
                # Compression complete!
                duration = timestamp - self.compression_start_time
                
                # Validate compression duration
                if (SignalProcessing.COMPRESSION_MIN_DURATION_SEC <= duration <= 
                    SignalProcessing.COMPRESSION_MAX_DURATION_SEC):
                    
                    # Record compression event
                    compression = CompressionEvent(
                        timestamp=timestamp,
                        depth_pixels=self.wrist_y_baseline - self.compression_min_y,
                        duration=duration,
                        full_recoil=(recoil_percent >= 95),
                        wrist_y_min=self.compression_min_y,
                        wrist_y_max=self.compression_max_y
                    )
                    
                    self.compression_events.append(compression)
                    self.last_compression_time = timestamp
                    self.state = "WAITING"
                    
                    return True  # New compression detected!
            
            # If stuck in RELEASING for too long, reset
            if (timestamp - self.compression_start_time) > SignalProcessing.COMPRESSION_MAX_DURATION_SEC * 2:
                self.state = "WAITING"
        
        return False
    
    def _update_bpm(self) -> None:
        """
        Calculate compression rate (BPM) from recent compression events.
        
        Uses time intervals between last N compressions to compute
        average rate in beats per minute.
        """
        if len(self.compression_events) < 2:
            self.current_bpm = 0
            return
        
        # Use last 5 compressions for BPM calculation
        recent_events = list(self.compression_events)[-5:]
        
        # Calculate time intervals
        intervals = []
        for i in range(1, len(recent_events)):
            interval = recent_events[i].timestamp - recent_events[i-1].timestamp
            intervals.append(interval)
        
        if intervals:
            # Average interval in seconds
            avg_interval = sum(intervals) / len(intervals)
            
            # Convert to BPM
            if avg_interval > 0:
                instant_bpm = 60.0 / avg_interval
                
                # Apply moving average filter for smoothing
                self.current_bpm = int(self.bpm_filter.update(instant_bpm))
    
    def _update_average_depth(self) -> None:
        """
        Calculate average compression depth from recent events.
        """
        if not self.compression_events:
            self.average_depth_pixels = 0.0
            return
        
        # Use last 10 compressions
        recent_events = list(self.compression_events)[-10:]
        depths = [event.depth_pixels for event in recent_events]
        
        self.average_depth_pixels = sum(depths) / len(depths)
    
    def _update_recoil_quality(self) -> None:
        """
        Assess chest recoil quality.
        
        Recoil quality is the percentage of compressions that achieved
        full chest recoil (return to baseline).
        """
        if not self.compression_events:
            self.recoil_quality = 1.0
            return
        
        recent_events = list(self.compression_events)[-10:]
        full_recoil_count = sum(1 for event in recent_events if event.full_recoil)
        
        self.recoil_quality = full_recoil_count / len(recent_events)
    
    def get_compression_count(self) -> int:
        """
        Get total number of compressions detected.
        
        Returns:
            Total compression count
        """
        return len(self.compression_events)
    
    def get_metrics_summary(self) -> dict:
        """
        Get comprehensive metrics summary.
        
        Returns:
            Dictionary with all current metrics
        """
        return {
            "bpm": self.current_bpm,
            "total_compressions": len(self.compression_events),
            "average_depth_pixels": self.average_depth_pixels,
            "recoil_quality": self.recoil_quality,
            "last_compression_time": self.last_compression_time,
            "state": self.state
        }
    
    def reset(self) -> None:
        """Reset all signal processing state."""
        self.kalman_filter = KalmanFilter1D(
            process_noise=SignalProcessing.KALMAN_PROCESS_NOISE,
            measurement_noise=SignalProcessing.KALMAN_MEASUREMENT_NOISE
        )
        self.bpm_filter.reset()
        self.wrist_y_history.clear()
        self.compression_events.clear()
        self.wrist_y_baseline = 0.0
        self.state = "WAITING"
        self.current_bpm = 0
