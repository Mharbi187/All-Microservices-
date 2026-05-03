"""
CPR Vision System - Vision Engine
==================================
Core computer vision module handling:
- Person detection and tracking (MediaPipe Pose)
- Face detection for attention monitoring (MediaPipe Face Mesh)
- Multi-person handling and rescuer identification
- Victim chest ROI estimation
"""

import cv2
import mediapipe as mp
import numpy as np
from typing import List, Tuple, Optional, Dict
from dataclasses import dataclass

from .config import VisionConfig, PoseLandmarks, runtime_config
from .utils import (euclidean_distance, compute_chest_roi, 
                    are_hands_superposed, point_in_rect, normalize_landmarks)


@dataclass
class PersonDetection:
    """Detected person with pose landmarks."""
    
    person_id: int
    landmarks: any  # MediaPipe pose landmarks
    visibility_score: float  # Average landmark visibility
    bbox: Tuple[int, int, int, int]  # Bounding box (x, y, w, h)
    
    # Key body points (pixel coordinates)
    left_wrist: Optional[Tuple[float, float]] = None
    right_wrist: Optional[Tuple[float, float]] = None
    left_shoulder: Optional[Tuple[float, float]] = None
    right_shoulder: Optional[Tuple[float, float]] = None
    left_hip: Optional[Tuple[float, float]] = None
    right_hip: Optional[Tuple[float, float]] = None
    
    # Derived features
    hands_center: Optional[Tuple[float, float]] = None
    chest_roi: Optional[Tuple[int, int, int, int]] = None
    is_rescuer: bool = False


class VisionEngine:
    """
    Main vision processing engine.
    
    Handles all computer vision tasks including person detection,
    pose estimation, facial landmark detection, and multi-person tracking.
    """
    
    def __init__(self):
        """Initialize MediaPipe solutions and internal state."""
        
        # MediaPipe Pose for rescuer tracking
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=1,  # 0=lite, 1=full, 2=heavy
            smooth_landmarks=True,
            min_detection_confidence=VisionConfig.POSE_DETECTION_CONFIDENCE,
            min_tracking_confidence=VisionConfig.POSE_TRACKING_CONFIDENCE
        )
        
        # MediaPipe Face Mesh for attention monitoring
        self.mp_face = mp.solutions.face_mesh
        self.face_mesh = self.mp_face.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,  # Track only rescuer's face
            refine_landmarks=False,
            min_detection_confidence=VisionConfig.FACE_DETECTION_CONFIDENCE,
            min_tracking_confidence=VisionConfig.FACE_TRACKING_CONFIDENCE
        )
        
        # Drawing utilities
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_drawing_styles = mp.solutions.drawing_styles
        
        # Internal state
        self.detected_persons: List[PersonDetection] = []
        self.rescuer: Optional[PersonDetection] = None
        self.victim_chest_roi: Optional[Tuple[int, int, int, int]] = None
        self.face_landmarks = None
        
        # Performance metrics
        self.frame_width = 0
        self.frame_height = 0
        
    def process_frame(self, frame: np.ndarray) -> Tuple[np.ndarray, Dict]:
        """
        Main processing pipeline for each video frame.
        
        Pipeline:
        1. Detect all persons in frame (Pose detection)
        2. Extract body landmarks for each person
        3. Identify rescuer (person with hands on chest ROI)
        4. Estimate victim chest ROI
        5. Detect rescuer's face for attention monitoring
        6. Return processed frame and metadata
        
        Args:
            frame: BGR image from camera
        
        Returns:
            (processed_frame, metadata_dict)
        """
        self.frame_height, self.frame_width = frame.shape[:2]
        
        # Convert BGR to RGB for MediaPipe
        image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        image_rgb.flags.writeable = False  # Performance optimization
        
        # === STEP 1: Pose Detection ===
        pose_results = self.pose.process(image_rgb)
        
        # === STEP 2: Face Detection (for rescuer attention monitoring) ===
        face_results = self.face_mesh.process(image_rgb)
        
        # Make image writable again
        image_rgb.flags.writeable = True
        
        # === STEP 3: Process Detections ===
        self._process_pose_detections(pose_results)
        self._process_face_detections(face_results)
        
        # === STEP 4: Identify Rescuer and Victim ===
        self._identify_rescuer_and_victim()
        
        # === STEP 5: Build Metadata ===
        metadata = self._build_metadata()
        
        return frame, metadata
    
    def _process_pose_detections(self, results) -> None:
        """
        Process MediaPipe Pose detections.
        
        Handles multi-person tracking by analyzing all visible persons
        and extracting relevant body landmarks.
        
        Args:
            results: MediaPipe Pose results
        """
        self.detected_persons = []
        
        if not results.pose_landmarks:
            return
        
        # Note: MediaPipe Pose returns only ONE person per frame in current version
        # For multi-person detection, we would need to use MediaPipe Holistic
        # or run detection on sub-regions
        
        landmarks = results.pose_landmarks.landmark
        
        # Calculate average visibility score
        visibility_score = np.mean([lm.visibility for lm in landmarks 
                                   if hasattr(lm, 'visibility')])
        
        # Only process if visibility is acceptable
        if visibility_score < VisionConfig.MIN_BODY_VISIBILITY:
            return
        
        # Extract pixel coordinates
        pixel_landmarks = normalize_landmarks(
            results.pose_landmarks, 
            self.frame_width, 
            self.frame_height
        )
        
        # Create PersonDetection object
        person = PersonDetection(
            person_id=0,
            landmarks=results.pose_landmarks,
            visibility_score=visibility_score,
            bbox=self._compute_bbox(pixel_landmarks)
        )
        
        # Extract key body points
        person.left_wrist = pixel_landmarks[PoseLandmarks.LEFT_WRIST]
        person.right_wrist = pixel_landmarks[PoseLandmarks.RIGHT_WRIST]
        person.left_shoulder = pixel_landmarks[PoseLandmarks.LEFT_SHOULDER]
        person.right_shoulder = pixel_landmarks[PoseLandmarks.RIGHT_SHOULDER]
        person.left_hip = pixel_landmarks[PoseLandmarks.LEFT_HIP]
        person.right_hip = pixel_landmarks[PoseLandmarks.RIGHT_HIP]
        
        # Compute hands center point
        person.hands_center = (
            (person.left_wrist[0] + person.right_wrist[0]) / 2,
            (person.left_wrist[1] + person.right_wrist[1]) / 2
        )
        
        # Estimate chest ROI for this person
        person.chest_roi = compute_chest_roi(
            shoulders=(person.left_shoulder, person.right_shoulder),
            hips=(person.left_hip, person.right_hip),
            expansion_factor=VisionConfig.CHEST_ROI_EXPANSION_FACTOR
        )
        
        self.detected_persons.append(person)
    
    def _process_face_detections(self, results) -> None:
        """
        Process MediaPipe Face Mesh detections.
        
        Args:
            results: MediaPipe Face Mesh results
        """
        if results.multi_face_landmarks:
            # Track only the first detected face (assumed to be rescuer)
            self.face_landmarks = results.multi_face_landmarks[0]
        else:
            self.face_landmarks = None
    
    def _identify_rescuer_and_victim(self) -> None:
        """
        Identify which person is the rescuer performing CPR.
        
        Logic:
        1. If only one person detected → assume they are the rescuer
        2. If multiple persons detected → rescuer is the one with:
           - Hands superposed
           - Hands positioned over another person's chest ROI
        
        The victim's chest ROI is then estimated from the rescuer's
        hand position and body proportions.
        """
        if not self.detected_persons:
            self.rescuer = None
            self.victim_chest_roi = None
            return
        
        # Single person case
        if len(self.detected_persons) == 1:
            person = self.detected_persons[0]
            
            # Verify hands are superposed (proper CPR technique)
            if are_hands_superposed(
                person.left_wrist,
                person.right_wrist,
                VisionConfig.HAND_SUPERPOSITION_THRESHOLD_PX
            ):
                person.is_rescuer = True
                self.rescuer = person
                
                # Estimate victim chest ROI from hand position
                # Assume victim is lying down, chest is where hands are positioned
                self.victim_chest_roi = self._estimate_victim_chest_from_hands(
                    person.hands_center
                )
            else:
                self.rescuer = None
                self.victim_chest_roi = None
        
        # Multi-person case (future enhancement)
        else:
            # TODO: Implement multi-person rescuer detection
            # For now, use the first person with superposed hands
            for person in self.detected_persons:
                if are_hands_superposed(
                    person.left_wrist,
                    person.right_wrist,
                    VisionConfig.HAND_SUPERPOSITION_THRESHOLD_PX
                ):
                    person.is_rescuer = True
                    self.rescuer = person
                    self.victim_chest_roi = self._estimate_victim_chest_from_hands(
                        person.hands_center
                    )
                    break
    
    def _estimate_victim_chest_from_hands(self, 
                                          hands_position: Tuple[float, float]) -> Tuple[int, int, int, int]:
        """
        Estimate victim's chest ROI from rescuer's hand position.
        
        Since the victim is typically lying down and not detected by pose
        estimation, we approximate the chest region based on where the
        rescuer's hands are positioned.
        
        Args:
            hands_position: (x, y) pixel coordinates of hands center
        
        Returns:
            (x, y, width, height) rectangle representing victim chest
        """
        # Approximate chest dimensions (in pixels, relative to typical frame size)
        chest_width = int(self.frame_width * 0.15)  # ~15% of frame width
        chest_height = int(self.frame_height * 0.12)  # ~12% of frame height
        
        # Center the ROI on hand position
        x = int(hands_position[0] - chest_width / 2)
        y = int(hands_position[1] - chest_height / 2)
        
        # Ensure ROI is within frame bounds
        x = max(0, min(x, self.frame_width - chest_width))
        y = max(0, min(y, self.frame_height - chest_height))
        
        return (x, y, chest_width, chest_height)
    
    def _compute_bbox(self, landmarks: List[Tuple[float, float]]) -> Tuple[int, int, int, int]:
        """
        Compute bounding box from body landmarks.
        
        Args:
            landmarks: List of (x, y) pixel coordinates
        
        Returns:
            (x, y, width, height) bounding box
        """
        xs = [lm[0] for lm in landmarks]
        ys = [lm[1] for lm in landmarks]
        
        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)
        
        return (int(min_x), int(min_y), 
                int(max_x - min_x), int(max_y - min_y))
    
    def _build_metadata(self) -> Dict:
        """
        Build metadata dictionary with detection results.
        
        Returns:
            Dictionary containing:
            - rescuer_detected: bool
            - hands_superposed: bool
            - hands_on_chest: bool
            - face_detected: bool
            - confidence: float (0-1)
        """
        metadata = {
            "rescuer_detected": self.rescuer is not None,
            "hands_superposed": False,
            "hands_on_chest": False,
            "face_detected": self.face_landmarks is not None,
            "confidence": 0.0,
            "rescuer": None,
            "victim_chest_roi": self.victim_chest_roi,
            "face_landmarks": self.face_landmarks
        }
        
        if self.rescuer:
            metadata["rescuer"] = self.rescuer
            metadata["hands_superposed"] = are_hands_superposed(
                self.rescuer.left_wrist,
                self.rescuer.right_wrist,
                VisionConfig.HAND_SUPERPOSITION_THRESHOLD_PX
            )
            
            # Check if hands are on victim chest
            if self.victim_chest_roi:
                metadata["hands_on_chest"] = point_in_rect(
                    self.rescuer.hands_center,
                    self.victim_chest_roi
                )
            
            # Overall confidence score
            metadata["confidence"] = self.rescuer.visibility_score
        
        return metadata
    
    def draw_visualization(self, frame: np.ndarray, metadata: Dict) -> np.ndarray:
        """
        Draw visual feedback overlays on frame.
        
        Visualization includes:
        - Skeleton overlay
        - Hand position markers
        - Chest ROI rectangle
        - Face mesh (optional)
        
        Args:
            frame: Image to draw on
            metadata: Detection metadata
        
        Returns:
            Frame with visualizations
        """
        if not runtime_config.show_skeleton:
            return frame
        
        # Draw rescuer skeleton
        if metadata["rescuer_detected"] and self.rescuer:
            self.mp_drawing.draw_landmarks(
                frame,
                self.rescuer.landmarks,
                self.mp_pose.POSE_CONNECTIONS,
                landmark_drawing_spec=self.mp_drawing_styles.get_default_pose_landmarks_style()
            )
            
            # Highlight hands
            left_wrist_px = tuple(map(int, self.rescuer.left_wrist))
            right_wrist_px = tuple(map(int, self.rescuer.right_wrist))
            
            hand_color = (0, 255, 0) if metadata["hands_superposed"] else (0, 0, 255)
            cv2.circle(frame, left_wrist_px, 8, hand_color, -1)
            cv2.circle(frame, right_wrist_px, 8, hand_color, -1)
        
        # Draw victim chest ROI
        if runtime_config.show_chest_roi and self.victim_chest_roi:
            roi_color = (0, 255, 255) if metadata["hands_on_chest"] else (255, 255, 0)
            x, y, w, h = self.victim_chest_roi
            cv2.rectangle(frame, (x, y), (x + w, y + h), roi_color, 2)
            cv2.putText(frame, "VICTIM CHEST", (x, y - 10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, roi_color, 1)
        
        # Draw face mesh (optional, can be distracting)
        if False and self.face_landmarks:  # Disabled by default
            self.mp_drawing.draw_landmarks(
                frame,
                self.face_landmarks,
                self.mp_face.FACEMESH_CONTOURS,
                landmark_drawing_spec=None,
                connection_drawing_spec=self.mp_drawing_styles.get_default_face_mesh_contours_style()
            )
        
        return frame
    
    def release(self):
        """Release MediaPipe resources."""
        self.pose.close()
        self.face_mesh.close()
