"""Posture analysis module for exercise form evaluation."""

from app.recovery_coach.pose.keypoints import (
    calculate_angle,
    get_hip_angle,
    get_knee_angle,
    get_pelvic_tilt,
    get_spine_alignment,
    is_lying_down,
)
from app.schemas.exercise import AngleRequirement, Exercise, PhaseRequirement
from app.schemas.pose import Keypoint, PoseAnalysisResult, PoseData


class PostureAnalyzer:
    """Analyzes pose data against exercise requirements."""

    def __init__(self, tolerance: float = 15.0) -> None:
        """Initialize the analyzer.

        Args:
            tolerance: Tolerance in degrees for angle comparisons.
        """
        self.tolerance = tolerance

    def analyze(
        self,
        pose: PoseData,
        exercise: Exercise,
        current_phase: PhaseRequirement,
    ) -> PoseAnalysisResult:
        """Analyze a pose against the current exercise phase requirements.

        Args:
            pose: Current pose data.
            exercise: The exercise being performed.
            current_phase: The current phase of the exercise.

        Returns:
            Analysis result with score and feedback.
        """
        if not pose.is_valid:
            return PoseAnalysisResult(
                is_correct=False,
                score=0.0,
                deviations=["无法检测到完整的身体姿态，请调整摄像头角度"],
                suggestions=["请确保全身在画面中可见"],
                angles={},
            )

        deviations: list[str] = []
        suggestions: list[str] = []
        angles: dict[str, float] = {}

        # Check angle requirements
        for angle_req in current_phase.angles:
            measured = self._measure_angle(pose, angle_req.joint_name)
            if measured is not None:
                angles[angle_req.joint_name] = measured
                deviation = self._check_angle_deviation(measured, angle_req)
                if deviation:
                    deviations.append(deviation["message"])
                    if deviation.get("suggestion"):
                        suggestions.append(deviation["suggestion"])

        # Add standard posture checks
        posture_issues = self._check_general_posture(pose, exercise)
        deviations.extend(posture_issues["deviations"])
        suggestions.extend(posture_issues["suggestions"])

        # Calculate score
        score = self._calculate_score(
            len(deviations),
            len(current_phase.angles) + 2,  # angle checks + general posture checks
        )

        return PoseAnalysisResult(
            is_correct=len(deviations) == 0,
            score=score,
            deviations=deviations,
            suggestions=suggestions,
            angles=angles,
        )

    def _measure_angle(self, pose: PoseData, joint_name: str) -> float | None:
        """Measure a specific joint angle from pose data.

        Args:
            pose: Pose data.
            joint_name: Name of the joint angle to measure.

        Returns:
            Angle in degrees or None if not measurable.
        """
        match joint_name:
            case "knee" | "left_knee":
                return get_knee_angle(pose, "left")
            case "right_knee":
                return get_knee_angle(pose, "right")
            case "hip" | "left_hip":
                return get_hip_angle(pose, "left")
            case "right_hip":
                return get_hip_angle(pose, "right")
            case "spine":
                return get_spine_alignment(pose)
            case "pelvic_tilt":
                return get_pelvic_tilt(pose)
            case "shoulder" | "left_shoulder":
                # Shoulder angle: elbow-shoulder-hip
                elbow = pose.get_keypoint(Keypoint.LEFT_ELBOW)
                shoulder = pose.get_keypoint(Keypoint.LEFT_SHOULDER)
                hip = pose.get_keypoint(Keypoint.LEFT_HIP)
                if elbow and shoulder and hip:
                    return calculate_angle(elbow, shoulder, hip)
            case "right_shoulder":
                elbow = pose.get_keypoint(Keypoint.RIGHT_ELBOW)
                shoulder = pose.get_keypoint(Keypoint.RIGHT_SHOULDER)
                hip = pose.get_keypoint(Keypoint.RIGHT_HIP)
                if elbow and shoulder and hip:
                    return calculate_angle(elbow, shoulder, hip)
            case "hip_abduction":
                # For side-lying leg lift
                hip = pose.get_keypoint(Keypoint.LEFT_HIP)
                knee = pose.get_keypoint(Keypoint.LEFT_KNEE)
                other_hip = pose.get_keypoint(Keypoint.RIGHT_HIP)
                if hip and knee and other_hip:
                    return calculate_angle(other_hip, hip, knee)
        return None

    def _check_angle_deviation(
        self,
        measured: float,
        requirement: AngleRequirement,
    ) -> dict[str, str] | None:
        """Check if measured angle deviates from requirement.

        Returns:
            Dict with deviation message and suggestion, or None if within tolerance.
        """
        if measured < requirement.min_angle - self.tolerance:
            return {
                "message": f"{requirement.joint_name}角度过小（{measured:.0f}°，应大于{requirement.min_angle:.0f}°）",
                "suggestion": f"试着增大{requirement.joint_name}的角度",
            }
        elif measured > requirement.max_angle + self.tolerance:
            return {
                "message": f"{requirement.joint_name}角度过大（{measured:.0f}°，应小于{requirement.max_angle:.0f}°）",
                "suggestion": f"试着减小{requirement.joint_name}的角度",
            }
        return None

    def _check_general_posture(
        self,
        pose: PoseData,
        exercise: Exercise,
    ) -> dict[str, list[str]]:
        """Check general posture issues applicable to most exercises.

        Returns:
            Dict with lists of deviations and suggestions.
        """
        deviations: list[str] = []
        suggestions: list[str] = []

        # Check spine alignment for standing/sitting exercises
        if not is_lying_down(pose):
            spine_angle = get_spine_alignment(pose)
            if spine_angle > 15:
                deviations.append(f"脊柱侧倾（{spine_angle:.0f}°）")
                suggestions.append("试着保持脊柱直立，不要向一侧倾斜")

        # Check for excessive pelvic tilt (for relevant exercises)
        if exercise.category.value in ["diastasis_recti", "pelvic_floor"]:
            pelvic_tilt = get_pelvic_tilt(pose)
            if abs(pelvic_tilt) > 20:
                deviations.append("骨盆倾斜角度过大")
                suggestions.append("注意保持骨盆稳定")

        return {"deviations": deviations, "suggestions": suggestions}

    def _calculate_score(self, deviation_count: int, total_checks: int) -> float:
        """Calculate a score based on the number of deviations.

        Args:
            deviation_count: Number of detected deviations.
            total_checks: Total number of checks performed.

        Returns:
            Score from 0 to 100.
        """
        if total_checks == 0:
            return 100.0

        # Each deviation reduces score proportionally
        base_score = 100.0
        penalty_per_deviation = 100.0 / max(total_checks, 1)
        score = base_score - (deviation_count * penalty_per_deviation)
        return max(0.0, min(100.0, score))


def create_analyzer(tolerance: float = 15.0) -> PostureAnalyzer:
    """Factory function to create a PostureAnalyzer."""
    return PostureAnalyzer(tolerance=tolerance)
