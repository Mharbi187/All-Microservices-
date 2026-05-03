"""
CPR Vision System - Feedback Manager
=====================================
User interface and feedback management:
- Visual HUD overlay
- Color-coded feedback
- Performance metrics display
- Audio feedback (future)
"""

import cv2
import numpy as np
from typing import Tuple

from .config import FeedbackConfig, runtime_config, GUIDELINES
from .decision_engine import CPRGuidance


class FeedbackManager:
    """
    Manages all user feedback (visual and audio).
    
    Provides clear, calm, actionable guidance without overwhelming
    the rescuer during a high-stress situation.
    """
    
    def __init__(self):
        """Initialize feedback manager."""
        
        # Display state
        self.frame_width = 0
        self.frame_height = 0
        
        # Message history (to avoid flickering)
        self.last_message = ""
        self.message_display_start = 0
        
    def draw_hud(self, frame: np.ndarray, guidance: CPRGuidance, 
                 metrics: dict) -> np.ndarray:
        """
        Draw Heads-Up Display (HUD) with all feedback elements.
        
        HUD Layout:
        ┌──────────────────────────────────┐
        │ Category: ADULT     │ Cycle: 3   │  ← Top bar
        ├──────────────────────────────────┤
        │                                  │
        │      [Video with skeleton]       │
        │                                  │
        ├──────────────────────────────────┤
        │ BPM: 110 ✓  Depth: ✓  Recoil: ✓ │  ← Metrics
        ├──────────────────────────────────┤
        │ GOOD COMPRESSIONS (15/30)        │  ← Main message
        └──────────────────────────────────┘
        
        Args:
            frame: Image to draw on
            guidance: Current CPR guidance
            metrics: Signal processor metrics
        
        Returns:
            Frame with HUD overlay
        """
        self.frame_height, self.frame_width = frame.shape[:2]
        
        # Create semi-transparent overlay
        overlay = frame.copy()
        
        # === TOP BAR ===
        self._draw_top_bar(overlay, guidance)
        
        # === METRICS BAR ===
        if runtime_config.show_metrics:
            self._draw_metrics_bar(overlay, guidance, metrics)
        
        # === MAIN MESSAGE ===
        self._draw_main_message(overlay, guidance)
        
        # === BPM INDICATOR ===
        self._draw_bpm_indicator(overlay, metrics)
        
        # Blend overlay with original frame
        alpha = 1.0 - FeedbackConfig.HUD_ALPHA
        cv2.addWeighted(overlay, FeedbackConfig.HUD_ALPHA, frame, alpha, 0, frame)
        
        return frame
    
    def _draw_top_bar(self, frame: np.ndarray, guidance: CPRGuidance) -> None:
        """
        Draw top status bar with victim category and cycle count.
        
        Args:
            frame: Image to draw on
        """
        h = 80
        cv2.rectangle(frame, (0, 0), (self.frame_width, h), (0, 0, 0), -1)
        
        # Victim category
        category_text = f"VICTIM: {runtime_config.victim_category}"
        cv2.putText(frame, category_text, (20, 50),
                   cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2)
        
        # Special scenario indicator
        if runtime_config.special_scenario:
            scenario_text = f"[{runtime_config.special_scenario}]"
            cv2.putText(frame, scenario_text, (20, 75),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 165, 255), 1)
        
        # Cycle counter (right side)
        from .decision_engine import DecisionEngine  # Avoid circular import
        # We'll pass cycle_count through metrics instead
        
    def _draw_metrics_bar(self, frame: np.ndarray, guidance: CPRGuidance, 
                          metrics: dict) -> None:
        """
        Draw performance metrics bar.
        
        Shows:
        - BPM with status indicator
        - Compression depth status
        - Recoil quality
        - Attention status
        
        Args:
            frame: Image to draw on
            guidance: Current guidance
            metrics: Metrics dictionary
        """
        y_pos = self.frame_height - 120
        bar_height = 60
        
        # Background
        cv2.rectangle(frame, (0, y_pos), (self.frame_width, y_pos + bar_height),
                     (0, 0, 0), -1)
        
        # === BPM ===
        bpm = metrics.get("bpm", 0)
        bpm_color = self._get_status_color(guidance.bpm_status)
        bpm_text = f"BPM: {bpm}"
        cv2.putText(frame, bpm_text, (20, y_pos + 35),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, bpm_color, 2)
        
        # BPM status icon
        self._draw_status_icon(frame, 150, y_pos + 20, guidance.bpm_status)
        
        # === DEPTH ===
        depth_color = self._get_status_color(guidance.depth_status)
        depth_text = "Depth"
        cv2.putText(frame, depth_text, (220, y_pos + 35),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, depth_color, 2)
        
        self._draw_status_icon(frame, 320, y_pos + 20, guidance.depth_status)
        
        # === RECOIL ===
        recoil_color = self._get_status_color(guidance.recoil_status)
        recoil_text = "Recoil"
        cv2.putText(frame, recoil_text, (390, y_pos + 35),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, recoil_color, 2)
        
        self._draw_status_icon(frame, 490, y_pos + 20, guidance.recoil_status)
        
        # === ATTENTION (if monitoring) ===
        if guidance.attention_status != "UNKNOWN":
            attention_color = FeedbackConfig.FEEDBACK_COLORS["EXCELLENT"] if guidance.attention_status == "FOCUSED" else FeedbackConfig.FEEDBACK_COLORS["WARNING"]
            attention_icon = "👁" if guidance.attention_status == "FOCUSED" else "⚠"
            cv2.putText(frame, f"Focus: {attention_icon}", (560, y_pos + 35),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, attention_color, 2)
    
    def _draw_main_message(self, frame: np.ndarray, guidance: CPRGuidance) -> None:
        """
        Draw main instruction/feedback message.
        
        This is the primary communication channel with the rescuer.
        
        Args:
            frame: Image to draw on
            guidance: Current guidance
        """
        y_pos = self.frame_height - 50
        bar_height = 50
        
        # Background color based on alert level
        if guidance.alert_level == "CRITICAL":
            bg_color = (0, 0, 180)  # Red
        elif guidance.alert_level == "WARNING":
            bg_color = (0, 140, 200)  # Orange
        else:
            bg_color = (0, 0, 0)  # Black
        
        cv2.rectangle(frame, (0, y_pos), (self.frame_width, self.frame_height),
                     bg_color, -1)
        
        # Message text
        message = guidance.message
        
        # Center-align text
        text_size = cv2.getTextSize(message, cv2.FONT_HERSHEY_SIMPLEX, 0.9, 2)[0]
        text_x = (self.frame_width - text_size[0]) // 2
        text_y = y_pos + 32
        
        cv2.putText(frame, message, (text_x, text_y),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)
    
    def _draw_bpm_indicator(self, frame: np.ndarray, metrics: dict) -> None:
        """
        Draw large BPM indicator (top-right corner).
        
        Args:
            frame: Image to draw on
            metrics: Metrics dictionary
        """
        bpm = metrics.get("bpm", 0)
        
        if bpm > 0:
            # Position (top-right)
            x = self.frame_width - 150
            y = 100
            
            # BPM number
            cv2.putText(frame, str(bpm), (x, y),
                       cv2.FONT_HERSHEY_SIMPLEX, 2.5, (255, 255, 255), 4)
            
            # "BPM" label
            cv2.putText(frame, "BPM", (x + 20, y + 35),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 2)
    
    def _draw_status_icon(self, frame: np.ndarray, x: int, y: int, 
                          status: str) -> None:
        """
        Draw status icon (checkmark or X).
        
        Args:
            frame: Image to draw on
            x, y: Icon position
            status: Status string
        """
        if status == "GOOD":
            # Green checkmark
            color = FeedbackConfig.FEEDBACK_COLORS["EXCELLENT"]
            cv2.putText(frame, "✓", (x, y + 20),
                       cv2.FONT_HERSHEY_SIMPLEX, 1.0, color, 2)
        elif status in ["TOO_SLOW", "TOO_FAST", "SHALLOW", "TOO_DEEP", "INCOMPLETE", "INCORRECT"]:
            # Red X
            color = FeedbackConfig.FEEDBACK_COLORS["INCORRECT"]
            cv2.putText(frame, "✗", (x, y + 20),
                       cv2.FONT_HERSHEY_SIMPLEX, 1.0, color, 2)
        else:
            # Gray question mark
            color = (128, 128, 128)
            cv2.putText(frame, "?", (x, y + 20),
                       cv2.FONT_HERSHEY_SIMPLEX, 1.0, color, 2)
    
    def _get_status_color(self, status: str) -> Tuple[int, int, int]:
        """
        Get BGR color for status.
        
        Args:
            status: Status string
        
        Returns:
            BGR color tuple
        """
        if status == "GOOD":
            return FeedbackConfig.FEEDBACK_COLORS["EXCELLENT"]
        elif status == "TOO_SLOW":
            return FeedbackConfig.FEEDBACK_COLORS["TOO_SLOW"]
        elif status == "TOO_FAST":
            return FeedbackConfig.FEEDBACK_COLORS["TOO_FAST"]
        elif status in ["SHALLOW", "INCOMPLETE"]:
            return FeedbackConfig.FEEDBACK_COLORS["WARNING"]
        elif status in ["TOO_DEEP", "INCORRECT"]:
            return FeedbackConfig.FEEDBACK_COLORS["INCORRECT"]
        else:
            return FeedbackConfig.FEEDBACK_COLORS["NEUTRAL"]
    
    def draw_compression_progress_bar(self, frame: np.ndarray, 
                                     current: int, target: int) -> None:
        """
        Draw visual progress bar for compression cycle.
        
        Args:
            frame: Image to draw on
            current: Current compression count
            target: Target compressions
        """
        # Position (top center)
        bar_width = 300
        bar_height = 20
        x = (self.frame_width - bar_width) // 2
        y = 90
        
        # Background
        cv2.rectangle(frame, (x, y), (x + bar_width, y + bar_height),
                     (50, 50, 50), -1)
        
        # Progress
        progress = min(current / target, 1.0)
        progress_width = int(bar_width * progress)
        
        progress_color = FeedbackConfig.FEEDBACK_COLORS["EXCELLENT"] if current < target else FeedbackConfig.FEEDBACK_COLORS["WARNING"]
        
        cv2.rectangle(frame, (x, y), (x + progress_width, y + bar_height),
                     progress_color, -1)
        
        # Border
        cv2.rectangle(frame, (x, y), (x + bar_width, y + bar_height),
                     (255, 255, 255), 2)
        
        # Text
        text = f"{current}/{target}"
        text_size = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)[0]
        text_x = x + (bar_width - text_size[0]) // 2
        text_y = y + 15
        
        cv2.putText(frame, text, (text_x, text_y),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
