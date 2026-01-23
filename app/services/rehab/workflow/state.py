"""State definitions for the coach workflow."""

from enum import Enum

from pydantic import BaseModel, Field

from app.services.rehab.analysis.safety import SafetyAlert
from app.schemas.exercise import Exercise, PhaseRequirement
from app.schemas.feedback import FeedbackMessage
from app.schemas.pose import PoseAnalysisResult, PoseData


class SessionState(str, Enum):
    """States of a coaching session."""

    IDLE = "idle"
    PREPARING = "preparing"
    EXERCISING = "exercising"
    RESTING = "resting"
    COMPLETED = "completed"
    PAUSED = "paused"


class CoachState(BaseModel):
    """State for the LangGraph coaching workflow.

    This represents the complete state of an exercise coaching session,
    passed between nodes in the workflow graph.
    """

    # Session info
    session_id: str = Field(default="", description="Unique session identifier")
    session_state: SessionState = Field(default=SessionState.IDLE)

    # Current exercise context
    current_exercise: Exercise | None = Field(default=None)
    current_phase_index: int = Field(default=0)
    current_set: int = Field(default=1)
    current_rep: int = Field(default=1)
    phase_start_time: float = Field(default=0.0)

    # Pose data
    current_pose: PoseData | None = Field(default=None)
    pose_history: list[PoseData] = Field(default_factory=list)

    # Analysis results
    analysis_result: PoseAnalysisResult | None = Field(default=None)
    safety_alerts: list[SafetyAlert] = Field(default_factory=list)

    # Feedback
    pending_feedback: FeedbackMessage | None = Field(default=None)
    feedback_history: list[FeedbackMessage] = Field(default_factory=list)

    # Metrics
    rep_scores: list[float] = Field(default_factory=list)
    total_frames_analyzed: int = Field(default=0)

    # Control flags
    should_speak: bool = Field(default=False)
    should_rest: bool = Field(default=False)
    is_paused: bool = Field(default=False)

    # Error handling
    error_message: str | None = Field(default=None)

    def get_current_phase(self) -> PhaseRequirement | None:
        """Get the current exercise phase."""
        if not self.current_exercise:
            return None
        if self.current_phase_index >= len(self.current_exercise.phases):
            return None
        return self.current_exercise.phases[self.current_phase_index]

    def advance_phase(self) -> bool:
        """Advance to the next phase.

        Returns:
            True if advanced, False if no more phases.
        """
        if not self.current_exercise:
            return False

        self.current_phase_index += 1
        if self.current_phase_index >= len(self.current_exercise.phases):
            # Completed all phases, advance rep
            self.current_phase_index = 0
            return self.advance_rep()
        return True

    def advance_rep(self) -> bool:
        """Advance to the next rep.

        Returns:
            True if advanced, False if no more reps.
        """
        if not self.current_exercise:
            return False

        self.current_rep += 1
        if self.current_rep > self.current_exercise.repetitions:
            # Completed all reps, advance set
            self.current_rep = 1
            return self.advance_set()
        return True

    def advance_set(self) -> bool:
        """Advance to the next set.

        Returns:
            True if advanced, False if no more sets.
        """
        if not self.current_exercise:
            return False

        self.current_set += 1
        if self.current_set > self.current_exercise.sets:
            # Completed all sets
            self.session_state = SessionState.COMPLETED
            return False
        return True

    def get_progress(self) -> dict:
        """Get current progress information."""
        if not self.current_exercise:
            return {"progress": 0.0}

        total_reps = self.current_exercise.repetitions * self.current_exercise.sets
        completed_reps = (
            (self.current_set - 1) * self.current_exercise.repetitions
            + self.current_rep
            - 1
        )
        progress = completed_reps / total_reps if total_reps > 0 else 0.0

        current_phase = self.get_current_phase()
        return {
            "progress": progress * 100,
            "current_set": self.current_set,
            "total_sets": self.current_exercise.sets,
            "current_rep": self.current_rep,
            "total_reps": self.current_exercise.repetitions,
            "current_phase": current_phase.phase.value if current_phase else None,
        }

    def get_average_score(self) -> float:
        """Get average score for the session."""
        if not self.rep_scores:
            return 0.0
        return sum(self.rep_scores) / len(self.rep_scores)
