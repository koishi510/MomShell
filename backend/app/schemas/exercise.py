"""Exercise-related Pydantic schemas."""

from enum import Enum

from pydantic import BaseModel, Field


class ExerciseCategory(str, Enum):
    """Categories of postpartum recovery exercises."""

    BREATHING = "breathing"
    PELVIC_FLOOR = "pelvic_floor"
    DIASTASIS_RECTI = "diastasis_recti"
    POSTURE = "posture"
    STRENGTH = "strength"


class Difficulty(str, Enum):
    """Exercise difficulty levels."""

    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class ExercisePhase(str, Enum):
    """Phases within an exercise."""

    PREPARATION = "preparation"
    INHALE = "inhale"
    EXHALE = "exhale"
    HOLD = "hold"
    RELEASE = "release"
    REST = "rest"


class AngleRequirement(BaseModel):
    """Angle requirement for a joint during an exercise phase."""

    joint_name: str = Field(..., description="Name of the joint angle")
    min_angle: float = Field(..., description="Minimum acceptable angle")
    max_angle: float = Field(..., description="Maximum acceptable angle")
    ideal_angle: float = Field(..., description="Ideal target angle")


class PhaseRequirement(BaseModel):
    """Requirements for a single phase of an exercise."""

    phase: ExercisePhase
    duration_seconds: float = Field(..., ge=0, description="Duration of this phase")
    angles: list[AngleRequirement] = Field(
        default_factory=list, description="Angle requirements for this phase"
    )
    description: str = Field(..., description="Description of what to do in this phase")
    cues: list[str] = Field(
        default_factory=list, description="Verbal cues for this phase"
    )


class Exercise(BaseModel):
    """Complete exercise definition."""

    id: str = Field(..., description="Unique exercise identifier")
    name: str = Field(..., description="Exercise name in Chinese")
    name_en: str = Field(..., description="Exercise name in English")
    category: ExerciseCategory
    difficulty: Difficulty
    description: str = Field(..., description="Exercise description")
    benefits: list[str] = Field(default_factory=list, description="Health benefits")
    contraindications: list[str] = Field(
        default_factory=list, description="When NOT to do this exercise"
    )
    phases: list[PhaseRequirement] = Field(
        default_factory=list, description="Exercise phases"
    )
    repetitions: int = Field(default=10, ge=1, description="Recommended repetitions")
    sets: int = Field(default=3, ge=1, description="Recommended sets")
    rest_between_sets: int = Field(
        default=30, ge=0, description="Rest time between sets in seconds"
    )
    video_url: str | None = Field(default=None, description="Demo video URL")
    thumbnail_url: str | None = Field(default=None, description="Thumbnail image URL")


class ExerciseSession(BaseModel):
    """A training session containing multiple exercises."""

    id: str
    name: str
    description: str
    exercises: list[str] = Field(
        default_factory=list, description="List of exercise IDs"
    )
    total_duration_minutes: int = Field(default=15, description="Estimated duration")
    focus_areas: list[ExerciseCategory] = Field(
        default_factory=list, description="Target areas"
    )
