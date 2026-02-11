"""Beach module enums for Shell Beach system."""

from enum import Enum


class UserIdentity(str, Enum):
    """User identity enumeration (permanent, one-time selection)."""

    ORIGIN_SEEKER = "origin_seeker"  # 溯源者 (Mom mode)
    GUARDIAN = "guardian"  # 守护者 (Dad mode)


class ShellType(str, Enum):
    """Shell type enumeration."""

    MEMORY = "memory"  # Memory shell (mom creates)
    TASK = "task"  # Task shell (system assigns to dad)
    WISH = "wish"  # Wish shell (from completed drift bottle)
    GIFT = "gift"  # Gift shell (from dad's memory injection)


class ShellStatus(str, Enum):
    """Shell status enumeration."""

    DUSTY = "dusty"  # Initial state - covered in dust/mud
    OPENED = "opened"  # Shell has been opened (memory recorded)
    COMPLETED = "completed"  # Task completed / sticker generated


class BottleStatus(str, Enum):
    """Drift bottle status enumeration."""

    DRIFTING = "drifting"  # Floating in the sea
    CAUGHT = "caught"  # Dad has caught the bottle
    COMPLETED = "completed"  # Wish has been fulfilled


class MemoryInjectionStatus(str, Enum):
    """Memory injection status enumeration."""

    PENDING = "pending"  # Not yet seen by mom
    SEEN = "seen"  # Mom has seen it
    CONVERTED = "converted"  # Converted to a golden shell


# Memory tag categories (for memory sand selection)
MEMORY_TAGS = [
    "运动会最后一棒",
    "旧磁带",
    "风铃",
    "音乐会",
    "第一次出国",
    "摇滚乐",
    "毕业典礼",
    "初恋",
    "青春旅行",
    "老照片",
]

# Task categories (for dad's tasks)
TASK_CATEGORIES = [
    "baby_care",  # 照顾宝宝
    "housework",  # 家务
    "emotional_support",  # 情感支持
    "self_care",  # 自我照顾
]
