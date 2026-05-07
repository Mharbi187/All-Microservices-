"""
CPR Pipeline — Layer 5: Victim Classification
================================================
Uses best.pt (custom YOLO classification model) to identify the victim type:
  adult | child | infant | pregnant

Runs every 3 seconds only (cached between runs) to conserve CPU.
"""

import cv2
import time
import numpy as np
from ultralytics import YOLO

INPUT_SIZE = (224, 224)   # Resize victim crop to this before inference

# Maps best.pt class names to rcp_rules.json victim_type keys
# Update this mapping if your model classes differ
CLASS_NAME_MAP = {
    "adult":    "adult",
    "child":    "child",
    "infant":   "infant",
    "pregnant": "pregnant",
    # Common alternate spellings
    "enfant":   "child",
    "nourrisson": "infant",
    "enceinte": "pregnant",
}


class VictimClassifier:
    """
    Layer 5 — Custom victim-type classification.

    Crops the victim from the full frame, resizes to INPUT_SIZE,
    runs best.pt inference, and returns the top predicted class.
    Results are cached for RUN_INTERVAL_SEC seconds.
    """

    RUN_INTERVAL_SEC = 3.0   # Run at most once every 3 seconds

    def __init__(self, model_path: str = "best.pt") -> None:
        import os
        if os.path.exists(model_path):
            self.model = YOLO(model_path)
            print(f"[Layer 5] Loaded {model_path}. Classes: {self.model.names}")
        else:
            self.model = None
            print(f"WARNING: Victim classification model '{model_path}' not found. Defaulting to 'adult'.")
        self._last_result: dict = {"victim_type": "adult", "confidence": 0.0}
        self._last_run_time: float = 0.0

    def classify(self, frame: np.ndarray, victim: dict, current_time: float = 0.0) -> dict:
        """
        Classify the victim type from their bounding box crop.

        Args:
            frame:        Full BGR frame.
            victim:       Tracked person dict for the victim {x1,y1,x2,y2,...}.
            current_time: Current time in seconds. Defaults to time.time().

        Returns:
            {"victim_type": str, "confidence": float}
            Returns cached result if called within RUN_INTERVAL_SEC.
        """
        if current_time == 0.0:
            current_time = time.time()

        # Return cached result between classification intervals
        if current_time - self._last_run_time < self.RUN_INTERVAL_SEC:
            return self._last_result

        if self.model is None:
            self._last_run_time = current_time
            return self._last_result

        # Crop victim region from full frame
        y1, y2 = victim["y1"], victim["y2"]
        x1, x2 = victim["x1"], victim["x2"]
        crop = frame[y1:y2, x1:x2]

        if crop.size == 0:
            return self._last_result   # Empty crop — return cached

        # Resize to model's expected input dimensions
        crop_resized = cv2.resize(crop, INPUT_SIZE)

        # Run inference (classification mode)
        results = self.model(crop_resized, verbose=False)

        try:
            top_idx = int(results[0].probs.top1)
            top_conf = float(results[0].probs.top1conf)
            raw_name = results[0].names[top_idx].lower()
            victim_type = CLASS_NAME_MAP.get(raw_name, "adult")
        except (AttributeError, IndexError, KeyError):
            # Model output unexpected — keep previous result
            return self._last_result

        self._last_result = {"victim_type": victim_type, "confidence": top_conf}
        self._last_run_time = current_time
        return self._last_result
