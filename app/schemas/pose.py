"""Pose-related Pydantic schemas."""

from enum import Enum

from pydantic import BaseModel, Field


class Keypoint(Enum):
    """MediaPipe pose keypoint indices."""

    NOSE = 0
    LEFT_EYE_INNER = 1
    LEFT_EYE = 2
    LEFT_EYE_OUTER = 3
    RIGHT_EYE_INNER = 4
    RIGHT_EYE = 5
    RIGHT_EYE_OUTER = 6
    LEFT_EAR = 7
    RIGHT_EAR = 8
    MOUTH_LEFT = 9
    MOUTH_RIGHT = 10
    LEFT_SHOULDER = 11
    RIGHT_SHOULDER = 12
    LEFT_ELBOW = 13
    RIGHT_ELBOW = 14
    LEFT_WRIST = 15
    RIGHT_WRIST = 16
    LEFT_PINKY = 17
    RIGHT_PINKY = 18
    LEFT_INDEX = 19
    RIGHT_INDEX = 20
    LEFT_THUMB = 21
    RIGHT_THUMB = 22
    LEFT_HIP = 23
    RIGHT_HIP = 24
    LEFT_KNEE = 25
    RIGHT_KNEE = 26
    LEFT_ANKLE = 27
    RIGHT_ANKLE = 28
    LEFT_HEEL = 29
    RIGHT_HEEL = 30
    LEFT_FOOT_INDEX = 31
    RIGHT_FOOT_INDEX = 32


class Point3D(BaseModel):
    """3D coordinate point."""

    x: float = Field(..., description="X coordinate (normalized 0-1)")
    y: float = Field(..., description="Y coordinate (normalized 0-1)")
    z: float = Field(..., description="Z coordinate (depth)")
    visibility: float = Field(default=0.0, ge=0.0, le=1.0)


class PoseData(BaseModel):
    """Complete pose data from a single frame."""

    keypoints: dict[int, Point3D] = Field(
        default_factory=dict, description="Keypoint index to 3D point mapping"
    )
    timestamp: float = Field(..., description="Frame timestamp in seconds")
    frame_id: int = Field(default=0, description="Frame sequence number")

    def get_keypoint(self, keypoint: Keypoint) -> Point3D | None:
        """Get a specific keypoint by enum."""
        return self.keypoints.get(keypoint.value)

    @property
    def is_valid(self) -> bool:
        """Check if pose data has sufficient keypoints detected."""
        return len(self.keypoints) >= 17


class PoseAnalysisResult(BaseModel):
    """Result of analyzing a pose against expected form."""

    is_correct: bool = Field(..., description="Whether the pose matches expected form")
    score: float = Field(..., ge=0.0, le=100.0, description="Form score 0-100")
    deviations: list[str] = Field(
        default_factory=list, description="List of detected deviations"
    )
    suggestions: list[str] = Field(
        default_factory=list, description="Improvement suggestions"
    )
    angles: dict[str, float] = Field(
        default_factory=dict, description="Measured joint angles"
    )
