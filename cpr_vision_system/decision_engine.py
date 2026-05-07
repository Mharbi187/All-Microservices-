"""
CPR Vision System - Decision Engine
====================================
High-level decision logic for CPR guidance following AHA/ERC protocols.
Coordinates all subsystems and determines appropriate feedback.
"""

import time
from typing import Dict, Tuple, Optional
from dataclasses import dataclass

from .config import GUIDELINES, SystemState, runtime_config, SPECIAL_SCENARIOS
from .signal_processor import SignalProcessor
from .attention_monitor import AttentionMonitor


@dataclass
class CPRGuidance:
    """CPR guidance decision for current moment."""
    
    # System state
    state: str                    # Current SystemState
    message: str                  # Primary instruction/feedback
    alert_level: str              # NORMAL, WARNING, CRITICAL
    
    # Performance metrics
    bpm_status: str               # TOO_SLOW, GOOD, TOO_FAST
    depth_status: str             # SHALLOW, GOOD, TOO_DEEP
    recoil_status: str            # INCOMPLETE, GOOD
    positioning_status: str       # INCORRECT, GOOD
    attention_status: str         # FOCUSED, DISTRACTED
    
    # Cycle management
    compressions_done: int        # Compressions in current cycle
    compressions_target: int      # Target compressions per cycle
    should_ventilate: bool        # Time for ventilations
    
    # Visual confidence
    visual_confidence: float      # 0.0 - 1.0
    use_audio_fallback: bool      # Switch to audio-only guidance


class DecisionEngine:
    """
    Main decision-making engine for CPR assistance.
    
    Integrates vision, signal processing, and attention monitoring
    to provide real-time CPR guidance following medical protocols.
    """
    
    def __init__(self):
        """Initialize decision engine and subsystems."""
        
        # Subsystems
        self.signal_processor = SignalProcessor()
        self.attention_monitor = AttentionMonitor()
        
        # Current state
        self.state = SystemState.DETECTING_RESCUER
        self.compressions_in_cycle = 0
        self.cycle_count = 0
        
        # Timing
        self.cycle_start_time = time.time()
        self.ventilation_start_time = None
        
        # Special scenarios
        self.active_scenario = None
        self.pre_compression_action_done = False
        
    def process_frame_data(self, vision_metadata: Dict) -> CPRGuidance:
        """
        Main decision pipeline - analyze data and generate guidance.
        
        Args:
            vision_metadata: Data from VisionEngine
        
        Returns:
            CPRGuidance object with decisions and feedback
        """
        current_time = time.time()
        
        # === STEP 1: Check if rescuer is detected ===
        if not vision_metadata["rescuer_detected"]:
            return self._handle_no_rescuer_detected()
        
        # === STEP 2: Verify hand positioning ===
        if not vision_metadata["hands_on_chest"]:
            return self._handle_incorrect_positioning(vision_metadata)
        
        # === STEP 3: Process wrist movement (signal processing) ===
        rescuer = vision_metadata["rescuer"]
        wrist_y = rescuer.hands_center[1]  # Y coordinate of hands center
        
        bpm, depth_px, new_compression = self.signal_processor.process_wrist_position(wrist_y)
        
        # Count new compression
        if new_compression:
            self.compressions_in_cycle += 1
        
        # === STEP 4: Monitor rescuer attention ===
        face_landmarks = vision_metadata.get("face_landmarks")
        image_shape = (rescuer.bbox[3], rescuer.bbox[2])  # (height, width) approximation
        
        attention_state = self.attention_monitor.process_face_landmarks(
            face_landmarks,
            image_shape
        )
        
        # === STEP 5: Get current medical guidelines ===
        guidelines = GUIDELINES[runtime_config.victim_category]
        
        # === STEP 6: Determine current state ===
        self._update_state(guidelines, current_time)
        
        # === STEP 7: Assess performance ===
        bpm_status = self._assess_bpm(bpm, guidelines)
        depth_status = self._assess_depth(depth_px)
        recoil_status = self._assess_recoil()
        positioning_status = "GOOD" if vision_metadata["hands_superposed"] else "INCORRECT"
        attention_status = attention_state.get_attention_summary() if hasattr(attention_state, 'get_attention_summary') else ("FOCUSED" if attention_state.is_focused else "DISTRACTED")
        
        # === STEP 8: Generate primary message ===
        message, alert_level = self._generate_message(
            bpm_status,
            depth_status,
            recoil_status,
            positioning_status,
            attention_state,
            guidelines
        )
        
        # === STEP 9: Build guidance object ===
        guidance = CPRGuidance(
            state=self.state,
            message=message,
            alert_level=alert_level,
            bpm_status=bpm_status,
            depth_status=depth_status,
            recoil_status=recoil_status,
            positioning_status=positioning_status,
            attention_status=attention_status,
            compressions_done=self.compressions_in_cycle,
            compressions_target=guidelines.compression_ratio,
            should_ventilate=(self.state == SystemState.VENTILATIONS),
            visual_confidence=vision_metadata["confidence"],
            use_audio_fallback=(vision_metadata["confidence"] < 0.4)
        )
        
        return guidance
    
    def _update_state(self, guidelines, current_time: float) -> None:
        """
        Update system state based on compression cycle progress.
        
        Args:
            guidelines: Current CPRGuidelines
            current_time: Current timestamp
        """
        # Handle special scenarios with pre-compression actions
        if (runtime_config.special_scenario and 
            not self.pre_compression_action_done and
            self.state == SystemState.DETECTING_RESCUER):
            
            scenario = SPECIAL_SCENARIOS.get(runtime_config.special_scenario)
            if scenario and scenario.pre_compression_action:
                self.state = SystemState.VENTILATIONS  # Start with ventilations
                self.ventilation_start_time = current_time
                return
        
        # Normal compression cycle
        if self.compressions_in_cycle >= guidelines.compression_ratio:
            # Time for ventilations
            if self.state != SystemState.VENTILATIONS:
                self.state = SystemState.VENTILATIONS
                self.ventilation_start_time = current_time
        
        # Check if ventilation phase is complete
        if self.state == SystemState.VENTILATIONS:
            # Assume ventilations take ~5 seconds
            if (current_time - self.ventilation_start_time) > 5.0:
                # Reset cycle
                self.compressions_in_cycle = 0
                self.cycle_count += 1
                self.state = SystemState.COMPRESSIONS
                self.cycle_start_time = current_time
                self.pre_compression_action_done = True
        
        # If not in ventilation phase, we're compressing
        if self.state not in [SystemState.VENTILATIONS, SystemState.DETECTING_RESCUER]:
            self.state = SystemState.COMPRESSIONS
    
    def _assess_bpm(self, bpm: int, guidelines) -> str:
        """
        Assess compression rate quality.
        
        Returns:
            "TOO_SLOW", "GOOD", or "TOO_FAST"
        """
        if bpm == 0:
            return "UNKNOWN"
        elif bpm < guidelines.min_bpm:
            return "TOO_SLOW"
        elif bpm > guidelines.max_bpm:
            return "TOO_FAST"
        else:
            return "GOOD"
    
    def _assess_depth(self, depth_pixels: float) -> str:
        """
        Assess compression depth quality.
        
        Note: Depth in pixels is relative and camera-dependent.
        This is why we emphasize this is NOT a medical device.
        We can only provide relative feedback.
        
        Returns:
            "SHALLOW", "GOOD", or "TOO_DEEP"
        """
        if depth_pixels == 0:
            return "UNKNOWN"
        
        # Heuristic thresholds (these would need calibration)
        # Assuming typical camera setup, ~30-50 pixels ≈ 5-6 cm
        if depth_pixels < 25:
            return "SHALLOW"
        elif depth_pixels > 60:
            return "TOO_DEEP"
        else:
            return "GOOD"
    
    def _assess_recoil(self) -> str:
        """
        Assess chest recoil quality.
        
        Returns:
            "INCOMPLETE" or "GOOD"
        """
        recoil_quality = self.signal_processor.recoil_quality
        
        if recoil_quality < 0.7:  # Less than 70% full recoils
            return "INCOMPLETE"
        else:
            return "GOOD"
    
    def _generate_message(self, bpm_status: str, depth_status: str, 
                         recoil_status: str, positioning_status: str,
                         attention_state, guidelines) -> Tuple[str, str]:
        """
        Generate primary feedback message and alert level.
        
        Message priority (highest to lowest):
        1. Life-critical errors (hands not on chest)
        2. Attention warnings (rescuer distracted)
        3. Technique corrections (BPM, depth, recoil)
        4. Positive feedback
        
        Returns:
            (message, alert_level)
        """
        # === PRIORITY 1: Positioning ===
        if positioning_status == "INCORRECT":
            return ("HANDS NOT PROPERLY POSITIONED", "CRITICAL")
        
        # === PRIORITY 2: Attention ===
        if attention_state.alert_triggered:
            return ("STAY FOCUSED ON VICTIM", "WARNING")
        
        # === PRIORITY 3: State-specific messages ===
        if self.state == SystemState.VENTILATIONS:
            return (f"STOP - GIVE {guidelines.ventilation_ratio} BREATHS", "NORMAL")
        
        # === PRIORITY 4: Technique corrections ===
        if bpm_status == "TOO_SLOW":
            return ("COMPRESS FASTER", "WARNING")
        
        if bpm_status == "TOO_FAST":
            return ("SLOW DOWN", "WARNING")
        
        if depth_status == "SHALLOW":
            return ("PRESS DEEPER", "WARNING")
        
        if depth_status == "TOO_DEEP":
            return ("LESS DEPTH", "WARNING")
        
        if recoil_status == "INCOMPLETE":
            return ("ALLOW FULL CHEST RECOIL", "WARNING")
        
        # === DEFAULT: Positive feedback ===
        comp_count = self.compressions_in_cycle
        comp_target = guidelines.compression_ratio
        
        if self.state == SystemState.COMPRESSIONS:
            return (f"GOOD COMPRESSIONS ({comp_count}/{comp_target})", "NORMAL")
        else:
            return ("Continue CPR", "NORMAL")
    
    def _handle_no_rescuer_detected(self) -> CPRGuidance:
        """Handle case when no rescuer is detected."""
        return CPRGuidance(
            state=SystemState.DETECTING_RESCUER,
            message="POSITION YOURSELF FOR CPR",
            alert_level="NORMAL",
            bpm_status="UNKNOWN",
            depth_status="UNKNOWN",
            recoil_status="UNKNOWN",
            positioning_status="UNKNOWN",
            attention_status="UNKNOWN",
            compressions_done=0,
            compressions_target=30,
            should_ventilate=False,
            visual_confidence=0.0,
            use_audio_fallback=True
        )
    
    def _handle_incorrect_positioning(self, vision_metadata: Dict) -> CPRGuidance:
        """Handle case when hands are not on victim's chest."""
        
        if vision_metadata["hands_superposed"]:
            msg = "MOVE HANDS TO VICTIM'S CHEST"
        else:
            msg = "PLACE HANDS HEEL-OVER-HEEL"
        
        return CPRGuidance(
            state=SystemState.DETECTING_VICTIM,
            message=msg,
            alert_level="WARNING",
            bpm_status="UNKNOWN",
            depth_status="UNKNOWN",
            recoil_status="UNKNOWN",
            positioning_status="INCORRECT",
            attention_status="UNKNOWN",
            compressions_done=0,
            compressions_target=30,
            should_ventilate=False,
            visual_confidence=vision_metadata["confidence"],
            use_audio_fallback=False
        )
    
    def reset_cycle(self) -> None:
        """Reset compression cycle."""
        self.compressions_in_cycle = 0
        self.cycle_start_time = time.time()
        self.signal_processor.reset()
    
    def change_victim_category(self, category: str) -> None:
        """
        Change victim category (ADULT, CHILD, INFANT).
        
        Args:
            category: New category
        """
        if category in GUIDELINES:
            runtime_config.victim_category = category
            self.reset_cycle()
    
    def activate_special_scenario(self, scenario: str) -> None:
        """
        Activate special CPR scenario.
        
        Args:
            scenario: Scenario name (DROWNING, PREGNANCY, etc.)
        """
        if scenario in SPECIAL_SCENARIOS:
            runtime_config.special_scenario = scenario
            self.pre_compression_action_done = False
            self.reset_cycle()

    # ══════════════════════════════════════════════════════════════════════
    #  ADAPTER METHODS (used by CPRAssistant orchestrator)
    # ══════════════════════════════════════════════════════════════════════

    def evaluate(self, vision_metadata: Dict, signal_metrics: Dict,
                 attention_status: Dict, victim_category: str) -> Dict:
        """
        Simplified evaluate interface for CPRAssistant.

        Rather than requiring the full CPRGuidance dataclass pipeline,
        this returns a simple dict with the key outputs.
        """
        guidelines = GUIDELINES.get(victim_category, GUIDELINES["ADULT"])

        # Determine state
        rescuer_detected = vision_metadata.get("rescuer_detected", False)
        hands_on_chest = vision_metadata.get("hands_on_chest", False)

        if not rescuer_detected:
            return {
                'state': SystemState.DETECTING_RESCUER,
                'guidance': "Position yourself for CPR",
                'alert_level': 'NORMAL'
            }

        if not hands_on_chest:
            return {
                'state': SystemState.DETECTING_VICTIM,
                'guidance': "Place hands on victim's chest",
                'alert_level': 'WARNING'
            }

        # Active CPR — assess performance
        bpm = signal_metrics.get('current_bpm', 0)
        guidance = "Continue CPR"
        alert_level = "NORMAL"

        if bpm > 0:
            if bpm < guidelines.min_bpm:
                guidance = "Compress faster"
                alert_level = "WARNING"
            elif bpm > guidelines.max_bpm:
                guidance = "Slow down"
                alert_level = "WARNING"
            else:
                guidance = "Good rhythm!"

        # Check attention
        if not attention_status.get('focused', True):
            distraction = attention_status.get('distraction_duration', 0)
            if distraction > 2.0:
                guidance = "Stay focused on the victim"
                alert_level = "WARNING"

        return {
            'state': SystemState.COMPRESSIONS,
            'guidance': guidance,
            'alert_level': alert_level
        }

    def reset(self) -> None:
        """Reset all decision engine state."""
        self.reset_cycle()
        self.state = SystemState.DETECTING_RESCUER
        self.cycle_count = 0

    def set_victim_category(self, category: str) -> None:
        """Alias for change_victim_category."""
        self.change_victim_category(category)

