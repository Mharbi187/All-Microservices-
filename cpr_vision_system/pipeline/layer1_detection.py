"""
CPR Pipeline — Layer 1: Person Detection
==========================================
Uses YOLOv8 (detect model) to find all persons in a frame.
Produces bounding boxes ONLY — no pose estimation here.
"""

import numpy as np
from typing import List
from ultralytics import YOLO


class PersonDetector:
    """
    Layer 1 — YOLO person detection.

    Detects all persons in a frame and returns their bounding boxes.
    Deliberately does NOT run pose estimation — that belongs to Layer 4 (MediaPipe).
    """

    def __init__(self, model_path: str = "yolo26n.pt", conf: float = 0.25) -> None:
        """
        Args:
            model_path: Path to a YOLO detection model (NOT yolov8n-pose.pt).
            conf:       Minimum detection confidence threshold.
        """
        self.model = YOLO(model_path)
        self.conf = conf

    def detect(self, frame: np.ndarray) -> List[dict]:
        """
        Detect all persons in a frame.

        Args:
            frame: BGR image as np.ndarray.

        Returns:
            List of bounding box dicts:
            {x1, y1, x2, y2, confidence}  — all in absolute pixels.
        """
        results = self.model(
            frame,
            classes=[0],        # class 0 = person in COCO
            conf=self.conf,
            verbose=False,
        )

        boxes = []
        for r in results:
            for box in r.boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                boxes.append({
                    "x1": int(x1),
                    "y1": int(y1),
                    "x2": int(x2),
                    "y2": int(y2),
                    "confidence": float(box.conf),
                })
        return boxes
