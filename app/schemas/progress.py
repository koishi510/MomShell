"""Progress-related Pydantic schemas."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class AchievementType(str, Enum):
    """Types of achievements/badges."""

    FIRST_SESSION = "first_session"
    STREAK_3 = "streak_3"
    STREAK_7 = "streak_7"
    STREAK_30 = "streak_30"
    PERFECT_FORM = "perfect_form"
    COMPLETE_EXERCISE = "complete_exercise"
    COMPLETE_SESSION = "complete_session"
    STRENGTH_MILESTONE = "strength_milestone"
    CONSISTENCY = "consistency"


class Achievement(BaseModel):
    """User achievement/badge."""

    id: str
    type: AchievementType
    name: str
    description: str
    icon: str = Field(default="star", description="Icon name for display")
    earned_at: datetime | None = Field(default=None)
    is_earned: bool = Field(default=False)


class ExerciseProgress(BaseModel):
    """Progress for a single exercise."""

    exercise_id: str
    total_sessions: int = Field(default=0)
    total_reps: int = Field(default=0)
    average_score: float = Field(default=0.0)
    best_score: float = Field(default=0.0)
    last_performed: datetime | None = Field(default=None)


class StrengthMetric(BaseModel):
    """A strength/recovery metric."""

    name: str
    value: float = Field(ge=0, le=100, description="Progress percentage 0-100")
    baseline: float = Field(default=0, description="Starting value")
    target: float = Field(default=100, description="Target value")
    unit: str = Field(default="%")


class UserProgress(BaseModel):
    """Complete user progress data."""

    user_id: str
    total_sessions: int = Field(default=0)
    total_minutes: float = Field(default=0.0)
    current_streak: int = Field(default=0)
    longest_streak: int = Field(default=0)
    last_session_date: datetime | None = Field(default=None)
    achievements: list[Achievement] = Field(default_factory=list)
    exercise_progress: dict[str, ExerciseProgress] = Field(default_factory=dict)
    strength_metrics: list[StrengthMetric] = Field(default_factory=list)


class SessionRecord(BaseModel):
    """Record of a completed session."""

    session_id: str
    user_id: str
    exercise_id: str
    started_at: datetime
    ended_at: datetime
    duration_seconds: float
    average_score: float
    completed_sets: int
    completed_reps: int
    achievements_earned: list[str] = Field(default_factory=list)
