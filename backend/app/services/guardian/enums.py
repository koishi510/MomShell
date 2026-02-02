"""Guardian module enums."""

from enum import Enum


class BindingStatus(str, Enum):
    """Partner binding status."""

    PENDING = "pending"  # Invitation sent, waiting for acceptance
    ACTIVE = "active"  # Binding active
    UNBOUND = "unbound"  # Previously bound, now unbound


class MoodLevel(str, Enum):
    """Mood level enumeration."""

    VERY_LOW = "very_low"  # 1 - Very low
    LOW = "low"  # 2 - Low
    NEUTRAL = "neutral"  # 3 - Neutral
    GOOD = "good"  # 4 - Good
    GREAT = "great"  # 5 - Great


class HealthCondition(str, Enum):
    """Health condition tags."""

    WOUND_PAIN = "wound_pain"  # 伤口疼痛
    HAIR_LOSS = "hair_loss"  # 脱发期
    INSOMNIA = "insomnia"  # 失眠
    BREAST_PAIN = "breast_pain"  # 涨奶/乳房疼痛
    BACK_PAIN = "back_pain"  # 腰背痛
    FATIGUE = "fatigue"  # 疲惫
    EMOTIONAL = "emotional"  # 情绪波动
    CONSTIPATION = "constipation"  # 便秘
    SWEATING = "sweating"  # 盗汗


class TaskDifficulty(str, Enum):
    """Task difficulty level."""

    EASY = "easy"  # 简易型 - 10分
    MEDIUM = "medium"  # 进阶型 - 30分
    HARD = "hard"  # 挑战型 - 50分


class TaskStatus(str, Enum):
    """Task completion status."""

    AVAILABLE = "available"  # 可选
    COMPLETED = "completed"  # 伴侣已完成
    CONFIRMED = "confirmed"  # 妈妈已确认
    EXPIRED = "expired"  # 已过期


class PartnerLevel(str, Enum):
    """Partner level progression."""

    INTERN = "intern"  # 实习爸爸 (0-99分)
    TRAINEE = "trainee"  # 见习守护者 (100-299分)
    REGULAR = "regular"  # 正式守护者 (300-599分)
    GOLD = "gold"  # 金牌守护者 (600+分)


# Level thresholds
LEVEL_THRESHOLDS = {
    PartnerLevel.INTERN: 0,
    PartnerLevel.TRAINEE: 100,
    PartnerLevel.REGULAR: 300,
    PartnerLevel.GOLD: 600,
}

# Task points by difficulty
TASK_POINTS = {
    TaskDifficulty.EASY: 10,
    TaskDifficulty.MEDIUM: 30,
    TaskDifficulty.HARD: 50,
}
