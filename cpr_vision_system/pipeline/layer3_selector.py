"""
CPR Pipeline — Layer 3: Rescuer / Victim Pair Selection
=========================================================
Given 2+ tracked persons, identifies which is the rescuer and which is the victim.

Algorithm:
  Primary:  Victim has aspect_ratio > 1.5 (bounding box wider than tall = lying down).
  Fallback: If both upright (e.g. victim on bed), victim = person with highest y2
            (lowest position in frame).
  Rescuer:  Always the person with minimum centroid distance to identified victim.
"""

import math
from typing import List, Optional


class PairSelector:
    """
    Layer 3 — Geometric pair selection.

    Selects the (rescuer, victim) pair from a list of tracked persons.
    Returns None if fewer than 2 persons are present.
    """

    HORIZONTAL_ASPECT_RATIO = 1.5   # width/height threshold for lying-down detection

    def select(self, persons: List[dict]) -> Optional[dict]:
        """
        Identify the rescuer and victim from tracked persons.

        Args:
            persons: List of tracked person dicts from Layer 2.
                     Each dict: {x1, y1, x2, y2, track_id, confidence}

        Returns:
            {"rescuer": dict, "victim": dict}  or  None if <2 persons.
        """
        if len(persons) < 2:
            return None

        # Compute aspect ratio (width / height) for each person
        for p in persons:
            w = p["x2"] - p["x1"]
            h = p["y2"] - p["y1"]
            p["aspect_ratio"] = w / h if h > 0 else 1.0

        # Primary: find the most horizontal person (lying-down victim has larger width/height ratio)
        # A lying-down person (victim) typically has AR > 1.5; upright rescuer has AR < 1.0
        best_candidate = max(persons, key=lambda p: p["aspect_ratio"])

        if best_candidate["aspect_ratio"] >= self.HORIZONTAL_ASPECT_RATIO:
            # Clear horizontal victim detected
            victim = best_candidate
        else:
            # Both persons appear upright (e.g., victim on a bed/table at same height)
            # Fallback: victim is the person lowest in the frame (highest y2 value)
            # because a kneeling/lying person will appear lower than the standing rescuer
            victim = max(persons, key=lambda p: p["y2"])

        # Rescuer = person closest (by centroid) to the victim
        victim_cx = (victim["x1"] + victim["x2"]) / 2.0
        victim_cy = (victim["y1"] + victim["y2"]) / 2.0

        others = [p for p in persons if p["track_id"] != victim["track_id"]]
        if not others:
            return None  # Edge case: same track_id assigned to two detections

        rescuer = min(
            others,
            key=lambda p: math.hypot(
                (p["x1"] + p["x2"]) / 2.0 - victim_cx,
                (p["y1"] + p["y2"]) / 2.0 - victim_cy,
            ),
        )

        return {"rescuer": rescuer, "victim": victim}
