"""
CPR Vision System - Configuration Module
=============================================
Centralized configuration following AHA/ERC 2021 guidelines.
All constants, thresholds, and medical parameters are defined here.
"""

from dataclasses import dataclass
from typing import Tuple

# ============================================
# MEDICAL GUIDELINES (AHA / ERC 2021)
# ============================================

@dataclass
class CPRGuidelines:
    """CPR protocol parameters for different victim categories."""
    
    # Compression-to-ventilation ratio
    compression_ratio: int
    ventilation_ratio: int
    
    # Target compression rate (compressions per minute)
    min_bpm: int
    max_bpm: int
    optimal_bpm: int
    
    # Target compression depth (cm)
    min_depth_cm: float
    max_depth_cm: float
    
    # Hand positioning
    hand_technique: str
    
    # Special protocols
    special_instructions: str = ""


# Medical guidelines database
GUIDELINES = {
    "ADULT": CPRGuidelines(
        compression_ratio=30,
        ventilation_ratio=2,
        min_bpm=100,
        max_bpm=120,
        optimal_bpm=110,
        min_depth_cm=5.0,
        max_depth_cm=6.0,
        hand_technique="Two hands, heel over heel",
        special_instructions="Allow full chest recoil between compressions"
    ),
    
    "CHILD": CPRGuidelines(
        compression_ratio=15,
        ventilation_ratio=2,
        min_bpm=100,
        max_bpm=120,
        optimal_bpm=110,
        min_depth_cm=5.0,
        max_depth_cm=5.5,
        hand_technique="One or two hands",
        special_instructions="Compress to 1/3 of chest depth"
    ),
    
    "INFANT": CPRGuidelines(
        compression_ratio=15,
        ventilation_ratio=2,
        min_bpm=100,
        max_bpm=120,
        optimal_bpm=110,
        min_depth_cm=4.0,
        max_depth_cm=4.5,
        hand_technique="Two fingers",
        special_instructions="Use 2-thumb encircling technique if two rescuers"
    ),
    
    "PREGNANT": CPRGuidelines(
        compression_ratio=30,
        ventilation_ratio=2,
        min_bpm=100,
        max_bpm=120,
        optimal_bpm=110,
        min_depth_cm=5.0,
        max_depth_cm=6.0,
        hand_technique="Two hands + left uterine displacement",
        special_instructions="Manually displace uterus to the LEFT to relieve aortocaval compression. Tilt pelvis 15-30° if possible."
    )
}

# ============================================
# VISION SYSTEM PARAMETERS
# ============================================

class VisionConfig:
    """Computer vision processing parameters."""
    
    # YOLOv8 confidence thresholds
    POSE_CONFIDENCE = 0.5                  # YOLOv8-pose detection confidence
    CLASSIFIER_CONFIDENCE = 0.6            # Victim classifier confidence

    # Face detection (MediaPipe FaceMesh, retained for attention monitoring)
    FACE_DETECTION_CONFIDENCE = 0.6
    FACE_TRACKING_CONFIDENCE = 0.6
    
    # Hand positioning validation
    HAND_SUPERPOSITION_THRESHOLD_PX = 60   # Max distance to consider hands superposed
    CHEST_ROI_EXPANSION_FACTOR = 1.2       # ROI safety margin
    
    # Motion detection — pixel-based (legacy, kept for non-pipeline code)
    MIN_COMPRESSION_DISPLACEMENT_PX = 15   # Minimum movement to count as compression
    MAX_COMPRESSION_DISPLACEMENT_PX = 150  # Maximum realistic compression movement

    # Motion detection — torso-normalized (used by new signal_processor.py)
    # Fraction of torso height that must be crossed to register a compression.
    # 0.035 = 3.5% of torso height, matching rcp_rules.json lower bound for adult depth.
    MIN_COMPRESSION_DISPLACEMENT_TORSO_FRAC = 0.035
    # Absolute fallback if torso_height cannot be computed (landmark occlusion)
    MIN_COMPRESSION_DISPLACEMENT_ABS = 0.02   # 2% of normalized frame height
    
    # Temporal parameters
    COMPRESSION_MIN_DURATION_SEC = 0.3     # Minimum time for valid compression
    COMPRESSION_MAX_DURATION_SEC = 1.0     # Maximum time for valid compression
    RECOIL_THRESHOLD_PERCENT = 90          # % of return to baseline for full recoil
    
    # Multi-person filtering
    MIN_BODY_VISIBILITY = 0.6              # Minimum visibility to consider a person
    MAX_TRACKED_PERSONS = 5                # Maximum number of people to track

    # Victim classification cooldown
    CLASSIFY_INTERVAL_SEC = 3.0            # Don't re-classify every frame


class SignalProcessing:
    """Signal processing and filtering parameters."""

    # Moving average window for BPM smoothing
    BPM_SMOOTHING_WINDOW = 5

    # Kalman filter parameters
    KALMAN_PROCESS_NOISE = 0.1
    KALMAN_MEASUREMENT_NOISE = 0.01

    # Peak detection
    PEAK_DETECTION_PROMINENCE = 0.3       # Relative prominence for peak detection
    ANTI_BOUNCE_DELAY_SEC = 0.25          # Prevent double-counting compressions

    # Compression cycle duration bounds
    COMPRESSION_MIN_DURATION_SEC = 0.20   # Faster than 300 BPM → noise spike
    COMPRESSION_MAX_DURATION_SEC = 1.20   # Slower than 50 BPM → not CPR

    # BPM calculation
    BPM_WINDOW = 12                       # Compressions to average for BPM
    SMOOTHING_ALPHA = 0.3                 # Exponential smoothing for BPM


class AttentionMonitoring:
    """Rescuer attention and concentration parameters."""
    
    # Head pose angle thresholds (degrees)
    MAX_YAW_ANGLE = 30.0                  # Looking left/right
    MAX_PITCH_ANGLE = 20.0                # Looking up/down
    MAX_ROLL_ANGLE = 25.0                 # Head tilt
    
    # Temporal thresholds
    DISTRACTION_TIME_THRESHOLD_SEC = 2.0  # Time before triggering alert
    ATTENTION_CHECK_INTERVAL_SEC = 0.5    # How often to evaluate attention
    
    # Eye-gaze estimation (optional, for advanced monitoring)
    ENABLE_GAZE_TRACKING = False


class FeedbackConfig:
    """User feedback and interface parameters."""
    
    # Visual feedback
    HUD_ALPHA = 0.6                       # Transparency of overlay
    FEEDBACK_COLORS = {
        "EXCELLENT": (0, 255, 0),         # Green
        "GOOD": (0, 200, 100),            # Light green
        "ACCEPTABLE": (0, 255, 255),      # Yellow
        "TOO_SLOW": (0, 165, 255),        # Orange
        "TOO_FAST": (0, 100, 255),        # Red-orange
        "INCORRECT": (0, 0, 255),         # Red
        "WARNING": (0, 200, 255),         # Yellow-orange
        "NEUTRAL": (255, 255, 255)        # White
    }
    
    # Audio feedback
    ENABLE_AUDIO_FEEDBACK = True
    AUDIO_FALLBACK_CONFIDENCE = 0.4       # Switch to audio below this confidence
    
    # Message timing
    MESSAGE_DISPLAY_DURATION_SEC = 2.0
    ALERT_COOLDOWN_SEC = 5.0              # Minimum time between repeated alerts
    
    # Performance monitoring
    TARGET_FPS = 30
    MAX_LATENCY_MS = 300                  # Maximum acceptable processing delay


# ============================================
# SYSTEM STATES
# ============================================

class SystemState:
    """Possible system operational states."""
    
    INITIALIZING = "INITIALIZING"
    DETECTING_RESCUER = "DETECTING_RESCUER"
    DETECTING_VICTIM = "DETECTING_VICTIM"
    ACTIVE_CPR = "ACTIVE_CPR"
    COMPRESSIONS = "COMPRESSIONS"
    VENTILATIONS = "VENTILATIONS"
    ATTENTION_WARNING = "ATTENTION_WARNING"
    LOW_CONFIDENCE = "LOW_CONFIDENCE"
    PAUSED = "PAUSED"
    ERROR = "ERROR"


# ============================================
# LANDMARK INDICES (COCO 17-Keypoint — YOLOv8-pose)
# ============================================

class PoseLandmarks:
    """YOLOv8-pose COCO 17-keypoint indices."""
    
    # Head
    NOSE = 0
    LEFT_EYE = 1
    RIGHT_EYE = 2
    LEFT_EAR = 3
    RIGHT_EAR = 4
    
    # Shoulders
    LEFT_SHOULDER = 5
    RIGHT_SHOULDER = 6
    
    # Arms
    LEFT_ELBOW = 7
    RIGHT_ELBOW = 8
    LEFT_WRIST = 9
    RIGHT_WRIST = 10
    
    # Torso / Legs
    LEFT_HIP = 11
    RIGHT_HIP = 12
    LEFT_KNEE = 13
    RIGHT_KNEE = 14
    LEFT_ANKLE = 15
    RIGHT_ANKLE = 16


# ============================================
# SPECIAL SCENARIOS
# ============================================

@dataclass
class SpecialScenario:
    """Configuration for special CPR scenarios."""
    
    name: str
    pre_compression_action: str = None
    compression_modification: str = None
    positioning_instruction: str = None


SPECIAL_SCENARIOS = {
    "DROWNING": SpecialScenario(
        name="Drowning Victim",
        pre_compression_action="5_INITIAL_VENTILATIONS",
        compression_modification="Standard 30:2 ratio after initial ventilations",
        positioning_instruction="Ensure airway is clear of water"
    ),
    
    "PREGNANCY": SpecialScenario(
        name="Pregnant Woman (>20 weeks)",
        compression_modification="MANUAL_UTERINE_DISPLACEMENT",
        positioning_instruction="Tilt pelvis 15-30° to the LEFT (manual displacement or wedge)"
    ),
    
    "TRAUMATIC_ARREST": SpecialScenario(
        name="Traumatic Cardiac Arrest",
        compression_modification="Consider C-spine immobilization",
        positioning_instruction="Modified head positioning if spinal injury suspected"
    )
}


# ============================================
# RUNTIME CONFIGURATION
# ============================================

class RuntimeConfig:
    """Runtime adjustable parameters."""
    
    # Current victim category
    victim_category: str = "ADULT"
    
    # Active special scenario
    special_scenario: str = None
    
    # UI preferences
    show_skeleton: bool = True
    show_chest_roi: bool = True
    show_metrics: bool = True
    verbose_logging: bool = False
    
    # Performance
    enable_gpu: bool = False  # MediaPipe GPU acceleration
    frame_skip: int = 0       # Process every Nth frame (0 = all frames)


# Default runtime instance
runtime_config = RuntimeConfig()
