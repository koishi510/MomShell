"""MediaPipe-based pose detection module using the new Tasks API."""

import time
import urllib.request
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from numpy.typing import NDArray

from app.core.config import get_settings
from app.schemas.pose import Point3D, PoseData

settings = get_settings()

# Model download URL
MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"
MODEL_PATH = Path("./models/pose_landmarker.task")

# Pose connections for drawing (33 landmarks)
POSE_CONNECTIONS = [
    (0, 1),
    (1, 2),
    (2, 3),
    (3, 7),  # Face
    (0, 4),
    (4, 5),
    (5, 6),
    (6, 8),
    (9, 10),  # Mouth
    (11, 12),  # Shoulders
    (11, 13),
    (13, 15),
    (15, 17),
    (15, 19),
    (15, 21),
    (17, 19),  # Left arm
    (12, 14),
    (14, 16),
    (16, 18),
    (16, 20),
    (16, 22),
    (18, 20),  # Right arm
    (11, 23),
    (12, 24),
    (23, 24),  # Torso
    (23, 25),
    (25, 27),
    (27, 29),
    (27, 31),
    (29, 31),  # Left leg
    (24, 26),
    (26, 28),
    (28, 30),
    (28, 32),
    (30, 32),  # Right leg
]


def ensure_model_exists() -> Path:
    """Download the pose landmarker model if it doesn't exist."""
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)

    if not MODEL_PATH.exists():
        print(f"Downloading pose landmarker model to {MODEL_PATH}...")
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
        print("Model downloaded successfully.")

    return MODEL_PATH


class PoseDetector:
    """Wrapper for MediaPipe Pose Landmarker detection."""

    def __init__(
        self,
        model_complexity: int | None = None,
        min_detection_confidence: float | None = None,
        min_tracking_confidence: float | None = None,
    ) -> None:
        """Initialize the pose detector with MediaPipe Tasks API.

        Args:
            model_complexity: Not used in new API, kept for compatibility.
            min_detection_confidence: Minimum confidence for detection.
            min_tracking_confidence: Minimum confidence for tracking.
        """
        model_path = ensure_model_exists()

        base_options = python.BaseOptions(model_asset_path=str(model_path))
        options = vision.PoseLandmarkerOptions(
            base_options=base_options,
            running_mode=vision.RunningMode.IMAGE,
            min_pose_detection_confidence=(
                min_detection_confidence or settings.min_detection_confidence
            ),
            min_tracking_confidence=(
                min_tracking_confidence or settings.min_tracking_confidence
            ),
        )

        self.landmarker = vision.PoseLandmarker.create_from_options(options)
        self._frame_count = 0
        self._start_time = time.time()

    def detect(self, frame: NDArray[np.uint8]) -> PoseData | None:
        """Detect pose in a single frame.

        Args:
            frame: BGR image as numpy array.

        Returns:
            PoseData if pose detected, None otherwise.
        """
        # Convert BGR to RGB for MediaPipe
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # Create MediaPipe Image
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)

        # Detect pose
        result = self.landmarker.detect(mp_image)

        if not result.pose_landmarks or len(result.pose_landmarks) == 0:
            return None

        # Extract keypoints from the first detected pose
        landmarks = result.pose_landmarks[0]
        keypoints: dict[int, Point3D] = {}

        for idx, landmark in enumerate(landmarks):
            keypoints[idx] = Point3D(
                x=landmark.x,
                y=landmark.y,
                z=landmark.z,
                visibility=landmark.visibility
                if hasattr(landmark, "visibility")
                else 1.0,
            )

        self._frame_count += 1
        timestamp = time.time() - self._start_time

        return PoseData(
            keypoints=keypoints,
            timestamp=timestamp,
            frame_id=self._frame_count,
        )

    def draw_landmarks(
        self,
        frame: NDArray[np.uint8],
        pose_data: PoseData,
        color: tuple[int, int, int] = (0, 255, 0),
    ) -> NDArray[np.uint8]:
        """Draw pose landmarks on the frame.

        Args:
            frame: BGR image to draw on.
            pose_data: Detected pose data.
            color: BGR color for drawing.

        Returns:
            Frame with landmarks drawn.
        """
        frame_copy = frame.copy()
        h, w = frame_copy.shape[:2]

        # Draw connections
        for connection in POSE_CONNECTIONS:
            start_idx, end_idx = connection
            if start_idx in pose_data.keypoints and end_idx in pose_data.keypoints:
                start_point = pose_data.keypoints[start_idx]
                end_point = pose_data.keypoints[end_idx]

                vis_threshold = 0.5
                start_vis = getattr(start_point, "visibility", 1.0)
                end_vis = getattr(end_point, "visibility", 1.0)

                if start_vis > vis_threshold and end_vis > vis_threshold:
                    start_px = (int(start_point.x * w), int(start_point.y * h))
                    end_px = (int(end_point.x * w), int(end_point.y * h))
                    cv2.line(frame_copy, start_px, end_px, color, 2)

        # Draw keypoints
        for _idx, point in pose_data.keypoints.items():
            vis = getattr(point, "visibility", 1.0)
            if vis > 0.5:
                px = (int(point.x * w), int(point.y * h))
                cv2.circle(frame_copy, px, 5, color, -1)
                cv2.circle(frame_copy, px, 7, (255, 255, 255), 1)

        return frame_copy

    def draw_feedback_overlay(
        self,
        frame: NDArray[np.uint8],
        pose_data: PoseData,
        deviations: dict[int, str],
    ) -> NDArray[np.uint8]:
        """Draw feedback overlay with color-coded keypoints.

        Args:
            frame: BGR image to draw on.
            pose_data: Detected pose data.
            deviations: Dict mapping keypoint indices to deviation descriptions.

        Returns:
            Frame with color-coded feedback overlay.
        """
        frame_copy = frame.copy()
        h, w = frame_copy.shape[:2]

        for idx, point in pose_data.keypoints.items():
            vis = getattr(point, "visibility", 1.0)
            if vis > 0.5:
                px = (int(point.x * w), int(point.y * h))

                # Red for deviations, green for correct
                if idx in deviations:
                    draw_color = (0, 0, 255)  # Red (BGR)
                    radius = 10
                else:
                    draw_color = (0, 255, 0)  # Green (BGR)
                    radius = 5

                cv2.circle(frame_copy, px, radius, draw_color, -1)
                cv2.circle(frame_copy, px, radius + 2, (255, 255, 255), 2)

        return frame_copy

    def close(self) -> None:
        """Release resources."""
        if hasattr(self, "landmarker"):
            self.landmarker.close()

    def __enter__(self) -> "PoseDetector":
        return self

    def __exit__(self, *args: object) -> None:
        self.close()
