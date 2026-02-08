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
