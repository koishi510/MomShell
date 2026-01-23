"""Pose detection node for the workflow."""

import numpy as np
from numpy.typing import NDArray

from app.services.rehab.pose.detector import PoseDetector
from app.services.rehab.workflow.state import CoachState


class DetectNode:
    """Node that handles pose detection from video frames."""

    def __init__(self) -> None:
        """Initialize the detection node."""
        self._detector: PoseDetector | None = None

    def _ensure_detector(self) -> PoseDetector:
        """Ensure detector is initialized."""
        if self._detector is None:
            self._detector = PoseDetector()
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
        pose_data = detector.detect(frame)

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

    def get_annotated_frame(
        self,
        frame: NDArray[np.uint8],
        state: CoachState,
    ) -> NDArray[np.uint8]:
        """Get frame with pose annotations.

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


def create_detect_node() -> DetectNode:
    """Factory function for DetectNode."""
    return DetectNode()
