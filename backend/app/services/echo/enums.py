"""Echo Domain enums."""

from enum import Enum


class TagType(str, Enum):
    """Identity tag types for mom's self-reflection."""

    MUSIC = "music"  # 喜欢的音乐类型
    SOUND = "sound"  # 喜欢的自然声音
    LITERATURE = "literature"  # 喜欢的文学/书籍类型
    MEMORY = "memory"  # 青春记忆关键词


class AudioType(str, Enum):
    """Audio resource types."""

    NATURE = "nature"  # 自然声音
    AMBIENT = "ambient"  # 环境音
    MUSIC = "music"  # 背景音乐
    GUIDED = "guided"  # 引导冥想


class MeditationPhase(str, Enum):
    """Meditation session phases."""

    INHALE = "inhale"  # 吸气 (4s)
    HOLD = "hold"  # 屏息 (4s)
    EXHALE = "exhale"  # 呼气 (6s)


class SceneCategory(str, Enum):
    """Scene categories for matching."""

    NATURE = "nature"  # 自然风景
    COZY = "cozy"  # 温馨室内
    ABSTRACT = "abstract"  # 抽象艺术
    VINTAGE = "vintage"  # 复古怀旧
    OCEAN = "ocean"  # 海洋主题


# Breathing rhythm configuration (in seconds)
BREATHING_RHYTHM = {
    MeditationPhase.INHALE: 4,
    MeditationPhase.HOLD: 4,
    MeditationPhase.EXHALE: 6,
}

# Total cycle duration
BREATHING_CYCLE_SECONDS = sum(BREATHING_RHYTHM.values())  # 14 seconds

# Default meditation durations (in minutes)
DEFAULT_MEDITATION_DURATIONS = [5, 10, 15, 20, 30]


# ============================================================
# Shell UI Enums
# ============================================================


class ShellState(str, Enum):
    """Shell (贝壳) states for visual representation."""

    DUSTY = "dusty"  # 灰尘覆盖 - 未探索的记忆
    MUDDY = "muddy"  # 泥泞状态 - 待完成的任务
    CLEAN = "clean"  # 洁白贝壳 - 已完成/已探索
    GOLDEN = "golden"  # 金色贝壳 - 来自伴侣的特殊记忆/心愿


class WishStatus(str, Enum):
    """Wish bottle status."""

    PENDING = "pending"  # 等待中
    ACCEPTED = "accepted"  # 已接住
    FULFILLED = "fulfilled"  # 已实现


class StickerType(str, Enum):
    """Memory sticker types."""

    MEMORY = "memory"  # 记忆贴纸
    WISH = "wish"  # 心愿贴纸
    INJECTED = "injected"  # 注入的记忆
