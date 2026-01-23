"""AI-powered feedback generator using LangChain and OpenAI-compatible APIs."""

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI

from app.core.config import get_settings
from app.services.rehab.analysis.safety import SafetyAlert, SafetyAlertLevel
from app.schemas.exercise import Exercise, PhaseRequirement
from app.schemas.feedback import FeedbackMessage, FeedbackType
from app.schemas.pose import PoseAnalysisResult

settings = get_settings()

SYSTEM_PROMPT = """你是一位温柔、专业的产后康复教练。你的任务是为正在做康复训练的妈妈们提供实时语音反馈。

你的反馈应该：
1. 温和鼓励，不批评
2. 简短有力，适合语音播报（不超过20个字）
3. 专业但易懂
4. 关注安全，及时提醒
5. 使用积极正面的表达

示例反馈：
- "做得很好，保持住"
- "试着呼气时收紧小腹"
- "膝盖再弯曲一点点"
- "慢一点，感受肌肉的收缩"
- "太棒了，休息一下吧"

避免：
- "动作不对"
- "错了"
- "不行"
- 过于复杂的解释
- 批评性语言"""


class FeedbackGenerator:
    """Generates appropriate feedback messages based on pose analysis."""

    def __init__(self, use_llm: bool = True) -> None:
        """Initialize the feedback generator.

        Args:
            use_llm: Whether to use LLM for dynamic feedback generation.
        """
        self.use_llm = use_llm and bool(settings.llm_api_key)

        if self.use_llm:
            # Create ChatOpenAI with explicit kwargs to satisfy mypy
            if settings.llm_base_url:
                self.llm = ChatOpenAI(
                    model=settings.llm_model,
                    api_key=settings.llm_api_key,  # type: ignore[arg-type]
                    temperature=0.7,
                    base_url=settings.llm_base_url,
                    model_kwargs={"max_tokens": 100},
                )
            else:
                self.llm = ChatOpenAI(
                    model=settings.llm_model,
                    api_key=settings.llm_api_key,  # type: ignore[arg-type]
                    temperature=0.7,
                    model_kwargs={"max_tokens": 100},
                )
            self.parser = StrOutputParser()

        # Pre-defined feedback templates for fallback
        self._templates = {
            "good_form": [
                "做得很好，保持住",
                "非常棒，继续保持",
                "动作很标准",
                "很好，就是这样",
            ],
            "minor_correction": [
                "稍微调整一下",
                "再试一次，你可以的",
                "慢一点，感受动作",
            ],
            "encouragement": [
                "你做得很好",
                "继续加油",
                "坚持住",
                "你很棒",
            ],
            "rest": [
                "休息一下吧",
                "喝点水，放松一下",
                "做得很好，稍作休息",
            ],
        }
        self._template_index: dict[str, int] = {}

    async def generate(
        self,
        analysis: PoseAnalysisResult,
        exercise: Exercise,
        phase: PhaseRequirement,
        safety_alerts: list[SafetyAlert] | None = None,
    ) -> FeedbackMessage:
        """Generate feedback based on current analysis.

        Args:
            analysis: Current pose analysis result.
            exercise: The exercise being performed.
            phase: Current exercise phase.
            safety_alerts: Any active safety alerts.

        Returns:
            FeedbackMessage to display/speak.
        """
        # Handle safety alerts first (highest priority)
        if safety_alerts:
            critical = [
                a for a in safety_alerts if a.level == SafetyAlertLevel.CRITICAL
            ]
            if critical:
                return FeedbackMessage(
                    type=FeedbackType.SAFETY_WARNING,
                    text=critical[0].recommendation,
                    priority=5,
                    should_speak=True,
                )

            warnings = [a for a in safety_alerts if a.level == SafetyAlertLevel.WARNING]
            if warnings:
                return FeedbackMessage(
                    type=FeedbackType.REST_PROMPT,
                    text=warnings[0].recommendation,
                    priority=4,
                    should_speak=True,
                )

        # Good form feedback
        if analysis.is_correct and analysis.score >= 80:
            return await self._generate_encouragement(exercise, phase)

        # Correction needed
        if analysis.deviations:
            return await self._generate_correction(analysis, exercise, phase)

        # Default phase cue
        return self._get_phase_cue(phase)

    async def _generate_encouragement(
        self,
        exercise: Exercise,
        phase: PhaseRequirement,
    ) -> FeedbackMessage:
        """Generate encouragement feedback for good form."""
        if self.use_llm:
            try:
                response = await self._call_llm(
                    f"用户正在做{exercise.name}的{phase.phase.value}阶段，动作非常标准。"
                    f"请生成一句简短的鼓励语（不超过15个字）。"
                )
                return FeedbackMessage(
                    type=FeedbackType.ENCOURAGEMENT,
                    text=response,
                    priority=2,
                    should_speak=True,
                )
            except Exception:
                pass

        # Fallback to template
        return FeedbackMessage(
            type=FeedbackType.ENCOURAGEMENT,
            text=self._get_template("good_form"),
            priority=2,
            should_speak=True,
        )

    async def _generate_correction(
        self,
        analysis: PoseAnalysisResult,
        exercise: Exercise,
        phase: PhaseRequirement,
    ) -> FeedbackMessage:
        """Generate correction feedback for form issues."""
        deviation = analysis.deviations[0] if analysis.deviations else ""
        suggestion = analysis.suggestions[0] if analysis.suggestions else ""

        if self.use_llm and deviation:
            try:
                response = await self._call_llm(
                    f"用户正在做{exercise.name}，检测到问题：{deviation}。"
                    f"建议：{suggestion}。"
                    f"请用温和的语气生成一句简短的纠正提示（不超过20个字），"
                    f"不要说'动作不对'或批评性语言。"
                )
                return FeedbackMessage(
                    type=FeedbackType.CORRECTION,
                    text=response,
                    priority=3,
                    should_speak=True,
                )
            except Exception:
                pass

        # Fallback: use suggestion directly or template
        if suggestion:
            return FeedbackMessage(
                type=FeedbackType.CORRECTION,
                text=suggestion[:25] if len(suggestion) > 25 else suggestion,
                priority=3,
                should_speak=True,
            )

        return FeedbackMessage(
            type=FeedbackType.CORRECTION,
            text=self._get_template("minor_correction"),
            priority=3,
            should_speak=True,
        )

    def _get_phase_cue(self, phase: PhaseRequirement) -> FeedbackMessage:
        """Get a verbal cue for the current phase."""
        if phase.cues:
            cue = phase.cues[0]
            return FeedbackMessage(
                type=FeedbackType.PHASE_CUE,
                text=cue,
                priority=2,
                should_speak=True,
            )

        return FeedbackMessage(
            type=FeedbackType.PHASE_CUE,
            text=phase.description[:25],
            priority=2,
            should_speak=True,
        )

    async def _call_llm(self, prompt: str) -> str:
        """Call the LLM with the given prompt."""
        messages = [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=prompt),
        ]

        chain = self.llm | self.parser
        response = await chain.ainvoke(messages)
        return response.strip()

    def _get_template(self, category: str) -> str:
        """Get next template from a category (round-robin)."""
        templates = self._templates.get(category, self._templates["encouragement"])
        index = self._template_index.get(category, 0)
        template = templates[index % len(templates)]
        self._template_index[category] = index + 1
        return template

    def generate_completion_message(
        self,
        exercise: Exercise,
        average_score: float,
    ) -> FeedbackMessage:
        """Generate a completion message for an exercise."""
        if average_score >= 80:
            text = f"太棒了！{exercise.name}完成得非常好"
        elif average_score >= 60:
            text = f"做得不错！{exercise.name}完成了"
        else:
            text = f"{exercise.name}完成了，继续练习会更好"

        return FeedbackMessage(
            type=FeedbackType.COMPLETION,
            text=text,
            priority=2,
            should_speak=True,
        )


def create_feedback_generator(use_llm: bool = True) -> FeedbackGenerator:
    """Factory function to create a FeedbackGenerator."""
    return FeedbackGenerator(use_llm=use_llm)
