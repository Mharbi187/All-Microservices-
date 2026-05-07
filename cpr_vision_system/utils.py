"""
CPR Vision System - Mathematical Utilities
===========================================
Geometric calculations, vector operations, and mathematical helpers.
"""

import numpy as np
import cv2
from typing import Tuple, List, Optional
from collections import deque


# ============================================
# PIPELINE HELPERS (used by layer6_logic.py)
# ============================================

def mid(a: float, b: float) -> float:
    """Midpoint of two scalar values."""
    return (a + b) / 2.0


def angle(a: dict, b: dict, c: dict) -> float:
    """
    Angle at vertex B (degrees) formed by vectors BA and BC.
    Each point is a landmark dict with 'x' and 'y' keys (normalized 0.0–1.0).

    Returns 180.0 for degenerate cases (zero-length vector) to indicate
    a straight line — conservative choice that won't trigger 'arms_bent'.
    """
    ba = np.array([a["x"] - b["x"], a["y"] - b["y"]])
    bc = np.array([c["x"] - b["x"], c["y"] - b["y"]])
    mag_ba = np.linalg.norm(ba)
    mag_bc = np.linalg.norm(bc)
    if mag_ba < 1e-9 or mag_bc < 1e-9:
        return 180.0  # Degenerate: return straight-arm value — safe default
    cos_angle = np.clip(np.dot(ba, bc) / (mag_ba * mag_bc), -1.0, 1.0)
    return float(np.degrees(np.arccos(cos_angle)))


# ============================================
# GEOMETRIC CALCULATIONS
# ============================================

def euclidean_distance(point1: Tuple[float, float], 
                       point2: Tuple[float, float]) -> float:
    """
    Calculate Euclidean distance between two 2D points.
    
    Formula: d = √((x₂-x₁)² + (y₂-y₁)²)
    
    Args:
        point1: (x, y) coordinates of first point
        point2: (x, y) coordinates of second point
    
    Returns:
        Distance in pixels
    """
    return np.sqrt((point2[0] - point1[0])**2 + (point2[1] - point1[1])**2)


def midpoint(point1: Tuple[float, float], 
             point2: Tuple[float, float]) -> Tuple[float, float]:
    """
    Calculate midpoint between two 2D points.
    
    Formula: M = ((x₁+x₂)/2, (y₁+y₂)/2)
    
    Args:
        point1: (x, y) coordinates of first point
        point2: (x, y) coordinates of second point
    
    Returns:
        Midpoint (x, y) coordinates
    """
    return ((point1[0] + point2[0]) / 2, (point1[1] + point2[1]) / 2)


def point_in_rect(point: Tuple[float, float], 
                  rect: Tuple[int, int, int, int]) -> bool:
    """
    Check if a point lies inside a rectangle.
    
    Args:
        point: (x, y) coordinates
        rect: (x, y, width, height) rectangle
    
    Returns:
        True if point is inside rectangle
    """
    x, y = point
    rx, ry, rw, rh = rect
    return rx <= x <= (rx + rw) and ry <= y <= (ry + rh)


def compute_chest_roi(shoulders: Tuple[Tuple[float, float], Tuple[float, float]],
                      hips: Tuple[Tuple[float, float], Tuple[float, float]],
                      expansion_factor: float = 1.2) -> Tuple[int, int, int, int]:
    """
    Compute chest Region of Interest (ROI) for hand positioning validation.
    
    The chest ROI is defined as:
    - Top: Shoulder level
    - Bottom: Mid-torso (between shoulders and hips)
    - Width: Distance between shoulders × expansion_factor
    - Center: Midpoint between shoulders
    
    Args:
        shoulders: ((left_x, left_y), (right_x, right_y))
        hips: ((left_x, left_y), (right_x, right_y))
        expansion_factor: Safety margin multiplier
    
    Returns:
        (x, y, width, height) rectangle in pixel coordinates
    """
    left_shoulder, right_shoulder = shoulders
    left_hip, right_hip = hips
    
    # Center of chest (between shoulders)
    center_x = (left_shoulder[0] + right_shoulder[0]) / 2
    center_y = (left_shoulder[1] + right_shoulder[1]) / 2
    
    # Chest width (shoulder to shoulder)
    chest_width = euclidean_distance(left_shoulder, right_shoulder) * expansion_factor
    
    # Chest height (from shoulders to mid-torso)
    hip_center_y = (left_hip[1] + right_hip[1]) / 2
    chest_height = (hip_center_y - center_y) * 0.6  # Upper 60% of torso
    
    # ROI rectangle
    x = int(center_x - chest_width / 2)
    y = int(center_y)
    w = int(chest_width)
    h = int(chest_height)
    
    return (x, y, w, h)


def are_hands_superposed(left_wrist: Tuple[float, float],
                         right_wrist: Tuple[float, float],
                         threshold: float = 40) -> bool:
    """
    Verify if both hands are superposed (proper CPR hand positioning).
    
    Proper CPR technique requires hands to be placed one over the other.
    This is validated by checking if the distance between wrists is
    below a threshold.
    
    Args:
        left_wrist: (x, y) coordinates
        right_wrist: (x, y) coordinates
        threshold: Maximum distance in pixels to consider hands superposed
    
    Returns:
        True if hands are correctly superposed
    """
    distance = euclidean_distance(left_wrist, right_wrist)
    return distance < threshold


# ============================================
# HEAD POSE ESTIMATION
# ============================================

def estimate_head_pose(face_landmarks, 
                       image_shape: Tuple[int, int]) -> Tuple[float, float, float]:
    """
    Estimate head pose angles (Pitch, Yaw, Roll) from facial landmarks.
    
    Uses a simplified PnP (Perspective-n-Point) algorithm with 3D face model.
    
    Reference points:
    - Nose tip
    - Chin
    - Left eye outer corner
    - Right eye outer corner
    - Left mouth corner
    - Right mouth corner
    
    Args:
        face_landmarks: MediaPipe FaceMesh landmarks
        image_shape: (height, width) of image
    
    Returns:
        (pitch, yaw, roll) in degrees
        - Pitch: up (+) / down (-)
        - Yaw: left (+) / right (-)
        - Roll: tilt left (+) / right (-)
    """
    h, w = image_shape
    
    # 2D image points from face landmarks
    # MediaPipe FaceMesh indices for key facial features
    image_points = np.array([
        (face_landmarks.landmark[1].x * w, face_landmarks.landmark[1].y * h),    # Nose tip
        (face_landmarks.landmark[152].x * w, face_landmarks.landmark[152].y * h), # Chin
        (face_landmarks.landmark[33].x * w, face_landmarks.landmark[33].y * h),   # Left eye left corner
        (face_landmarks.landmark[263].x * w, face_landmarks.landmark[263].y * h), # Right eye right corner
        (face_landmarks.landmark[61].x * w, face_landmarks.landmark[61].y * h),   # Left mouth corner
        (face_landmarks.landmark[291].x * w, face_landmarks.landmark[291].y * h)  # Right mouth corner
    ], dtype="double")
    
    # 3D model points (generic face model in cm)
    model_points = np.array([
        (0.0, 0.0, 0.0),           # Nose tip
        (0.0, -6.3, -3.5),         # Chin
        (-4.3, 3.2, -1.5),         # Left eye left corner
        (4.3, 3.2, -1.5),          # Right eye right corner
        (-2.9, -2.5, -1.5),        # Left mouth corner
        (2.9, -2.5, -1.5)          # Right mouth corner
    ])
    
    # Camera internals (approximate)
    focal_length = w
    center = (w / 2, h / 2)
    camera_matrix = np.array([
        [focal_length, 0, center[0]],
        [0, focal_length, center[1]],
        [0, 0, 1]
    ], dtype="double")
    
    # Assume no lens distortion
    dist_coeffs = np.zeros((4, 1))
    
    # Solve PnP
    success, rotation_vec, translation_vec = cv2.solvePnP(
        model_points, image_points, camera_matrix, dist_coeffs,
        flags=cv2.SOLVEPNP_ITERATIVE
    )
    
    if not success:
        return (0.0, 0.0, 0.0)
    
    # Convert rotation vector to rotation matrix
    rotation_mat, _ = cv2.Rodrigues(rotation_vec)
    
    # Calculate Euler angles
    pitch, yaw, roll = rotation_matrix_to_euler_angles(rotation_mat)
    
    return (pitch, yaw, roll)


def rotation_matrix_to_euler_angles(R: np.ndarray) -> Tuple[float, float, float]:
    """
    Convert rotation matrix to Euler angles (Pitch, Yaw, Roll).
    
    Formula (Tait-Bryan angles, ZYX convention):
    - Pitch (X-axis): arcsin(-R[2,0])
    - Yaw (Y-axis): arctan2(R[1,0], R[0,0])
    - Roll (Z-axis): arctan2(R[2,1], R[2,2])
    
    Args:
        R: 3x3 rotation matrix
    
    Returns:
        (pitch, yaw, roll) in degrees
    """
    sy = np.sqrt(R[0, 0] ** 2 + R[1, 0] ** 2)
    
    singular = sy < 1e-6
    
    if not singular:
        pitch = np.arctan2(R[2, 1], R[2, 2])
        yaw = np.arctan2(-R[2, 0], sy)
        roll = np.arctan2(R[1, 0], R[0, 0])
    else:
        pitch = np.arctan2(-R[1, 2], R[1, 1])
        yaw = np.arctan2(-R[2, 0], sy)
        roll = 0
    
    # Convert to degrees
    return (np.degrees(pitch), np.degrees(yaw), np.degrees(roll))


# ============================================
# SIGNAL PROCESSING
# ============================================

class KalmanFilter1D:
    """
    Simple 1D Kalman filter for smoothing noisy measurements.
    
    Useful for filtering vertical hand position during compressions.
    
    State model:
    - x_k = x_{k-1} + v_{k-1}  (position + velocity)
    - z_k = x_k + noise         (measurement)
    """
    
    def __init__(self, process_noise: float = 0.01, 
                 measurement_noise: float = 0.1,
                 initial_value: float = 0.0):
        """
        Initialize Kalman filter.
        
        Args:
            process_noise: Process noise covariance (Q)
            measurement_noise: Measurement noise covariance (R)
            initial_value: Initial state estimate
        """
        # State estimate
        self.x = initial_value
        
        # Estimate uncertainty
        self.P = 1.0
        
        # Process noise covariance
        self.Q = process_noise
        
        # Measurement noise covariance
        self.R = measurement_noise
        
    def update(self, measurement: float) -> float:
        """
        Update filter with new measurement.
        
        Args:
            measurement: Observed value
        
        Returns:
            Filtered estimate
        """
        # Prediction step
        x_pred = self.x
        P_pred = self.P + self.Q
        
        # Update step
        K = P_pred / (P_pred + self.R)  # Kalman gain
        self.x = x_pred + K * (measurement - x_pred)
        self.P = (1 - K) * P_pred
        
        return self.x


class MovingAverageFilter:
    """
    Simple moving average filter for smoothing time-series data.
    
    Useful for BPM calculation and removing high-frequency noise.
    """
    
    def __init__(self, window_size: int = 5):
        """
        Initialize moving average filter.
        
        Args:
            window_size: Number of samples to average
        """
        self.window_size = window_size
        self.buffer = deque(maxlen=window_size)
        
    def update(self, value: float) -> float:
        """
        Add new value and return moving average.
        
        Args:
            value: New sample
        
        Returns:
            Moving average
        """
        self.buffer.append(value)
        return sum(self.buffer) / len(self.buffer)
    
    def reset(self):
        """Clear buffer."""
        self.buffer.clear()


# ============================================
# VISUALIZATION HELPERS
# ============================================

def draw_landmark_circle(image: np.ndarray, 
                        landmark: Tuple[float, float],
                        color: Tuple[int, int, int] = (0, 255, 0),
                        radius: int = 5) -> None:
    """
    Draw a circle at a landmark position.
    
    Args:
        image: Image to draw on (modified in-place)
        landmark: (x, y) pixel coordinates
        color: BGR color tuple
        radius: Circle radius
    """
    x, y = int(landmark[0]), int(landmark[1])
    cv2.circle(image, (x, y), radius, color, -1)


def draw_roi_rectangle(image: np.ndarray,
                      roi: Tuple[int, int, int, int],
                      color: Tuple[int, int, int] = (255, 255, 0),
                      thickness: int = 2,
                      label: str = None) -> None:
    """
    Draw a rectangle for Region of Interest.
    
    Args:
        image: Image to draw on (modified in-place)
        roi: (x, y, width, height) rectangle
        color: BGR color tuple
        thickness: Line thickness
        label: Optional text label
    """
    x, y, w, h = roi
    cv2.rectangle(image, (x, y), (x + w, y + h), color, thickness)
    
    if label:
        cv2.putText(image, label, (x, y - 10), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)


def normalize_landmarks(landmarks, image_width: int, image_height: int) -> List[Tuple[float, float]]:
    """
    Convert normalized MediaPipe landmarks to pixel coordinates.
    
    MediaPipe returns landmarks in normalized coordinates [0.0, 1.0].
    This function converts them to absolute pixel coordinates.
    
    Args:
        landmarks: MediaPipe landmark list
        image_width: Image width in pixels
        image_height: Image height in pixels
    
    Returns:
        List of (x, y) tuples in pixel coordinates
    """
    return [(lm.x * image_width, lm.y * image_height) for lm in landmarks.landmark]
