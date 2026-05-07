"""
CPR Pipeline — Layer 6: Rule Evaluation (Single Source of Truth)
=================================================================
Receives the rescuer's 33-point MediaPipe pose + SignalState,
evaluates ALL CPR rules from rcp_rules.json, and returns a structured
response containing ui_commands (the mobile app renders these verbatim).

This is the ONLY place where CPR rules are evaluated.
The mobile app MUST NOT re-evaluate or override these decisions.
"""

import json
import os
from pathlib import Path
from typing import List, Optional

import mediapipe as mp
_PL = mp.solutions.pose.PoseLandmark

from cpr_vision_system.utils import mid, angle
from cpr_vision_system.signal_processor import SignalState

# Load rcp_rules.json once at module import time
_RULES_PATH = Path(__file__).parent.parent.parent / "cpr_mobile_app" / "rcp_rules.json"
if not _RULES_PATH.exists():
    # Fallback: search up to 4 levels up
    for parent in Path(__file__).parents:
        candidate = parent / "cpr_mobile_app" / "rcp_rules.json"
        if candidate.exists():
            _RULES_PATH = candidate
            break
        # Also check root level just in case it was moved
        candidate_root = parent / "rcp_rules.json"
        if candidate_root.exists():
            _RULES_PATH = candidate_root
            break

with open(_RULES_PATH, encoding="utf-8") as _f:
    _RULES = json.load(_f)

# Thresholds sourced directly from rcp_rules.json error_conditions
_ERR = _RULES.get("error_conditions", {})


def _t(error_key: str, lang: str) -> str:
    """Get correction text for an error key in the given language."""
    node = _ERR.get(error_key, {}).get("correction", {})
    return node.get(lang, node.get("en", ""))


def _severity(error_key: str) -> str:
    return _ERR.get(error_key, {}).get("severity", "MEDIUM")


class RuleEvaluator:
    """
    Layer 6 — CPR rule evaluator.

    Computes all biomechanical metrics from the rescuer's MediaPipe pose,
    compares them against rcp_rules.json thresholds, and emits ui_commands.
    """

    def evaluate(
        self,
        rescuer_pose: List,
        victim_type: str,
        signal: SignalState,
        low_visibility: bool = False,
    ) -> dict:
        """
        Evaluate all CPR rules and build the WebSocket response.

        Args:
            rescuer_pose:   33-slot MediaPipe landmark list (slots may be None).
            victim_type:    "adult" | "child" | "infant" | "pregnant"
            signal:         SignalState from SignalProcessor.get_state()
            low_visibility: True if check_visibility() failed — freeze corrections.

        Returns:
            Full WebSocket response dict (status, metrics, ui_commands, ...).
        """
        # Safe landmark accessor
        def lm(idx: int) -> Optional[dict]:
            return rescuer_pose[idx] if rescuer_pose and idx < len(rescuer_pose) else None

        ls = lm(_PL.LEFT_SHOULDER.value)
        rs = lm(_PL.RIGHT_SHOULDER.value)
        le = lm(_PL.LEFT_ELBOW.value)
        re = lm(_PL.RIGHT_ELBOW.value)
        lw = lm(_PL.LEFT_WRIST.value)
        rw = lm(_PL.RIGHT_WRIST.value)
        lh = lm(_PL.LEFT_HIP.value)
        rh = lm(_PL.RIGHT_HIP.value)

        # ── Compute geometric metrics ──────────────────────────────────────

        # Torso height (normalized). Guard against degenerate poses.
        torso_height = 0.0
        if ls and rs and lh and rh:
            shoulder_mid_y = mid(ls["y"], rs["y"])
            hip_mid_y = mid(lh["y"], rh["y"])
            torso_height = abs(hip_mid_y - shoulder_mid_y)
        torso_ok = torso_height > 0.01

        shoulder_mid_x = mid(ls["x"], rs["x"]) if ls and rs else 0.5
        wrist_mid_x = mid(lw["x"], rw["x"]) if lw and rw else 0.5
        wrist_mid_y = mid(lw["y"], rw["y"]) if lw and rw else 0.0
        shoulder_mid_y_val = mid(ls["y"], rs["y"]) if ls and rs else 0.0
        hip_mid_y_val = mid(lh["y"], rh["y"]) if lh and rh else 1.0

        # Elbow angle — take the worst (most bent) arm
        left_angle = angle(ls, le, lw) if (ls and le and lw) else 180.0
        right_angle = angle(rs, re, rw) if (rs and re and rw) else 180.0
        elbow_angle = min(left_angle, right_angle)

        # Depth (torso %) — from SignalState (computed by SignalProcessor)
        depth_torso_pct = signal.depth_torso_pct if torso_ok else 0.0

        # ── Build ui_commands ─────────────────────────────────────────────
        ui_commands: List[dict] = []

        if not low_visibility:
            # Get victim-type-specific rules (fall back to adult)
            vtype = victim_type if victim_type in _RULES.get("rules", {}) else "adult"
            comp_rules = _RULES["rules"][vtype]["compression"]

            # 1. Arms straight (elbow angle)
            arm_node = comp_rules.get("arm_angle", {})
            if not isinstance(arm_node, dict): arm_node = {}
            arm_thresh = arm_node.get("threshold_degrees", 160)
            if elbow_angle < arm_thresh:
                severity_key = "arms_bent" if elbow_angle < 140 else "shoulders_not_aligned"
                if elbow_angle < 140:
                    ui_commands.append(self._cmd("arms_bent", elbow_angle))

            # 2. Shoulder alignment over wrists
            align_tol = 0.10   # 10% of normalized frame width
            if abs(shoulder_mid_x - wrist_mid_x) > align_tol:
                ui_commands.append(self._cmd("shoulders_not_aligned"))

            # 3. Hand position (wrist Y between shoulder+40% and shoulder+60% of torso)
            if torso_ok:
                lower_bound = shoulder_mid_y_val + 0.20 * torso_height
                upper_bound = hip_mid_y_val
                if wrist_mid_y < lower_bound:
                    ui_commands.append(self._cmd("hands_too_high"))
                elif wrist_mid_y > upper_bound:
                    ui_commands.append(self._cmd("hands_too_low"))

            # 4. Compression rate (BPM)
            rate_node = comp_rules.get("rate", {})
            if not isinstance(rate_node, dict): rate_node = {}
            bpm_range = rate_node.get("range_per_minute", [100, 120])
            min_bpm, max_bpm = bpm_range[0], bpm_range[1]
            if signal.bpm > 0:
                if signal.bpm < min_bpm:
                    ui_commands.append(self._cmd("too_slow", signal.bpm))
                elif signal.bpm > max_bpm:
                    ui_commands.append(self._cmd("too_fast", signal.bpm))

            # 5. Compression depth
            if torso_ok and depth_torso_pct > 0:
                # rcp_rules.json: adult proxy_condition 3.5%–6.0% torso height
                depth_rules = comp_rules.get("depth", {})
                if not isinstance(depth_rules, dict): depth_rules = {}
                proxy = depth_rules.get("proxy_condition", "")
                # Parse lower/upper from rcp_rules.json proxy_condition string
                # Defaults: adult [3.5%, 6.0%]
                min_depth_pct = 3.5
                max_depth_pct = 6.0
                if vtype == "child":
                    min_depth_pct, max_depth_pct = 3.0, 5.0
                elif vtype == "infant":
                    min_depth_pct, max_depth_pct = 2.5, 4.5

                if depth_torso_pct < min_depth_pct:
                    ui_commands.append(self._cmd("too_shallow", depth_torso_pct))
                elif depth_torso_pct > max_depth_pct:
                    ui_commands.append(self._cmd("too_deep", depth_torso_pct))

            # 6. Recoil quality
            if signal.compression_count > 2 and signal.recoil_quality < 0.70:
                ui_commands.append(self._cmd("incomplete_recoil", signal.recoil_quality))

            # 7. Lateral wrist movement
            if signal.wrist_x_variance > 0.0025:   # ~5% frame width variance
                ui_commands.append(self._cmd("lateral_movement"))

            # 8. Excessive pause (>10s without compression)
            if signal.time_since_last > 10.0 and signal.compression_count > 0:
                ui_commands.append(self._cmd("excessive_pause", signal.time_since_last))

        # ── Determine session status ──────────────────────────────────────
        if signal.compression_count == 0:
            status = "IDLE"
        else:
            status = "ACTIVE"

        return {
            "status": status,
            "victim_type": victim_type,
            "metrics": {
                "bpm":                signal.bpm,
                "depth_torso_pct":    round(depth_torso_pct, 2),
                "recoil_quality":     round(signal.recoil_quality * 100, 1),
                "elbow_angle":        round(elbow_angle, 1),
                "compression_count":  signal.compression_count,
                "torso_height":       round(torso_height, 4),
            },
            "ui_commands":          ui_commands,
            "low_visibility_warning": low_visibility,
        }

    # ────────────────────────────────────────────────────────────────────
    # Private
    # ────────────────────────────────────────────────────────────────────

    @staticmethod
    def _cmd(error_key: str, value: float = None) -> dict:
        """Build a single ui_command dict from an error_conditions key."""
        err = _ERR.get(error_key, {})
        correction = err.get("correction", {})
        cmd = {
            "id":       error_key,
            "severity": err.get("severity", "MEDIUM"),
            "text_ar":  correction.get("ar", ""),
            "text_en":  correction.get("en", ""),
            "text_fr":  correction.get("fr", ""),
        }
        if value is not None:
            cmd["value"] = round(float(value), 2)
        return cmd
