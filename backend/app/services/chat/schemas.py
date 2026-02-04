# app/services/chat/schemas.py
"""
Soulful Companion 情感交互模块的数据模型定义

该模块定义了去对话框化交互形态所需的数据结构：
- 用户输入呈现为水面涟漪
- Agent 回复呈现为阳光变化
"""

from enum import Enum

from pydantic import BaseModel, Field, field_validator


class EffectType(str, Enum):
    """视觉效果类型枚举"""

    RIPPLE = "ripple"  # 涟漪 - 用户输入时的水面波动
    SUNLIGHT = "sunlight"  # 阳光 - 温暖、支持的回复
    CALM = "calm"  # 平静 - 安抚、陪伴的回复
    WARM_GLOW = "warm_glow"  # 暖光 - 认可、鼓励的回复
    GENTLE_WAVE = "gentle_wave"  # 微波 - 轻松、分享的回复


class ColorTone(str, Enum):
    """色彩基调枚举"""

    SOFT_PINK = "soft_pink"  # 柔粉 - 温柔、母性
    WARM_GOLD = "warm_gold"  # 暖金 - 希望、能量
    GENTLE_BLUE = "gentle_blue"  # 柔蓝 - 平静、安抚
    LAVENDER = "lavender"  # 薰衣草 - 放松、疗愈
    NEUTRAL_WHITE = "neutral_white"  # 中性白 - 清晰、支持
    CORAL = "coral"  # 珊瑚色 - 温暖、活力
    SAGE = "sage"  # 鼠尾草绿 - 生长、新生


class VisualMetadata(BaseModel):
    """
    视觉元数据模型

    描述 Agent 回复应呈现的视觉氛围，
    用于前端渲染阳光/水面等去对话框化的交互效果。
    """

    effect_type: EffectType = Field(
        ...,
        description="视觉效果类型，决定前端渲染的动画形态",
    )
    intensity: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="视觉效果的强度，0.0 为最微弱，1.0 为最强烈",
    )
    color_tone: ColorTone = Field(
        ...,
        description="主色调，影响视觉效果的颜色呈现",
    )

    @field_validator("intensity")
    @classmethod
    def validate_intensity(cls, v: float) -> float:
        """确保 intensity 值在有效范围内"""
        if not 0.0 <= v <= 1.0:
            raise ValueError("intensity 必须在 0.0 到 1.0 之间")
        return round(v, 2)


class UserMessage(BaseModel):
    """用户消息模型"""

    content: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="用户输入的文字内容",
    )
    session_id: str | None = Field(
        default=None,
        description="会话标识符，用于关联同一对话会话",
    )


class UserProfile(BaseModel):
    """
    用户画像模型

    存储 Agent 需要记忆的用户个性化信息。
    这些信息会在对话中被自然地引用，增强情感连接。
    """

    preferred_name: str | None = Field(
        default=None,
        description="用户喜欢的称呼方式",
    )
    has_pets: bool = Field(
        default=False,
        description="是否有宠物（猫、狗等）",
    )
    pet_details: str | None = Field(
        default=None,
        description="宠物的详细信息（名字、种类等）",
    )
    interests: list[str] = Field(
        default_factory=list,
        description="用户的兴趣、喜好",
    )
    concerns: list[str] = Field(
        default_factory=list,
        description="用户表达过的担忧、困扰",
    )
    important_dates: list[str] = Field(
        default_factory=list,
        description="重要日期（如预产期、宝宝生日等）",
    )
    baby_age_weeks: int | None = Field(
        default=None,
        description="宝宝年龄（周）",
    )
    community_interactions: list[str] = Field(
        default_factory=list,
        description="用户在社区的互动记录（发帖、评论等）",
    )


class ConversationMemory(BaseModel):
    """对话记忆模型"""

    session_id: str
    turns: list[dict] = Field(
        default_factory=list,
        description="历史对话回合，每轮包含 user_input 和 assistant_response",
    )
    max_turns: int = Field(
        default=10,
        ge=1,
        le=50,
        description="保留的最大历史轮数",
    )


class VisualResponse(BaseModel):
    """
    Soulful Companion 的统一响应模型

    这是情感交互模块的核心响应结构，包含：
    - text: Agent 的文字回复
    - visual_metadata: 视觉效果元数据，驱动去对话框化的前端呈现
    """

    text: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Agent 的回复文字，温暖、共情、不说教的陪伴话语",
    )
    visual_metadata: VisualMetadata = Field(
        ...,
        description="视觉元数据，描述回复应呈现的视觉氛围",
    )
    memory_updated: bool = Field(
        default=False,
        description="本次交互是否更新了用户记忆",
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "text": "听起来你今天真的很累，能和我说说是什么让你感到最无力吗？",
                    "visual_metadata": {
                        "effect_type": "warm_glow",
                        "intensity": 0.7,
                        "color_tone": "warm_gold",
                    },
                    "memory_updated": True,
                }
            ]
        }
    }
