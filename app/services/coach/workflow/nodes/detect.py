"""Pose detection node for the workflow.

Uses async pose detection with thread pool for non-blocking operation.
"""

import numpy as np
from numpy.typing import NDArray

from app.services.coach.pose.detector import PoseDetector
from app.services.coach.workflow.state import CoachState


class DetectNode:
    """Node that handles pose detection from video frames.

    Uses async detection to avoid blocking the event loop.
    """

    def __init__(self, detection_scale: float = 0.5) -> None:
        """Initialize the detection node.

        Args:
            detection_scale: Scale factor for detection (0.5 = half resolution).
        """
        self._detector: PoseDetector | None = None
        self._detection_scale = detection_scale

    def _ensure_detector(self) -> PoseDetector:
        """Ensure detector is initialized."""
        if self._detector is None:
            self._detector = PoseDetector(detection_scale=self._detection_scale)
        return self._detector

    async def __call__(
        self,
        state: CoachState,
        frame: NDArray[np.uint8] | None = None,
    ) -> CoachState:
        """Process a frame and update state with pose data.

        Args:
            state: Current workflow state.
            frame: Video frame to process (injected externally).

        Returns:
            Updated state with pose data.
        """
        if frame is None:
            return state

        detector = self._ensure_detector()

        # Use async detection to avoid blocking the event loop
        pose_data = await detector.detect_async(frame)

        if pose_data is None:
            # No pose detected, keep previous data
            return state

        # Update state
        state.current_pose = pose_data
        state.total_frames_analyzed += 1

        # Maintain pose history (for movement analysis)
        state.pose_history.append(pose_data)
        if len(state.pose_history) > 30:
            state.pose_history = state.pose_history[-30:]

        return state

    async def get_annotated_frame_async(
        self,
        frame: NDArray[np.uint8],
        state: CoachState,
    ) -> NDArray[np.uint8]:
        """Get frame with pose annotations (async version).

        Args:
            frame: Original frame.
            state: Current state with pose data.

        Returns:
            Annotated frame.
        """
        if state.current_pose is None:
            return frame

        detector = self._ensure_detector()

        # Determine color based on analysis
        if state.analysis_result:
            if state.analysis_result.is_correct:
                color = (0, 255, 0)  # Green for correct
            elif state.analysis_result.score >= 60:
                color = (0, 255, 255)  # Yellow for minor issues
            else:
                color = (0, 0, 255)  # Red for significant issues
        else:
            color = (255, 255, 255)  # White if no analysis yet

        return await detector.draw_landmarks_async(frame, state.current_pose, color)

    def get_annotated_frame(
        self,
        frame: NDArray[np.uint8],
        state: CoachState,
    ) -> NDArray[np.uint8]:
        """Get frame with pose annotations (sync version for compatibility).

        Args:
            frame: Original frame.
            state: Current state with pose data.

        Returns:
            Annotated frame.
        """
        if state.current_pose is None:
            return frame

        detector = self._ensure_detector()

        # Determine color based on analysis
        if state.analysis_result:
            if state.analysis_result.is_correct:
                color = (0, 255, 0)  # Green for correct
            elif state.analysis_result.score >= 60:
                color = (0, 255, 255)  # Yellow for minor issues
            else:
                color = (0, 0, 255)  # Red for significant issues
        else:
            color = (255, 255, 255)  # White if no analysis yet

        return detector.draw_landmarks(frame, state.current_pose, color)

    def close(self) -> None:
        """Release detector resources."""
        if self._detector:
            self._detector.close()
            self._detector = None


def create_detect_node(detection_scale: float = 0.5) -> DetectNode:
    """Factory function for DetectNode.

    Args:
        detection_scale: Scale factor for detection (0.5 = half resolution).
    """
    return DetectNode(detection_scale=detection_scale)
