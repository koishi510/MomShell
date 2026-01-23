"""Feedback-related Pydantic schemas."""

from enum import Enum

from pydantic import BaseModel, Field


class FeedbackType(str, Enum):
    """Types of feedback."""

    ENCOURAGEMENT = "encouragement"
    CORRECTION = "correction"
    PHASE_CUE = "phase_cue"
    REST_PROMPT = "rest_prompt"
    COMPLETION = "completion"
    SAFETY_WARNING = "safety_warning"


class FeedbackMessage(BaseModel):
    """A feedback message to be displayed or spoken."""

    type: FeedbackType
    text: str = Field(..., description="The feedback text")
    priority: int = Field(
        default=1, ge=1, le=5, description="Priority 1-5, higher = more important"
    )
    should_speak: bool = Field(
        default=True, description="Whether to speak this message via TTS"
    )


class VisualFeedback(BaseModel):
    """Visual feedback data for overlay rendering."""

    keypoint_colors: dict[int, str] = Field(
        default_factory=dict,
        description="Keypoint index to color mapping (hex)",
    )
    highlight_joints: list[str] = Field(
        default_factory=list, description="Joints to highlight"
    )
    score_display: float = Field(default=0.0, description="Score to display")
    phase_text: str = Field(default="", description="Current phase text")
    countdown: int | None = Field(default=None, description="Countdown seconds if any")
