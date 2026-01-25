"""Main LangGraph workflow for the recovery coach.

This module implements a simplified workflow without LangGraph state machine
to avoid compatibility issues with Pydantic models. It provides the same
interface while maintaining the node-based architecture.
"""

import uuid

import numpy as np
from numpy.typing import NDArray

from app.services.rehab.exercises.library import get_exercise
from app.services.rehab.workflow.nodes.analyze import create_analyze_node
from app.services.rehab.workflow.nodes.detect import create_detect_node
from app.services.rehab.workflow.nodes.feedback import (
    create_feedback_node,
)
from app.services.rehab.workflow.nodes.track import create_track_node
from app.services.rehab.workflow.state import CoachState, SessionState


class CoachWorkflow:
    """Coaching workflow that processes frames through a pipeline.

    This class manages the coaching session state and processes frames
    through detection, analysis, feedback, and tracking nodes.

    Optimized: Only runs full analysis every N frames for lower latency.
    """

    def __init__(self, use_llm: bool = True) -> None:
        """Initialize the workflow.

        Args:
            use_llm: Whether to use LLM for feedback generation.
        """
        # Create nodes (lazy initialization)
        self._detect_node = create_detect_node()
        self._analyze_node = create_analyze_node()
        self._feedback_node = create_feedback_node(use_llm=use_llm)
        self._track_node = create_track_node()

        # Current state
        self._state: CoachState | None = None
        self._current_frame: NDArray[np.uint8] | None = None

        # Optimization: only analyze every N frames
        self._frame_counter = 0
        self._analyze_every_n_frames = 2  # Analyze every 2nd frame (increased from 3)

    async def _process_pipeline(self, frame: NDArray[np.uint8]) -> CoachState:
        """Process a frame through the full pipeline.

        Optimized: Only runs analysis/feedback/tracking every N frames.

        Args:
            frame: Video frame to process.

        Returns:
            Updated state after processing.
        """
        if self._state is None:
            raise RuntimeError("No active session")

        self._frame_counter += 1

        # Step 1: Always detect pose
        self._state = await self._detect_node(self._state, frame)

        # Steps 2-4: Only run every N frames to reduce latency
        if self._frame_counter % self._analyze_every_n_frames == 0:
            # Step 2: Analyze pose
            self._state = await self._analyze_node(self._state)

            # Step 3: Generate feedback (runs in background, non-blocking)
            self._state = await self._feedback_node(self._state)

            # Step 4: Track progress
            self._state = await self._track_node(self._state)

        return self._state

    def start_session(self, exercise_id: str) -> CoachState:
        """Start a new coaching session.

        Args:
            exercise_id: ID of the exercise to perform.

        Returns:
            Initial state.
        """
        exercise = get_exercise(exercise_id)
        if exercise is None:
            raise ValueError(f"Unknown exercise: {exercise_id}")

        self._state = CoachState(
            session_id=str(uuid.uuid4()),
            session_state=SessionState.PREPARING,
            current_exercise=exercise,
            current_phase_index=0,
            current_set=1,
            current_rep=1,
        )

        self._analyze_node.start_session()
        self._track_node.reset()

        return self._state

    def start_exercise(self) -> CoachState | None:
        """Begin the exercise after preparation.

        Returns:
            Updated state.
        """
        if self._state is None:
            return None

        self._state.session_state = SessionState.EXERCISING
        return self._state

    async def process_frame(
        self, frame: NDArray[np.uint8]
    ) -> tuple[CoachState, NDArray[np.uint8]]:
        """Process a single video frame through the workflow.

        Args:
            frame: Video frame to process.

        Returns:
            Tuple of (updated state, annotated frame).
        """
        if self._state is None:
            raise RuntimeError("No active session. Call start_session first.")

        if self._state.session_state != SessionState.EXERCISING:
            # Not exercising, just return current state
            return self._state, frame

        try:
            # Process frame through the pipeline
            self._state = await self._process_pipeline(frame)

            # Get annotated frame (async for non-blocking)
            annotated = await self._detect_node.get_annotated_frame_async(
                frame, self._state
            )

            return self._state, annotated
        except Exception as e:
            # Log error and return current state without crashing
            import logging

            logging.getLogger(__name__).error(f"Frame processing error: {e}")
            return self._state, frame

    def pause(self) -> CoachState | None:
        """Pause the current session.

        Returns:
            Updated state.
        """
        if self._state is None:
            return None

        self._state.session_state = SessionState.PAUSED
        self._state.is_paused = True
        return self._state

    def resume(self) -> CoachState | None:
        """Resume a paused session.

        Returns:
            Updated state.
        """
        if self._state is None:
            return None

        self._state.session_state = SessionState.EXERCISING
        self._state.is_paused = False
        return self._state

    def rest(self) -> CoachState | None:
        """Enter rest state.

        Returns:
            Updated state.
        """
        if self._state is None:
            return None

        self._state.session_state = SessionState.RESTING
        self._analyze_node.record_rest()
        return self._state

    def end_rest(self) -> CoachState | None:
        """End rest and resume exercising.

        Returns:
            Updated state.
        """
        if self._state is None:
            return None

        self._state.session_state = SessionState.EXERCISING
        self._state.should_rest = False
        return self._state

    def end_session(self) -> dict:
        """End the current session and get summary.

        Returns:
            Session summary statistics.
        """
        if self._state is None:
            return {}

        self._state.session_state = SessionState.COMPLETED

        summary = {
            "session_id": self._state.session_id,
            "exercise": self._state.current_exercise.name
            if self._state.current_exercise
            else None,
            "average_score": self._state.get_average_score(),
            "total_frames": self._state.total_frames_analyzed,
            "completed_sets": self._state.current_set - 1,
            "completed_reps": (self._state.current_set - 1)
            * (
                self._state.current_exercise.repetitions
                if self._state.current_exercise
                else 0
            )
            + self._state.current_rep
            - 1,
            **self._analyze_node.get_session_stats(),
        }

        # Cleanup
        self._detect_node.close()
        self._state = None

        return summary

    def get_state(self) -> CoachState | None:
        """Get current workflow state.

        Returns:
            Current state or None if no active session.
        """
        return self._state

    async def get_speech_audio(self) -> bytes | None:
        """Get audio for pending feedback.

        Returns:
            Audio bytes or None.
        """
        if self._state is None or self._state.pending_feedback is None:
            return None

        return await self._feedback_node.synthesize_speech(self._state.pending_feedback)


def create_workflow(use_llm: bool = True) -> CoachWorkflow:
    """Factory function to create a CoachWorkflow.

    Args:
        use_llm: Whether to use LLM for feedback.

    Returns:
        CoachWorkflow instance.
    """
    return CoachWorkflow(use_llm=use_llm)
