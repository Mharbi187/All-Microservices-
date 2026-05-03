"""
CPR Vision System
=================
Advanced Computer Vision System for Real-Time CPR Assistance

This package provides a complete CPR training and assistance system 
using MediaPipe Pose and Face Mesh for real-time motion analysis and
attention monitoring.

Main Components:
- CPRAssistant: Main orchestrator class (recommended entry point)
- VisionEngine: Person detection and pose estimation
- SignalProcessor: Compression analysis (BPM, depth, recoil)
- AttentionMonitor: Rescuer focus tracking
- DecisionEngine: CPR protocol logic and guidance
- FeedbackManager: Visual HUD and feedback

Author: Senior Computer Vision Engineer
Version: 2.0.0
Protocol: AHA/ERC 2021 Guidelines
"""

__version__ = "2.0.0"
__author__ = "CPR Vision Team"

from .config import GUIDELINES, VisionConfig, runtime_config
from .vision_engine import VisionEngine
from .signal_processor import SignalProcessor
from .attention_monitor import AttentionMonitor
from .decision_engine import DecisionEngine
from .feedback_manager import FeedbackManager
from .cpr_assistant import CPRAssistant

__all__ = [
    'CPRAssistant',
    'VisionEngine',
    'SignalProcessor',
    'AttentionMonitor',
    'DecisionEngine',
    'FeedbackManager',
    'GUIDELINES',
    'VisionConfig',
    'runtime_config'
]

