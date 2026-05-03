"""
CPR Detection - Standalone Demo
================================
Simplified real-time CPR detection script that works independently.
Uses MediaPipe Pose for person detection and motion analysis.

Usage:
    python run_cpr_detection.py              # Use default camera
    python run_cpr_detection.py --camera 1   # Use specific camera
    python run_cpr_detection.py --video path/to/video.mp4

Author: CPR Vision Team
"""

import os
# Fix protobuf compatibility issues
os.environ['PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION'] = 'python'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

import cv2
import numpy as np
import time
import argparse
from collections import deque
from dataclasses import dataclass
from enum import Enum

# MediaPipe import with error handling
try:
    import mediapipe as mp
    MEDIAPIPE_AVAILABLE = True
    print("MediaPipe loaded successfully!")
except Exception as e:
    print(f"Warning: MediaPipe not available ({e}). Using OpenCV detection.")
    MEDIAPIPE_AVAILABLE = False


# ============================================
# CONFIGURATION
# ============================================

class CPRConfig:
    """Configuration parameters for CPR detection."""
    # Guidelines (AHA/ERC 2021)
    TARGET_BPM_MIN = 100
    TARGET_BPM_MAX = 120
    TARGET_DEPTH_CM_MIN = 5.0
    TARGET_DEPTH_CM_MAX = 6.0
    
    # Detection thresholds
    HAND_OVERLAP_THRESHOLD = 50  # pixels
    MIN_COMPRESSION_MOVEMENT = 20  # pixels
    MAX_COMPRESSION_MOVEMENT = 150  # pixels
    
    # Signal processing
    BPM_WINDOW_SIZE = 10
    SMOOTHING_ALPHA = 0.3


class CompressionState(Enum):
    """State machine for compression detection."""
    WAITING = 1
    COMPRESSING = 2
    RELEASING = 3


# ============================================
# CPR DETECTOR CLASS
# ============================================

class CPRDetector:
    """Real-time CPR quality detection and analysis."""
    
    def __init__(self):
        """Initialize detector with MediaPipe Pose."""
        if MEDIAPIPE_AVAILABLE:
            self.mp_pose = mp.solutions.pose
            self.mp_drawing = mp.solutions.drawing_utils
            self.pose = self.mp_pose.Pose(
                static_image_mode=False,
                model_complexity=1,
                enable_segmentation=False,
                min_detection_confidence=0.6,
                min_tracking_confidence=0.6
            )
        else:
            self.pose = None
        
        # Compression tracking
        self.state = CompressionState.WAITING
        self.compression_count = 0
        self.compression_times = deque(maxlen=CPRConfig.BPM_WINDOW_SIZE)
        self.current_bpm = 0
        
        # Position tracking
        self.wrist_y_history = deque(maxlen=30)
        self.baseline_y = None
        self.min_y_in_cycle = None
        self.max_y_in_cycle = None
        
        # Metrics
        self.depths = deque(maxlen=30)
        self.recoil_quality = 100.0
        
        # Timing
        self.last_compression_time = 0
        self.session_start = time.time()
    
    def process_frame(self, frame: np.ndarray):
        """
        Process a single video frame.
        
        Args:
            frame: BGR image from camera
            
        Returns:
            (annotated_frame, metrics_dict)
        """
        if frame is None:
            return frame, {}
        
        h, w = frame.shape[:2]
        
        # Convert to RGB for MediaPipe
        if MEDIAPIPE_AVAILABLE and self.pose:
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = self.pose.process(rgb_frame)
            
            if results.pose_landmarks:
                # Draw skeleton
                self.mp_drawing.draw_landmarks(
                    frame,
                    results.pose_landmarks,
                    self.mp_pose.POSE_CONNECTIONS,
                    self.mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=2, circle_radius=3),
                    self.mp_drawing.DrawingSpec(color=(255, 0, 0), thickness=2)
                )
                
                # Get wrist positions
                landmarks = results.pose_landmarks.landmark
                left_wrist = landmarks[self.mp_pose.PoseLandmark.LEFT_WRIST]
                right_wrist = landmarks[self.mp_pose.PoseLandmark.RIGHT_WRIST]
                
                # Calculate wrist center in pixels
                wrist_x = int((left_wrist.x + right_wrist.x) / 2 * w)
                wrist_y = int((left_wrist.y + right_wrist.y) / 2 * h)
                
                # Check if hands are together (CPR position)
                hand_distance = abs(left_wrist.x - right_wrist.x) * w
                hands_together = hand_distance < CPRConfig.HAND_OVERLAP_THRESHOLD
                
                if hands_together:
                    # Draw hand position indicator
                    cv2.circle(frame, (wrist_x, wrist_y), 15, (0, 255, 255), -1)
                    cv2.circle(frame, (wrist_x, wrist_y), 18, (255, 255, 0), 2)
                    
                    # Analyze compression motion
                    self._analyze_compression(wrist_y, time.time())
                
                # Draw hands-together indicator
                if hands_together:
                    cv2.putText(frame, "HANDS READY", (w - 150, 30),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        
        # Draw HUD overlay
        frame = self._draw_hud(frame)
        
        # Build metrics
        metrics = {
            'bpm': self.current_bpm,
            'compression_count': self.compression_count,
            'depth_cm': self._get_avg_depth_cm(),
            'recoil_quality': self.recoil_quality,
            'elapsed_time': time.time() - self.session_start
        }
        
        return frame, metrics
    
    def _analyze_compression(self, wrist_y: float, timestamp: float):
        """
        Analyze wrist motion for compression detection.
        
        Uses a state machine approach:
        - WAITING: Looking for downward movement
        - COMPRESSING: Hand moving down
        - RELEASING: Hand moving back up
        """
        self.wrist_y_history.append(wrist_y)
        
        if len(self.wrist_y_history) < 3:
            return
        
        # Calculate movement trend
        recent_y = list(self.wrist_y_history)[-5:]
        if len(recent_y) >= 3:
            movement = recent_y[-1] - recent_y[0]  # positive = moving down
        else:
            return
        
        # State machine transitions
        if self.state == CompressionState.WAITING:
            if movement > CPRConfig.MIN_COMPRESSION_MOVEMENT:
                # Starting compression
                self.state = CompressionState.COMPRESSING
                self.min_y_in_cycle = wrist_y
                self.max_y_in_cycle = wrist_y
        
        elif self.state == CompressionState.COMPRESSING:
            # Track maximum depth
            if wrist_y > self.min_y_in_cycle:
                self.min_y_in_cycle = wrist_y
            
            # Check for release (hand moving up)
            if movement < -CPRConfig.MIN_COMPRESSION_MOVEMENT:
                self.state = CompressionState.RELEASING
                self.max_y_in_cycle = wrist_y
        
        elif self.state == CompressionState.RELEASING:
            # Track release position
            if wrist_y < self.max_y_in_cycle:
                self.max_y_in_cycle = wrist_y
            
            # Check for cycle completion (back to baseline)
            if movement > CPRConfig.MIN_COMPRESSION_MOVEMENT:
                # Cycle complete - count compression
                self._count_compression(timestamp)
                self.state = CompressionState.COMPRESSING
    
    def _count_compression(self, timestamp: float):
        """Record a completed compression and update BPM."""
        self.compression_count += 1
        self.compression_times.append(timestamp)
        
        # Calculate BPM from recent compressions
        if len(self.compression_times) >= 2:
            times = list(self.compression_times)
            intervals = [times[i+1] - times[i] for i in range(len(times)-1)]
            avg_interval = np.mean(intervals)
            if avg_interval > 0:
                self.current_bpm = 60.0 / avg_interval
        
        # Store depth
        if self.min_y_in_cycle and self.max_y_in_cycle:
            depth_px = abs(self.min_y_in_cycle - self.max_y_in_cycle)
            self.depths.append(depth_px)
        
        self.last_compression_time = timestamp
    
    def _get_avg_depth_cm(self) -> float:
        """Convert average depth from pixels to cm (approximate)."""
        if not self.depths:
            return 0.0
        avg_pixels = np.mean(self.depths)
        # Rough conversion: assume 20 pixels ≈ 1 cm at typical distance
        return avg_pixels / 20.0
    
    def _draw_hud(self, frame: np.ndarray) -> np.ndarray:
        """Draw heads-up display with metrics."""
        h, w = frame.shape[:2]
        
        # Semi-transparent background panel
        overlay = frame.copy()
        cv2.rectangle(overlay, (10, 10), (280, 180), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.6, frame, 0.4, 0, frame)
        
        # Title
        cv2.putText(frame, "CPR Assistant", (20, 35),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        # BPM with color coding
        bpm = self.current_bpm
        if CPRConfig.TARGET_BPM_MIN <= bpm <= CPRConfig.TARGET_BPM_MAX:
            bpm_color = (0, 255, 0)  # Green - good
        elif bpm > 0:
            bpm_color = (0, 165, 255)  # Orange - needs adjustment
        else:
            bpm_color = (128, 128, 128)  # Gray - no data
        
        cv2.putText(frame, f"BPM: {bpm:.0f}", (20, 70),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.9, bpm_color, 2)
        
        # Target range indicator
        cv2.putText(frame, f"(Target: {CPRConfig.TARGET_BPM_MIN}-{CPRConfig.TARGET_BPM_MAX})", 
                   (140, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (150, 150, 150), 1)
        
        # Compression count
        cv2.putText(frame, f"Compressions: {self.compression_count}", (20, 100),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
        
        # Depth estimate
        depth = self._get_avg_depth_cm()
        if CPRConfig.TARGET_DEPTH_CM_MIN <= depth <= CPRConfig.TARGET_DEPTH_CM_MAX:
            depth_color = (0, 255, 0)
        elif depth > 0:
            depth_color = (0, 165, 255)
        else:
            depth_color = (128, 128, 128)
        cv2.putText(frame, f"Depth: ~{depth:.1f} cm", (20, 130),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, depth_color, 1)
        
        # Elapsed time
        elapsed = time.time() - self.session_start
        mins = int(elapsed // 60)
        secs = int(elapsed % 60)
        cv2.putText(frame, f"Time: {mins:02d}:{secs:02d}", (20, 160),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (150, 150, 150), 1)
        
        # State indicator
        state_colors = {
            CompressionState.WAITING: (255, 255, 0),
            CompressionState.COMPRESSING: (0, 255, 0),
            CompressionState.RELEASING: (0, 200, 255)
        }
        cv2.circle(frame, (260, 30), 10, state_colors.get(self.state, (255, 255, 255)), -1)
        
        # Guidance message at bottom
        if self.current_bpm > 0:
            if self.current_bpm < CPRConfig.TARGET_BPM_MIN:
                msg = "Plus vite! / Faster!"
                color = (0, 165, 255)
            elif self.current_bpm > CPRConfig.TARGET_BPM_MAX:
                msg = "Ralentissez! / Slower!"
                color = (0, 165, 255)
            else:
                msg = "Bon rythme! / Good rhythm!"
                color = (0, 255, 0)
            
            text_size = cv2.getTextSize(msg, cv2.FONT_HERSHEY_SIMPLEX, 0.8, 2)[0]
            text_x = (w - text_size[0]) // 2
            cv2.putText(frame, msg, (text_x, h - 30),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
        
        return frame
    
    def reset(self):
        """Reset all counters and state."""
        self.state = CompressionState.WAITING
        self.compression_count = 0
        self.compression_times.clear()
        self.current_bpm = 0
        self.wrist_y_history.clear()
        self.depths.clear()
        self.session_start = time.time()
    
    def release(self):
        """Release resources."""
        if MEDIAPIPE_AVAILABLE and self.pose:
            self.pose.close()


# ============================================
# MAIN FUNCTION
# ============================================

def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description='CPR Detection Demo')
    parser.add_argument('--camera', '-c', type=int, default=0, help='Camera index')
    parser.add_argument('--video', '-v', type=str, help='Video file path')
    args = parser.parse_args()
    
    # Open video source
    if args.video:
        cap = cv2.VideoCapture(args.video)
        source = args.video
    else:
        cap = cv2.VideoCapture(args.camera)
        source = f"Camera {args.camera}"
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    
    if not cap.isOpened():
        print(f"Error: Cannot open {source}")
        return
    
    print(f"\n{'='*50}")
    print("  CPR Detection System - Real-time Demo")
    print(f"{'='*50}")
    print(f"  Source: {source}")
    print(f"  MediaPipe: {'Available' if MEDIAPIPE_AVAILABLE else 'NOT AVAILABLE'}")
    print(f"{'='*50}")
    print("\nControls:")
    print("  q - Quit")
    print("  r - Reset counters")
    print(f"{'='*50}\n")
    
    # Initialize detector
    detector = CPRDetector()
    
    # Main loop
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                if args.video:
                    print("End of video")
                break
            
            # Process frame
            frame, metrics = detector.process_frame(frame)
            
            # Display
            cv2.imshow("CPR Detection", frame)
            
            # Keyboard input
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break
            elif key == ord('r'):
                detector.reset()
                print("Counters reset")
    
    except KeyboardInterrupt:
        print("\nInterrupted")
    
    finally:
        # Summary
        print(f"\n{'='*50}")
        print("  Session Summary")
        print(f"{'='*50}")
        print(f"  Total Compressions: {detector.compression_count}")
        print(f"  Final BPM: {detector.current_bpm:.1f}")
        print(f"  Avg Depth: {detector._get_avg_depth_cm():.1f} cm")
        print(f"{'='*50}\n")
        
        detector.release()
        cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
