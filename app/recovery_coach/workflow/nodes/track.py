"""Progress tracking node for the workflow."""

import time

from app.recovery_coach.workflow.state import CoachState, SessionState


class TrackNode:
    """Node that tracks exercise progress and phase timing."""

    def __init__(self) -> None:
        """Initialize the tracking node."""
        self._phase_start_time: float = 0
        self._last_phase_index: int = -1
        self._last_rep: int = 0
        self._last_set: int = 0

    async def __call__(self, state: CoachState) -> CoachState:
        """Track progress and manage phase transitions.

        Args:
            state: Current workflow state.

        Returns:
            Updated state with progress tracking.
        """
        if state.session_state != SessionState.EXERCISING:
            return state

        if state.current_exercise is None:
            return state

        current_time = time.time()

        # Initialize phase timing if new phase
        if state.current_phase_index != self._last_phase_index:
            self._phase_start_time = current_time
            state.phase_start_time = current_time
            self._last_phase_index = state.current_phase_index

        # Check if current phase should end (based on time)
        current_phase = state.get_current_phase()
        if current_phase is not None:
            phase_elapsed = current_time - self._phase_start_time
            if phase_elapsed >= current_phase.duration_seconds:
                # Phase complete, advance
                state.advance_phase()
                self._phase_start_time = current_time
                state.phase_start_time = current_time

        # Track rep/set changes
        if state.current_rep != self._last_rep or state.current_set != self._last_set:
            self._last_rep = state.current_rep
            self._last_set = state.current_set
            # Could emit events here for UI updates

        return state

    def get_phase_remaining_time(self, state: CoachState) -> float:
        """Get remaining time in current phase.

        Args:
            state: Current state.

        Returns:
            Remaining seconds in current phase.
        """
        current_phase = state.get_current_phase()
        if current_phase is None:
            return 0.0

        elapsed = time.time() - self._phase_start_time
        remaining = current_phase.duration_seconds - elapsed
        return max(0.0, remaining)

    def reset(self) -> None:
        """Reset tracking state."""
        self._phase_start_time = 0
        self._last_phase_index = -1
        self._last_rep = 0
        self._last_set = 0


def create_track_node() -> TrackNode:
    """Factory function for TrackNode."""
    return TrackNode()
