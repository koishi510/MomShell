"""Progress tracking and metrics management."""

from datetime import datetime

from app.schemas.progress import (
    Achievement,
    ExerciseProgress,
    SessionRecord,
    StrengthMetric,
    UserProgress,
)
from app.services.rehab.progress.achievements import (
    create_achievement_system,
)


class ProgressTracker:
    """Tracks user progress and manages metrics."""

    def __init__(self) -> None:
        """Initialize the progress tracker."""
        self._achievement_system = create_achievement_system()
        self._progress_cache: dict[str, UserProgress] = {}

    def get_or_create_progress(self, user_id: str) -> UserProgress:
        """Get or create progress for a user.

        Args:
            user_id: User identifier.

        Returns:
            User's progress data.
        """
        if user_id not in self._progress_cache:
            # In production, this would load from database
            self._progress_cache[user_id] = UserProgress(
                user_id=user_id,
                strength_metrics=self._create_default_metrics(),
                achievements=self._achievement_system.get_all_achievements(),
            )
        return self._progress_cache[user_id]

    def record_session(
        self,
        user_id: str,
        session: SessionRecord,
    ) -> tuple[UserProgress, list[Achievement]]:
        """Record a completed session and update progress.

        Args:
            user_id: User identifier.
            session: Completed session record.

        Returns:
            Tuple of (updated progress, newly earned achievements).
        """
        progress = self.get_or_create_progress(user_id)

        # Update basic stats
        progress.total_sessions += 1
        progress.total_minutes += session.duration_seconds / 60

        # Update streak
        self._achievement_system.update_streak(progress)

        # Update exercise-specific progress
        ex_progress = progress.exercise_progress.get(
            session.exercise_id,
            ExerciseProgress(exercise_id=session.exercise_id),
        )
        ex_progress.total_sessions += 1
        ex_progress.total_reps += session.completed_reps
        ex_progress.best_score = max(ex_progress.best_score, session.average_score)

        # Update running average
        if ex_progress.total_sessions == 1:
            ex_progress.average_score = session.average_score
        else:
            ex_progress.average_score = (
                ex_progress.average_score * (ex_progress.total_sessions - 1)
                + session.average_score
            ) / ex_progress.total_sessions

        ex_progress.last_performed = datetime.now()
        progress.exercise_progress[session.exercise_id] = ex_progress

        # Update strength metrics based on performance
        self._update_strength_metrics(progress, session)

        # Check for new achievements
        new_achievements = self._achievement_system.check_achievements(
            progress, session
        )

        # Mark achievements as earned in progress
        for achievement in new_achievements:
            for prog_achievement in progress.achievements:
                if prog_achievement.type == achievement.type:
                    prog_achievement.is_earned = True
                    prog_achievement.earned_at = achievement.earned_at

        return progress, new_achievements

    def _update_strength_metrics(
        self,
        progress: UserProgress,
        session: SessionRecord,
    ) -> None:
        """Update strength metrics based on session performance.

        Args:
            progress: User progress to update.
            session: Completed session.
        """
        # Simple model: improve metrics based on session score and exercise type
        score_factor = session.average_score / 100

        for metric in progress.strength_metrics:
            # Small improvement per session, scaled by score
            improvement = 0.5 * score_factor

            # Apply improvement with diminishing returns
            current = metric.value
            remaining = metric.target - current
            actual_improvement = improvement * (remaining / metric.target)

            metric.value = min(metric.target, current + actual_improvement)

    def _create_default_metrics(self) -> list[StrengthMetric]:
        """Create default strength metrics for a new user."""
        return [
            StrengthMetric(
                name="core_strength",
                value=10,
                baseline=10,
                target=100,
                unit="%",
            ),
            StrengthMetric(
                name="pelvic_floor",
                value=15,
                baseline=15,
                target=100,
                unit="%",
            ),
            StrengthMetric(
                name="posture",
                value=20,
                baseline=20,
                target=100,
                unit="%",
            ),
            StrengthMetric(
                name="flexibility",
                value=25,
                baseline=25,
                target=100,
                unit="%",
            ),
        ]

    def get_summary(self, user_id: str) -> dict:
        """Get a summary of user progress for display.

        Args:
            user_id: User identifier.

        Returns:
            Summary dict for UI display.
        """
        progress = self.get_or_create_progress(user_id)

        earned_achievements = [a for a in progress.achievements if a.is_earned]

        return {
            "total_sessions": progress.total_sessions,
            "total_minutes": round(progress.total_minutes, 1),
            "current_streak": progress.current_streak,
            "longest_streak": progress.longest_streak,
            "achievements_earned": len(earned_achievements),
            "achievements_total": len(progress.achievements),
            "strength_metrics": {
                m.name: {
                    "value": round(m.value, 1),
                    "progress": round(
                        (m.value - m.baseline) / (m.target - m.baseline) * 100, 1
                    ),
                }
                for m in progress.strength_metrics
            },
        }


def create_progress_tracker() -> ProgressTracker:
    """Factory function to create a ProgressTracker."""
    return ProgressTracker()
