"""
CPR Vision System
=================
Advanced Computer Vision System for Real-Time CPR Assistance

This package provides a complete CPR training and assistance system
using YOLOv8-pose for person detection and keypoint estimation,
with MediaPipe FaceMesh retained for attention monitoring.

Main Components:
- CPRAssistant: Main orchestrator class (recommended entry point)
- VisionEngine: YOLOv8 person detection and pose estimation
- SignalProcessor: Compression analysis (BPM, depth, recoil)
- AttentionMonitor: Rescuer focus tracking
- DecisionEngine: CPR protocol logic and guidance
- FeedbackManager: Visual HUD and feedback

Author: CPR Vision Team
Version: 3.0.0
Protocol: AHA/ERC 2021 Guidelines
"""

__version__ = "3.0.0"
__author__ = "CPR Vision Team"

from .config import GUIDELINES, VisionConfig, runtime_config
from .signal_processor import SignalProcessor

__all__ = [
    'SignalProcessor',
    'GUIDELINES',
    'VisionConfig',
    'runtime_config',
]
