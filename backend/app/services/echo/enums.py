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


# ============================================================
# Dad Mode 2.0 Enums
# ============================================================


class ShellStatus(str, Enum):
    """Status of a task shell on dad's beach."""

    MUDDY = "muddy"  # 泥泞状态，等待洗涤
    WASHING = "washing"  # 洗涤中
    WASHED = "washed"  # 已洗净
    OPENED = "opened"  # 已打开，贴纸已揭示
    ARCHIVED = "archived"  # 已归档到"记"


class ShellType(str, Enum):
    """Type of shell."""

    NORMAL = "normal"  # 普通贝壳（任务）
    GOLDEN_CONCH = "golden_conch"  # 金色海螺（心愿转化）
    MEMORY = "memory"  # 记忆贝壳（爸爸创建）


class WishType(str, Enum):
    """Type of wish bottle."""

    HELP_REQUEST = "help_request"  # 求助心愿
    GRATITUDE = "gratitude"  # 感恩心愿
    SURPRISE = "surprise"  # 惊喜心愿
    QUALITY_TIME = "quality_time"  # 陪伴心愿


class WishStatus(str, Enum):
    """Status of a wish bottle."""

    DRIFTING = "drifting"  # 漂流中
    CAUGHT = "caught"  # 已被爸爸接住
    IN_PROGRESS = "in_progress"  # 进行中
    GRANTED = "granted"  # 已完成
    EXPIRED = "expired"  # 已过期


class MemoryStatus(str, Enum):
    """Status of a memory shell."""

    GENERATING = "generating"  # AI贴纸生成中
    READY = "ready"  # 已就绪，等待妈妈打开
    OPENED = "opened"  # 妈妈已打开
    FAVORITED = "favorited"  # 已收藏


class StickerStyle(str, Enum):
    """AI sticker generation style."""

    WATERCOLOR = "watercolor"  # 水彩风格
    SKETCH = "sketch"  # 素描风格
    PIXEL = "pixel"  # 像素风格


class NotificationType(str, Enum):
    """Type of notification."""

    WISH_NEW = "wish_new"  # 新心愿
    WISH_GRANTED = "wish_granted"  # 心愿已完成
    MEMORY_OPENED = "memory_opened"  # 记忆已打开
    TASK_REMINDER = "task_reminder"  # 任务提醒
    COMMUNITY_LIKE = "community_like"  # 社区点赞
    SHELL_WASHED = "shell_washed"  # 贝壳已洗净
    MEMORY_READY = "memory_ready"  # 记忆贴纸已生成


class MemoirStatus(str, Enum):
    """Status of AI-generated memoir."""

    GENERATING = "generating"  # 生成中
    COMPLETED = "completed"  # 完成
    FAILED = "failed"  # 失败


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
