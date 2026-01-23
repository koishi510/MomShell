"""Analysis node for the workflow."""

from app.services.rehab.analysis.posture import PostureAnalyzer
from app.services.rehab.analysis.safety import SafetyMonitor
from app.services.rehab.workflow.state import CoachState, SessionState


class AnalyzeNode:
    """Node that analyzes pose data against exercise requirements."""

    def __init__(self) -> None:
        """Initialize the analysis node."""
        self._posture_analyzer = PostureAnalyzer()
        self._safety_monitor = SafetyMonitor()

    async def __call__(self, state: CoachState) -> CoachState:
        """Analyze current pose and update state.

        Args:
            state: Current workflow state.

        Returns:
            Updated state with analysis results.
        """
        # Skip if not exercising or no pose data
        if state.session_state != SessionState.EXERCISING:
            return state

        if state.current_pose is None or state.current_exercise is None:
            return state

        current_phase = state.get_current_phase()
        if current_phase is None:
            return state

        # Perform posture analysis
        analysis = self._posture_analyzer.analyze(
            pose=state.current_pose,
            exercise=state.current_exercise,
            current_phase=current_phase,
        )
        state.analysis_result = analysis

        # Perform safety check
        safety_status = self._safety_monitor.check(
            pose=state.current_pose,
            analysis=analysis,
        )
        state.safety_alerts = safety_status.alerts
        state.should_rest = safety_status.should_rest

        # Track scores for rep completion
        if analysis.score > 0:
            state.rep_scores.append(analysis.score)

        return state

    def start_session(self) -> None:
        """Initialize monitors for a new session."""
        self._safety_monitor.start_session()

    def record_rest(self) -> None:
        """Record that user took a rest."""
        self._safety_monitor.record_rest()

    def get_session_stats(self) -> dict:
        """Get session statistics from safety monitor."""
        return self._safety_monitor.get_session_stats()


def create_analyze_node() -> AnalyzeNode:
    """Factory function for AnalyzeNode."""
    return AnalyzeNode()
