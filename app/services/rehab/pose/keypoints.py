"""Keypoint calculation utilities."""

import math

from app.schemas.pose import Keypoint, Point3D, PoseData


def calculate_angle(p1: Point3D, p2: Point3D, p3: Point3D) -> float:
    """Calculate the angle at p2 formed by p1-p2-p3.

    Args:
        p1: First point.
        p2: Vertex point (where the angle is measured).
        p3: Third point.

    Returns:
        Angle in degrees (0-180).
    """
    # Create vectors
    v1 = (p1.x - p2.x, p1.y - p2.y, p1.z - p2.z)
    v2 = (p3.x - p2.x, p3.y - p2.y, p3.z - p2.z)

    # Calculate dot product and magnitudes
    dot_product = v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]
    mag1 = math.sqrt(v1[0] ** 2 + v1[1] ** 2 + v1[2] ** 2)
    mag2 = math.sqrt(v2[0] ** 2 + v2[1] ** 2 + v2[2] ** 2)

    if mag1 == 0 or mag2 == 0:
        return 0.0

    # Calculate angle
    cos_angle = max(-1.0, min(1.0, dot_product / (mag1 * mag2)))
    angle = math.degrees(math.acos(cos_angle))

    return angle


def calculate_distance(p1: Point3D, p2: Point3D) -> float:
    """Calculate Euclidean distance between two points.

    Args:
        p1: First point.
        p2: Second point.

    Returns:
        Distance (in normalized coordinates).
    """
    return math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2 + (p1.z - p2.z) ** 2)


def get_spine_alignment(pose: PoseData) -> float:
    """Calculate spine alignment angle.

    Measures the deviation from vertical alignment.

    Returns:
        Angle in degrees from vertical (0 = perfectly vertical).
    """
    left_shoulder = pose.get_keypoint(Keypoint.LEFT_SHOULDER)
    right_shoulder = pose.get_keypoint(Keypoint.RIGHT_SHOULDER)
    left_hip = pose.get_keypoint(Keypoint.LEFT_HIP)
    right_hip = pose.get_keypoint(Keypoint.RIGHT_HIP)

    if not all([left_shoulder, right_shoulder, left_hip, right_hip]):
        return 0.0

    # Type assertions after None check
    assert left_shoulder is not None
    assert right_shoulder is not None
    assert left_hip is not None
    assert right_hip is not None

    # Calculate midpoints
    shoulder_mid_x = (left_shoulder.x + right_shoulder.x) / 2
    shoulder_mid_y = (left_shoulder.y + right_shoulder.y) / 2
    hip_mid_x = (left_hip.x + right_hip.x) / 2
    hip_mid_y = (left_hip.y + right_hip.y) / 2

    # Calculate angle from vertical
    dx = shoulder_mid_x - hip_mid_x
    dy = shoulder_mid_y - hip_mid_y

    if dy == 0:
        return 90.0

    angle = math.degrees(math.atan(abs(dx) / abs(dy)))
    return angle


def get_hip_angle(pose: PoseData, side: str = "left") -> float:
    """Calculate hip flexion angle.

    Args:
        pose: Pose data.
        side: "left" or "right".

    Returns:
        Hip angle in degrees.
    """
    if side == "left":
        shoulder = pose.get_keypoint(Keypoint.LEFT_SHOULDER)
        hip = pose.get_keypoint(Keypoint.LEFT_HIP)
        knee = pose.get_keypoint(Keypoint.LEFT_KNEE)
    else:
        shoulder = pose.get_keypoint(Keypoint.RIGHT_SHOULDER)
        hip = pose.get_keypoint(Keypoint.RIGHT_HIP)
        knee = pose.get_keypoint(Keypoint.RIGHT_KNEE)

    if not all([shoulder, hip, knee]):
        return 0.0

    # Type assertions after None check
    assert shoulder is not None
    assert hip is not None
    assert knee is not None

    return calculate_angle(shoulder, hip, knee)


def get_knee_angle(pose: PoseData, side: str = "left") -> float:
    """Calculate knee flexion angle.

    Args:
        pose: Pose data.
        side: "left" or "right".

    Returns:
        Knee angle in degrees.
    """
    if side == "left":
        hip = pose.get_keypoint(Keypoint.LEFT_HIP)
        knee = pose.get_keypoint(Keypoint.LEFT_KNEE)
        ankle = pose.get_keypoint(Keypoint.LEFT_ANKLE)
    else:
        hip = pose.get_keypoint(Keypoint.RIGHT_HIP)
        knee = pose.get_keypoint(Keypoint.RIGHT_KNEE)
        ankle = pose.get_keypoint(Keypoint.RIGHT_ANKLE)

    if not all([hip, knee, ankle]):
        return 0.0

    # Type assertions after None check
    assert hip is not None
    assert knee is not None
    assert ankle is not None

    return calculate_angle(hip, knee, ankle)


def get_shoulder_angle(pose: PoseData, side: str = "left") -> float:
    """Calculate shoulder abduction angle.

    Args:
        pose: Pose data.
        side: "left" or "right".

    Returns:
        Shoulder angle in degrees.
    """
    if side == "left":
        hip = pose.get_keypoint(Keypoint.LEFT_HIP)
        shoulder = pose.get_keypoint(Keypoint.LEFT_SHOULDER)
        elbow = pose.get_keypoint(Keypoint.LEFT_ELBOW)
    else:
        hip = pose.get_keypoint(Keypoint.RIGHT_HIP)
        shoulder = pose.get_keypoint(Keypoint.RIGHT_SHOULDER)
        elbow = pose.get_keypoint(Keypoint.RIGHT_ELBOW)

    if not all([hip, shoulder, elbow]):
        return 0.0

    # Type assertions after None check
    assert hip is not None
    assert shoulder is not None
    assert elbow is not None

    return calculate_angle(hip, shoulder, elbow)


def get_pelvic_tilt(pose: PoseData) -> float:
    """Calculate pelvic tilt angle.

    Positive = anterior tilt, Negative = posterior tilt.

    Returns:
        Pelvic tilt angle in degrees.
    """
    left_hip = pose.get_keypoint(Keypoint.LEFT_HIP)
    right_hip = pose.get_keypoint(Keypoint.RIGHT_HIP)

    if not all([left_hip, right_hip]):
        return 0.0

    # Type assertions after None check
    assert left_hip is not None
    assert right_hip is not None

    # Calculate the angle of the hip line from horizontal
    dx = right_hip.x - left_hip.x
    dy = right_hip.y - left_hip.y

    if dx == 0:
        return 0.0

    angle = math.degrees(math.atan(dy / dx))
    return angle


def is_lying_down(pose: PoseData) -> bool:
    """Detect if the person is lying down.

    Returns:
        True if person appears to be lying down.
    """
    left_shoulder = pose.get_keypoint(Keypoint.LEFT_SHOULDER)
    left_hip = pose.get_keypoint(Keypoint.LEFT_HIP)

    if not all([left_shoulder, left_hip]):
        return False

    # Type assertions after None check
    assert left_shoulder is not None
    assert left_hip is not None

    # If shoulder and hip are at similar heights, likely lying down
    vertical_diff = abs(left_shoulder.y - left_hip.y)
    return bool(vertical_diff < 0.15)


def get_body_symmetry(pose: PoseData) -> float:
    """Calculate body symmetry score.

    Returns:
        Symmetry score 0-1 (1 = perfectly symmetric).
    """
    pairs = [
        (Keypoint.LEFT_SHOULDER, Keypoint.RIGHT_SHOULDER),
        (Keypoint.LEFT_HIP, Keypoint.RIGHT_HIP),
        (Keypoint.LEFT_KNEE, Keypoint.RIGHT_KNEE),
        (Keypoint.LEFT_ANKLE, Keypoint.RIGHT_ANKLE),
    ]

    total_diff = 0.0
    valid_pairs = 0

    for left_kp, right_kp in pairs:
        left = pose.get_keypoint(left_kp)
        right = pose.get_keypoint(right_kp)

        if left and right and left.visibility > 0.5 and right.visibility > 0.5:
            # Check if y-coordinates are similar (symmetric)
            y_diff = abs(left.y - right.y)
            total_diff += y_diff
            valid_pairs += 1

    if valid_pairs == 0:
        return 1.0

    avg_diff = total_diff / valid_pairs
    # Convert to score (smaller diff = higher score)
    symmetry = max(0.0, 1.0 - avg_diff * 5)
    return symmetry
