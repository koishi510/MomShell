"""Feedback generation node for the workflow."""

import asyncio

from app.schemas.feedback import FeedbackMessage, FeedbackType
from app.services.rehab.feedback.generator import FeedbackGenerator
from app.services.rehab.feedback.tts import TTSEngine, TTSQueue
from app.services.rehab.workflow.state import CoachState, SessionState


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
        # Background task for non-blocking feedback generation
        self._pending_generation: asyncio.Task[FeedbackMessage | None] | None = None
        self._pending_feedback_result: FeedbackMessage | None = None

    async def __call__(self, state: CoachState) -> CoachState:
        """Generate feedback based on current state.

        Non-blocking: LLM calls run in background, results delivered on next frame.

        Args:
            state: Current workflow state.

        Returns:
            Updated state with feedback.
        """
        import time

        current_time = time.time()

        # Check if background generation completed
        if self._pending_generation is not None and self._pending_generation.done():
            try:
                self._pending_feedback_result = self._pending_generation.result()
            except Exception as e:
                print(f"[FEEDBACK] Background generation failed: {e}")
                self._pending_feedback_result = None
            self._pending_generation = None

        # Apply pending feedback result if available
        if self._pending_feedback_result is not None:
            state.pending_feedback = self._pending_feedback_result
            state.should_speak = self._pending_feedback_result.should_speak
            state.feedback_history.append(self._pending_feedback_result)
            if len(state.feedback_history) > 50:
                state.feedback_history = state.feedback_history[-50:]
            self._pending_feedback_result = None

        # Rate limit feedback generation
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

        # Skip if already generating
        if self._pending_generation is not None and not self._pending_generation.done():
            return state

        # Start background generation (non-blocking)
        self._last_feedback_time = current_time

        # Capture values for the background task (mypy can't infer they're not None)
        analysis = state.analysis_result
        exercise = state.current_exercise
        phase = current_phase
        safety_alerts = state.safety_alerts if state.safety_alerts else None

        async def generate_in_background() -> FeedbackMessage | None:
            try:
                return await self._generator.generate(
                    analysis=analysis,
                    exercise=exercise,
                    phase=phase,
                    safety_alerts=safety_alerts,
                )
            except Exception as e:
                print(f"[FEEDBACK] Generation error: {e}")
                return None

        self._pending_generation = asyncio.create_task(generate_in_background())

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
