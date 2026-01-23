"""Achievement system for gamification."""

from datetime import datetime

from app.schemas.progress import (
    Achievement,
    AchievementType,
    SessionRecord,
    UserProgress,
)

# Pre-defined achievements
ACHIEVEMENT_DEFINITIONS: dict[AchievementType, dict] = {
    AchievementType.FIRST_SESSION: {
        "name": "第一步",
        "description": "完成第一次康复训练",
        "icon": "footprints",
    },
    AchievementType.STREAK_3: {
        "name": "坚持三天",
        "description": "连续三天进行训练",
        "icon": "fire",
    },
    AchievementType.STREAK_7: {
        "name": "一周达人",
        "description": "连续七天进行训练",
        "icon": "calendar-check",
    },
    AchievementType.STREAK_30: {
        "name": "月度冠军",
        "description": "连续三十天进行训练",
        "icon": "trophy",
    },
    AchievementType.PERFECT_FORM: {
        "name": "完美姿态",
        "description": "在一次训练中获得90分以上的平均分",
        "icon": "star",
    },
    AchievementType.COMPLETE_EXERCISE: {
        "name": "动作达人",
        "description": "完成所有组数的单个动作",
        "icon": "check-circle",
    },
    AchievementType.COMPLETE_SESSION: {
        "name": "训练完成",
        "description": "完成一整套训练计划",
        "icon": "medal",
    },
    AchievementType.STRENGTH_MILESTONE: {
        "name": "力量回归",
        "description": "核心力量指标提升至50%",
        "icon": "trending-up",
    },
    AchievementType.CONSISTENCY: {
        "name": "持之以恒",
        "description": "累计完成20次训练",
        "icon": "award",
    },
}


class AchievementSystem:
    """Manages user achievements and badges."""

    def __init__(self) -> None:
        """Initialize the achievement system."""
        self._all_achievements = self._create_achievement_templates()

    def _create_achievement_templates(self) -> list[Achievement]:
        """Create achievement templates from definitions."""
        return [
            Achievement(
                id=f"achievement_{type_.value}",
                type=type_,
                name=info["name"],
                description=info["description"],
                icon=info["icon"],
            )
            for type_, info in ACHIEVEMENT_DEFINITIONS.items()
        ]

    def get_all_achievements(self) -> list[Achievement]:
        """Get all possible achievements."""
        return self._all_achievements.copy()

    def check_achievements(
        self,
        progress: UserProgress,
        session: SessionRecord | None = None,
    ) -> list[Achievement]:
        """Check for newly earned achievements.

        Args:
            progress: Current user progress.
            session: Just-completed session (if any).

        Returns:
            List of newly earned achievements.
        """
        newly_earned: list[Achievement] = []
        earned_types = {a.type for a in progress.achievements if a.is_earned}

        # Check each achievement type
        for achievement in self._all_achievements:
            if achievement.type in earned_types:
                continue

            if self._check_achievement(achievement.type, progress, session):
                achievement.is_earned = True
                achievement.earned_at = datetime.now()
                newly_earned.append(achievement)

        return newly_earned

    def _check_achievement(
        self,
        type_: AchievementType,
        progress: UserProgress,
        session: SessionRecord | None,
    ) -> bool:
        """Check if a specific achievement is earned.

        Args:
            type_: Achievement type to check.
            progress: User progress data.
            session: Just-completed session.

        Returns:
            True if achievement is earned.
        """
        match type_:
            case AchievementType.FIRST_SESSION:
                return progress.total_sessions >= 1

            case AchievementType.STREAK_3:
                return progress.current_streak >= 3

            case AchievementType.STREAK_7:
                return progress.current_streak >= 7

            case AchievementType.STREAK_30:
                return progress.current_streak >= 30

            case AchievementType.PERFECT_FORM:
                if session and session.average_score >= 90:
                    return True
                return False

            case AchievementType.COMPLETE_EXERCISE:
                # Check if any exercise has been fully completed
                for ex_progress in progress.exercise_progress.values():
                    if ex_progress.total_sessions >= 1:
                        return True
                return False

            case AchievementType.COMPLETE_SESSION:
                return progress.total_sessions >= 1

            case AchievementType.STRENGTH_MILESTONE:
                for metric in progress.strength_metrics:
                    if metric.name == "core_strength" and metric.value >= 50:
                        return True
                return False

            case AchievementType.CONSISTENCY:
                return progress.total_sessions >= 20

            case _:
                return False

    def update_streak(self, progress: UserProgress) -> int:
        """Update the user's streak based on last session date.

        Args:
            progress: User progress to update.

        Returns:
            Updated streak count.
        """
        today = datetime.now().date()

        if progress.last_session_date is None:
            # First session
            progress.current_streak = 1
        else:
            last_date = progress.last_session_date.date()
            days_diff = (today - last_date).days

            if days_diff == 0:
                # Same day, no change
                pass
            elif days_diff == 1:
                # Consecutive day
                progress.current_streak += 1
            else:
                # Streak broken
                progress.current_streak = 1

        progress.longest_streak = max(progress.longest_streak, progress.current_streak)
        progress.last_session_date = datetime.now()

        return progress.current_streak


def create_achievement_system() -> AchievementSystem:
    """Factory function to create an AchievementSystem."""
    return AchievementSystem()
