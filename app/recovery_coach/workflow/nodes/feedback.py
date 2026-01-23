"""Feedback generation node for the workflow."""

from app.recovery_coach.feedback.generator import FeedbackGenerator
from app.recovery_coach.feedback.tts import TTSEngine, TTSQueue
from app.recovery_coach.workflow.state import CoachState, SessionState
from app.schemas.feedback import FeedbackMessage, FeedbackType


class FeedbackNode:
    """Node that generates and manages feedback."""

    def __init__(self, use_llm: bool = True) -> None:
        """Initialize the feedback node.

        Args:
            use_llm: Whether to use LLM for dynamic feedback.
        """
        self._generator = FeedbackGenerator(use_llm=use_llm)
        self._tts_engine = TTSEngine()
        self._tts_queue = TTSQueue(self._tts_engine)
        self._last_feedback_time: float = 0
        self._min_feedback_interval: float = (
            6.0  # 6 seconds between feedback for performance
        )

    async def __call__(self, state: CoachState) -> CoachState:
        """Generate feedback based on current state.

        Args:
            state: Current workflow state.

        Returns:
            Updated state with feedback.
        """
        import time

        current_time = time.time()

        # Rate limit feedback
        if current_time - self._last_feedback_time < self._min_feedback_interval:
            return state

        # Skip if not exercising
        if state.session_state != SessionState.EXERCISING:
            return state

        if state.current_exercise is None or state.analysis_result is None:
            return state

        current_phase = state.get_current_phase()
        if current_phase is None:
            return state

        # Generate feedback
        feedback = await self._generator.generate(
            analysis=state.analysis_result,
            exercise=state.current_exercise,
            phase=current_phase,
            safety_alerts=state.safety_alerts if state.safety_alerts else None,
        )

        state.pending_feedback = feedback
        state.should_speak = feedback.should_speak

        # Add to history
        state.feedback_history.append(feedback)
        if len(state.feedback_history) > 50:
            state.feedback_history = state.feedback_history[-50:]

        self._last_feedback_time = current_time

        return state

    async def synthesize_speech(self, feedback: FeedbackMessage) -> bytes | None:
        """Synthesize speech for a feedback message.

        Args:
            feedback: Feedback message to speak.

        Returns:
            Audio bytes or None if synthesis failed.
        """
        if not feedback.should_speak:
            return None

        try:
            return await self._tts_engine.synthesize(feedback.text)
        except Exception:
            return None

    async def speak(self, text: str, priority: bool = False) -> None:
        """Add text to the speech queue.

        Args:
            text: Text to speak.
            priority: Whether to prioritize this message.
        """
        await self._tts_queue.speak(text, priority=priority)

    def generate_completion_feedback(
        self,
        state: CoachState,
    ) -> FeedbackMessage:
        """Generate completion feedback for an exercise.

        Args:
            state: Current state with exercise info.

        Returns:
            Completion feedback message.
        """
        if state.current_exercise is None:
            return FeedbackMessage(
                type=FeedbackType.COMPLETION,
                text="训练完成",
                priority=2,
                should_speak=True,
            )

        return self._generator.generate_completion_message(
            exercise=state.current_exercise,
            average_score=state.get_average_score(),
        )

    async def start(self) -> None:
        """Start the TTS queue processing."""
        await self._tts_queue.start()

    async def stop(self) -> None:
        """Stop the TTS queue processing."""
        await self._tts_queue.stop()


def create_feedback_node(use_llm: bool = True) -> FeedbackNode:
    """Factory function for FeedbackNode."""
    return FeedbackNode(use_llm=use_llm)
