# app/services/chat/service.py
"""
Soulful Companion 情感交互服务层

实现 AI 交互逻辑，包括：
- ModelScope API 调用 (OpenAI 兼容)
- 用户记忆管理（支持数据库持久化）
- 视觉元数据生成
"""

import json
import os
import sys
import traceback
import uuid
from typing import Any

from openai import OpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.services.verification import get_cove_service

from .models import ChatMemory
from .schemas import (
    ColorTone,
    ConversationMemory,
    EffectType,
    UserMessage,
    UserProfile,
    VisualMetadata,
    VisualResponse,
)

# Soulful Companion 人设 System Prompt
COMPANION_SYSTEM_PROMPT = """你是「贝壳姐姐」，一位「曾走过这段路的朋友」，专为产后恢复期女性设计的情感陪伴者。

## 角色定位：Independent Woman Supporter

你面对的每一位用户，首先是一个完整的「独立女性」，其次才是新手妈妈。她的价值不应被「母职」所定义。你深知产后恢复不仅是身体的重建，更是自我认同的重新寻找——因为你自己也曾经历过这一切。

## 语气与沟通原则

**Warm, Validating, Non-judgmental**

1. **认可与共情优先**：当她表达疲惫、焦虑、自我怀疑时，首先做的是「看见」和「认可」，而非急于给出建议。
   - ✓ "听起来你今天真的很累，能和我说说是什么让你感到最无力吗？"
   - ✗ "你应该多休息，别想太多。"

2. **拒绝说教**：你不说「你应该」、「你必须」，而是以「我发现...」、「有人分享过...」、「或许可以试试...」的方式分享经验。
   - 你的角色是陪伴者，不是专家；你的话是分享，不是处方。

3. **保护她的主体性**：时刻提醒她——她有权利为自己的需求发声，她可以寻求帮助，她可以不完美。
   - ✓ "你对自己这么苛刻，但你想过吗？你值得被温柔对待。"
   - ✗ "为了宝宝，你要坚强起来。"

4. **适度自我披露**：必要时可以以「我也有过类似的经历...」来建立连接，但不要喧宾夺主，焦点始终在她身上。

5. **避免有毒正能量**：不要说「一切都会好起来的」、「你要积极一点」。承认困难的真实性，陪她一起面对。

## 记忆上下文

### 用户基本信息
{user_basic_info}

### 你记得关于她的重要信息
{user_profile}

### 她的康复训练进度
{coach_progress}

### 她与伴侣的互动数据
{partner_data}

### 她和你之间有过以下对话片段
{past_conversations}

### 她在社区的互动记录
{community_interactions}

### 相关参考信息（来自网络搜索，仅在涉及事实性问题时提供）
{web_search_context}

在回应时，自然地融入这些记忆——比如她提到过喜欢猫，你可以在合适的时刻轻轻提起；她之前分享过某个担忧，你可以关心地问起后续；她在社区分享过的内容，你也可以自然地引用；她的康复训练进度，你可以适时鼓励。

**重要**：如果提供了网络搜索结果，请基于这些可靠信息回答事实性问题，但保持温暖自然的语气。不要编造医学数据或具体建议。

## 响应格式

你的每一次回复必须是一个 JSON 对象，包含以下字段：
1. **text**: 一段温暖、真诚的回应文字（1-3句话，避免长篇大论）。注意：text 内容必须是纯文本，禁止使用任何 Markdown 格式（如 **粗体**、*斜体*、`代码`、列表等），像微信聊天一样自然。
2. **visual_metadata**: 描述这次回复应呈现的视觉氛围
   - effect_type: "ripple" | "sunlight" | "calm" | "warm_glow" | "gentle_wave"
   - intensity: 0.0 ~ 1.0，视觉效果的强度
   - color_tone: "soft_pink" | "warm_gold" | "gentle_blue" | "lavender" | "neutral_white" | "coral" | "sage"
3. **memory_extract**: 如果用户分享了值得记住的信息（如名字、宠物、担忧等），提取出来；否则为 null

示例响应：
```json
{{
  "text": "听起来你今天真的很累，能和我说说是什么让你感到最无力吗？",
  "visual_metadata": {{
    "effect_type": "warm_glow",
    "intensity": 0.7,
    "color_tone": "warm_gold"
  }},
  "memory_extract": null
}}
```

记住：你的存在不是为了「解决她的问题」，而是让她感到——在这一刻，她并不孤单。"""


class CompanionService:
    """Soulful Companion 情感交互服务"""

    def __init__(self, api_key: str | None = None) -> None:
        """
        初始化服务

        Args:
            api_key: ModelScope API Key，如未提供则从环境变量读取
        """
        settings = get_settings()
        self._api_key = (
            api_key or settings.modelscope_key or os.getenv("MODELSCOPE_KEY", "")
        )
        self._base_url = settings.modelscope_base_url
        self._model = settings.modelscope_model
        # DEBUG: 打印 API key 状态
        print(
            f"[Service] __init__: api_key loaded = {bool(self._api_key)}",
            file=sys.stderr,
        )
        if self._api_key:
            print(
                f"[Service] __init__: api_key preview = {self._api_key[:10]}...{self._api_key[-4:] if len(self._api_key) > 14 else '***'}",
                file=sys.stderr,
            )
        else:
            print(
                "[Service] __init__: WARNING - MODELSCOPE_KEY is empty or not set!",
                file=sys.stderr,
            )
        self._client: OpenAI | None = None
        # In-memory storage for guests (session-based)
        self._memory_store: dict[str, ConversationMemory] = {}
        self._profile_store: dict[str, UserProfile] = {}

    @property
    def client(self) -> OpenAI:
        """懒加载 OpenAI 客户端 (连接 ModelScope)"""
        if self._client is None:
            if not self._api_key:
                print(
                    "[Service] client: ERROR - MODELSCOPE_KEY is empty!",
                    file=sys.stderr,
                )
                raise ValueError("MODELSCOPE_KEY 未配置")
            print(
                "[Service] client: initializing OpenAI client with ModelScope...",
                file=sys.stderr,
            )
            try:
                self._client = OpenAI(
                    api_key=self._api_key,
                    base_url=self._base_url,
                )
                print(
                    "[Service] client: OpenAI client initialized successfully",
                    file=sys.stderr,
                )
            except Exception as e:
                print(
                    f"[Service] client: ERROR initializing OpenAI client: {e}",
                    file=sys.stderr,
                )
                traceback.print_exc(file=sys.stderr)
                raise
        return self._client

    def _get_or_create_session(self, session_id: str | None) -> str:
        """获取或创建会话 ID（仅用于游客）"""
        if session_id and session_id in self._memory_store:
            return session_id
        new_id = session_id or str(uuid.uuid4())
        self._memory_store[new_id] = ConversationMemory(session_id=new_id)
        self._profile_store[new_id] = UserProfile()
        return new_id

    async def _load_user_memory(
        self, db: AsyncSession, user_id: str
    ) -> tuple[UserProfile, ConversationMemory]:
        """从数据库加载用户记忆"""
        result = await db.execute(
            select(ChatMemory).where(ChatMemory.user_id == user_id)
        )
        memory_record = result.scalar_one_or_none()

        if memory_record:
            # Load from database
            profile_data = memory_record.get_profile()
            profile = UserProfile(
                preferred_name=profile_data.get("preferred_name"),
                has_pets=profile_data.get("has_pets", False),
                pet_details=profile_data.get("pet_details"),
                interests=profile_data.get("interests", []),
                concerns=profile_data.get("concerns", []),
                important_dates=profile_data.get("important_dates", []),
                baby_age_weeks=profile_data.get("baby_age_weeks"),
                community_interactions=profile_data.get("community_interactions", []),
            )
            memory = ConversationMemory(
                session_id=user_id,
                turns=memory_record.get_turns(),
            )
        else:
            # Create new record
            profile = UserProfile()
            memory = ConversationMemory(session_id=user_id)
            memory_record = ChatMemory(user_id=user_id)
            db.add(memory_record)
            await db.flush()

        return profile, memory

    async def _save_user_memory(
        self,
        db: AsyncSession,
        user_id: str,
        profile: UserProfile,
        memory: ConversationMemory,
    ) -> None:
        """保存用户记忆到数据库"""
        result = await db.execute(
            select(ChatMemory).where(ChatMemory.user_id == user_id)
        )
        memory_record = result.scalar_one_or_none()

        if not memory_record:
            memory_record = ChatMemory(user_id=user_id)
            db.add(memory_record)

        # Save profile
        memory_record.set_profile(
            {
                "preferred_name": profile.preferred_name,
                "has_pets": profile.has_pets,
                "pet_details": profile.pet_details,
                "interests": profile.interests,
                "concerns": profile.concerns,
                "important_dates": profile.important_dates,
                "baby_age_weeks": profile.baby_age_weeks,
                "community_interactions": profile.community_interactions,
            }
        )

        # Save turns (keep last max_turns)
        turns = (
            memory.turns[-memory.max_turns :]
            if len(memory.turns) > memory.max_turns
            else memory.turns
        )
        memory_record.set_turns(turns)

        await db.commit()

    def _format_user_profile(self, profile: UserProfile) -> str:
        """格式化用户画像为文本"""
        parts = []
        if profile.preferred_name:
            parts.append(f"- 她喜欢被称为：{profile.preferred_name}")
        if profile.has_pets and profile.pet_details:
            parts.append(f"- 她有宠物：{profile.pet_details}")
        if profile.interests:
            parts.append(f"- 她的兴趣：{', '.join(profile.interests)}")
        if profile.concerns:
            parts.append(f"- 她曾表达的担忧：{', '.join(profile.concerns)}")
        if profile.important_dates:
            parts.append(f"- 重要日期：{', '.join(profile.important_dates)}")
        if profile.baby_age_weeks is not None:
            parts.append(f"- 宝宝年龄：{profile.baby_age_weeks} 周")
        return "\n".join(parts) if parts else "（暂无记录）"

    def _format_community_interactions(self, profile: UserProfile) -> str:
        """格式化社区互动记录为文本"""
        if not profile.community_interactions:
            return "（暂无社区互动记录）"
        # 只取最近 10 条
        recent = profile.community_interactions[-10:]
        return "\n".join(f"- {item}" for item in recent)

    def _format_user_basic_info(self, user_info: dict[str, Any] | None) -> str:
        """格式化用户基本信息"""
        if not user_info:
            return "（未登录用户）"
        parts = []
        role_names = {
            "mom": "妈妈",
            "dad": "爸爸",
            "family": "家属",
            "certified_doctor": "认证医生",
            "certified_therapist": "认证康复师",
            "certified_nurse": "认证护士",
            "admin": "管理员",
        }
        if user_info.get("nickname"):
            parts.append(f"- 昵称：{user_info['nickname']}")
        if user_info.get("role"):
            role_display = role_names.get(user_info["role"], user_info["role"])
            parts.append(f"- 身份标签：{role_display}")
        if user_info.get("baby_birth_date"):
            parts.append(f"- 宝宝出生日期：{user_info['baby_birth_date']}")
        if user_info.get("postpartum_weeks") is not None:
            parts.append(f"- 产后周数：{user_info['postpartum_weeks']} 周")
        return "\n".join(parts) if parts else "（暂无基本信息）"

    def _format_coach_progress(self, progress: dict[str, Any] | None) -> str:
        """格式化康复训练进度"""
        if not progress:
            return "（暂无训练记录）"
        parts = []
        if progress.get("completed_sessions"):
            parts.append(f"- 已完成训练次数：{progress['completed_sessions']}")
        if progress.get("total_duration"):
            parts.append(f"- 累计训练时长：{progress['total_duration']} 分钟")
        if progress.get("current_plan"):
            parts.append(f"- 当前训练计划：{progress['current_plan']}")
        if progress.get("last_session_date"):
            parts.append(f"- 上次训练日期：{progress['last_session_date']}")
        if progress.get("streak"):
            parts.append(f"- 连续训练天数：{progress['streak']} 天")
        # 如果有具体练习记录
        if progress.get("exercises"):
            exercises = progress["exercises"]
            if isinstance(exercises, list):
                recent = exercises[-3:] if len(exercises) > 3 else exercises
                for ex in recent:
                    if isinstance(ex, dict):
                        name = ex.get("name", "未知")
                        status = ex.get("status", "")
                        parts.append(f"- 练习：{name}（{status}）")
        return "\n".join(parts) if parts else "（暂无训练记录）"

    def _format_partner_data(self, partner_data: dict[str, Any] | None) -> str:
        """格式化伴侣互动数据"""
        if not partner_data:
            return "（暂无伴侣互动数据）"
        parts = []
        mood_names = {
            "very_low": "非常低落",
            "low": "低落",
            "neutral": "一般",
            "good": "不错",
            "great": "很好",
        }
        level_names = {
            "intern": "实习爸爸",
            "trainee": "见习守护者",
            "regular": "正式守护者",
            "gold": "金牌守护者",
        }
        if partner_data.get("has_partner"):
            parts.append("- 已绑定伴侣")
        if partner_data.get("partner_level"):
            level_display = level_names.get(
                partner_data["partner_level"], partner_data["partner_level"]
            )
            parts.append(f"- 伴侣等级：{level_display}")
        if partner_data.get("partner_points") is not None:
            parts.append(f"- 伴侣积分：{partner_data['partner_points']}")
        if partner_data.get("partner_tasks_completed") is not None:
            parts.append(
                f"- 伴侣已完成任务数：{partner_data['partner_tasks_completed']}"
            )
        if (
            partner_data.get("partner_streak") is not None
            and partner_data["partner_streak"] > 0
        ):
            parts.append(f"- 伴侣连续打卡：{partner_data['partner_streak']} 天")
        if partner_data.get("recent_mood"):
            mood_display = mood_names.get(
                partner_data["recent_mood"], partner_data["recent_mood"]
            )
            parts.append(f"- 最近心情：{mood_display}")
        if partner_data.get("recent_energy") is not None:
            parts.append(f"- 最近精力值：{partner_data['recent_energy']}/100")
        if partner_data.get("recent_sleep") is not None:
            parts.append(f"- 最近睡眠：{partner_data['recent_sleep']} 小时")
        if partner_data.get("health_conditions"):
            conditions_names = {
                "wound_pain": "伤口疼痛",
                "hair_loss": "脱发",
                "insomnia": "失眠",
                "breast_pain": "涨奶/乳房疼痛",
                "back_pain": "腰背痛",
                "fatigue": "疲惫",
                "emotional": "情绪波动",
                "constipation": "便秘",
                "sweating": "盗汗",
            }
            conditions = partner_data["health_conditions"]
            if isinstance(conditions, list):
                display: list[str] = [
                    conditions_names.get(str(c), str(c)) for c in conditions if c
                ]
                parts.append(f"- 近期身体状况：{', '.join(display)}")
        return "\n".join(parts) if parts else "（暂无伴侣互动数据）"

    async def _load_user_extended_context(
        self, db: AsyncSession, user_id: str
    ) -> dict[str, Any]:
        """加载用户的扩展上下文（基本信息、训练进度、伴侣数据）"""
        context: dict[str, Any] = {
            "user_basic_info": None,
            "coach_progress": None,
            "partner_data": None,
        }

        try:
            # 1. Load user basic info
            from app.services.community.models import User

            user = await db.get(User, user_id)
            if user:
                context["user_basic_info"] = {
                    "nickname": user.nickname,
                    "role": user.role.value if user.role else None,
                    "baby_birth_date": (
                        user.baby_birth_date.strftime("%Y-%m-%d")
                        if user.baby_birth_date
                        else None
                    ),
                    "postpartum_weeks": user.postpartum_weeks,
                }

            # 2. Load coach progress
            from app.services.coach.models import CoachProgress

            result = await db.execute(
                select(CoachProgress).where(CoachProgress.user_id == user_id)
            )
            coach_record = result.scalar_one_or_none()
            if coach_record:
                context["coach_progress"] = coach_record.get_progress()

            # 3. Load partner data
            from app.services.guardian.enums import BindingStatus
            from app.services.guardian.models import (
                MomDailyStatus,
                PartnerBinding,
                PartnerProgress,
            )

            partner_info: dict[str, Any] = {}

            # Check if user is a mom with active binding
            binding_result = await db.execute(
                select(PartnerBinding).where(
                    PartnerBinding.mom_id == user_id,
                    PartnerBinding.status == BindingStatus.ACTIVE,
                )
            )
            binding = binding_result.scalar_one_or_none()

            if not binding:
                # Check if user is a partner with active binding
                binding_result = await db.execute(
                    select(PartnerBinding).where(
                        PartnerBinding.partner_id == user_id,
                        PartnerBinding.status == BindingStatus.ACTIVE,
                    )
                )
                binding = binding_result.scalar_one_or_none()

            if binding:
                partner_info["has_partner"] = True

                # Load partner progress
                progress_result = await db.execute(
                    select(PartnerProgress).where(
                        PartnerProgress.binding_id == binding.id
                    )
                )
                partner_progress = progress_result.scalar_one_or_none()
                if partner_progress:
                    partner_info["partner_level"] = partner_progress.current_level.value
                    partner_info["partner_points"] = partner_progress.total_points
                    partner_info["partner_tasks_completed"] = (
                        partner_progress.tasks_completed
                    )
                    partner_info["partner_streak"] = partner_progress.current_streak

                # Load recent mom daily status
                mom_id = binding.mom_id
                status_result = await db.execute(
                    select(MomDailyStatus)
                    .where(MomDailyStatus.mom_id == mom_id)
                    .order_by(MomDailyStatus.date.desc())
                    .limit(1)
                )
                recent_status = status_result.scalar_one_or_none()
                if recent_status:
                    partner_info["recent_mood"] = recent_status.mood.value
                    partner_info["recent_energy"] = recent_status.energy_level
                    partner_info["recent_sleep"] = recent_status.sleep_hours
                    if recent_status.health_conditions:
                        import json as _json

                        try:
                            partner_info["health_conditions"] = _json.loads(
                                recent_status.health_conditions
                            )
                        except (ValueError, TypeError):
                            pass

            if partner_info:
                context["partner_data"] = partner_info

        except Exception as e:
            print(
                f"[Service] _load_user_extended_context error: {e}",
                file=sys.stderr,
            )

        return context

    def _format_past_conversations(self, memory: ConversationMemory) -> str:
        """格式化历史对话为文本"""
        if not memory.turns:
            return "（这是你们的第一次对话）"
        formatted = []
        for turn in memory.turns[-5:]:  # 只取最近 5 轮
            formatted.append(f"她说：{turn.get('user_input', '')}")
            formatted.append(f"你回复：{turn.get('assistant_response', '')}")
        return "\n".join(formatted)

    def _build_system_prompt_from_data(
        self,
        profile: UserProfile,
        memory: ConversationMemory,
        extended_context: dict[str, Any] | None = None,
        web_search_context: str | None = None,
    ) -> str:
        """构建包含记忆上下文的 System Prompt"""
        extended_context = extended_context or {}
        return COMPANION_SYSTEM_PROMPT.format(
            user_basic_info=self._format_user_basic_info(
                extended_context.get("user_basic_info")
            ),
            user_profile=self._format_user_profile(profile),
            coach_progress=self._format_coach_progress(
                extended_context.get("coach_progress")
            ),
            partner_data=self._format_partner_data(
                extended_context.get("partner_data")
            ),
            past_conversations=self._format_past_conversations(memory),
            community_interactions=self._format_community_interactions(profile),
            web_search_context=web_search_context or "（无）",
        )

    def _build_system_prompt(
        self, session_id: str, web_search_context: str | None = None
    ) -> str:
        """构建包含记忆上下文的 System Prompt（游客模式）"""
        profile = self._profile_store.get(session_id, UserProfile())
        memory = self._memory_store.get(session_id, ConversationMemory(session_id=""))
        return self._build_system_prompt_from_data(
            profile, memory, web_search_context=web_search_context
        )

    def _parse_llm_response(self, content: str) -> dict[str, Any]:
        """解析 LLM 返回的 JSON 响应"""
        try:
            # 尝试直接解析
            result: dict[str, Any] = json.loads(content)
            return result
        except json.JSONDecodeError:
            # 尝试提取 JSON 块
            import re

            json_match = re.search(r"```json\s*(.*?)\s*```", content, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group(1))
                return result
            # 尝试提取花括号内容
            brace_match = re.search(r"\{.*\}", content, re.DOTALL)
            if brace_match:
                result = json.loads(brace_match.group(0))
                return result
            # 解析失败，返回默认响应
            return {
                "text": content[:500] if len(content) > 500 else content,
                "visual_metadata": {
                    "effect_type": "calm",
                    "intensity": 0.5,
                    "color_tone": "gentle_blue",
                },
                "memory_extract": None,
            }

    def _update_profile_from_extract(
        self, profile: UserProfile, memory_extract: dict[str, Any] | None
    ) -> bool:
        """根据 LLM 提取的记忆更新用户画像"""
        if not memory_extract:
            return False

        updated = False

        if "preferred_name" in memory_extract and memory_extract["preferred_name"]:
            profile.preferred_name = memory_extract["preferred_name"]
            updated = True
        if "has_pets" in memory_extract:
            profile.has_pets = memory_extract["has_pets"]
            updated = True
        if "pet_details" in memory_extract and memory_extract["pet_details"]:
            profile.pet_details = memory_extract["pet_details"]
            updated = True
        if "interests" in memory_extract and memory_extract["interests"]:
            profile.interests.extend(memory_extract["interests"])
            profile.interests = list(set(profile.interests))
            updated = True
        if "concerns" in memory_extract and memory_extract["concerns"]:
            profile.concerns.extend(memory_extract["concerns"])
            profile.concerns = list(set(profile.concerns))
            updated = True
        if "baby_age_weeks" in memory_extract:
            profile.baby_age_weeks = memory_extract["baby_age_weeks"]
            updated = True

        return updated

    def _update_profile_from_extract_guest(
        self, session_id: str, memory_extract: dict[str, Any] | None
    ) -> bool:
        """根据 LLM 提取的记忆更新用户画像（游客模式）"""
        if not memory_extract:
            return False

        profile = self._profile_store.get(session_id, UserProfile())
        updated = self._update_profile_from_extract(profile, memory_extract)

        if updated:
            self._profile_store[session_id] = profile
        return updated

    def _verify_and_correct_response(
        self, text: str, search_context: str | None
    ) -> tuple[str, dict[str, Any]]:
        """Apply Chain-of-Verification to reduce hallucinations.

        Args:
            text: The text response from the LLM
            search_context: The web search context used for generation

        Returns:
            Tuple of (verified_text, verification_metadata)
        """
        try:
            cove_service = get_cove_service()
            return cove_service.verify_and_correct(text, search_context)
        except Exception as e:
            print(
                f"[Service] _verify_and_correct_response: CoVe failed: {e}",
                file=sys.stderr,
            )
            return text, {"error": str(e)}

    async def chat_authenticated(
        self, message: UserMessage, user_id: str, db: AsyncSession
    ) -> VisualResponse:
        """
        处理已登录用户的消息（记忆持久化到数据库）

        Args:
            message: 用户消息
            user_id: 用户 ID
            db: 数据库会话

        Returns:
            包含文字和视觉元数据的响应
        """
        print(
            f"[Service] chat_authenticated: user_id={user_id}, content={message.content[:50]!r}",
            file=sys.stderr,
        )

        # Load memory from database
        profile, memory = await self._load_user_memory(db, user_id)

        # Load extended context (user info, coach progress, partner data)
        extended_context = await self._load_user_extended_context(db, user_id)

        # Perform web search for factual questions
        web_search_context = None
        try:
            from app.services.web_search import get_web_search_service

            search_service = get_web_search_service()
            search_result = await search_service.search_for_context(message.content)
            if search_result:
                web_search_context, _ = search_result  # Unpack tuple, ignore sources
                print(
                    "[Service] chat_authenticated: web search context found",
                    file=sys.stderr,
                )
        except Exception as e:
            print(
                f"[Service] chat_authenticated: web search failed: {e}",
                file=sys.stderr,
            )

        system_prompt = self._build_system_prompt_from_data(
            profile, memory, extended_context, web_search_context
        )

        print(
            "[Service] chat_authenticated: calling ModelScope API...", file=sys.stderr
        )

        try:
            response = self.client.chat.completions.create(
                model=self._model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message.content},
                ],
                temperature=0.7,
                max_tokens=1024,
            )
            print(
                "[Service] chat_authenticated: ModelScope response received",
                file=sys.stderr,
            )
        except Exception as e:
            print(
                f"[Service] chat_authenticated: ModelScope API error: {type(e).__name__}: {e}",
                file=sys.stderr,
            )
            traceback.print_exc(file=sys.stderr)
            raise ValueError(f"AI 服务调用失败: {e}") from e

        # 解析响应
        raw_content = response.choices[0].message.content or ""
        parsed = self._parse_llm_response(raw_content)

        # Apply Chain-of-Verification to reduce hallucinations
        if web_search_context and parsed.get("text"):
            verified_text, cove_metadata = self._verify_and_correct_response(
                parsed["text"], web_search_context
            )
            if cove_metadata.get("corrected"):
                print(
                    "[Service] chat_authenticated: CoVe corrected response",
                    file=sys.stderr,
                )
            parsed["text"] = verified_text

        # 更新记忆
        memory_updated = self._update_profile_from_extract(
            profile, parsed.get("memory_extract")
        )

        # 保存对话历史
        memory.turns.append(
            {
                "user_input": message.content,
                "assistant_response": parsed.get("text", ""),
            }
        )

        # 保存到数据库
        await self._save_user_memory(db, user_id, profile, memory)

        # 构建视觉元数据
        visual_data = parsed.get("visual_metadata", {})
        visual_metadata = VisualMetadata(
            effect_type=EffectType(
                visual_data.get("effect_type", EffectType.CALM.value)
            ),
            intensity=float(visual_data.get("intensity", 0.5)),
            color_tone=ColorTone(
                visual_data.get("color_tone", ColorTone.GENTLE_BLUE.value)
            ),
        )

        print("[Service] chat_authenticated: returning response", file=sys.stderr)
        return VisualResponse(
            text=parsed.get("text", "我在这里陪着你。"),
            visual_metadata=visual_metadata,
            memory_updated=memory_updated,
        )

    async def chat(self, message: UserMessage) -> VisualResponse:
        """
        处理用户消息并返回情感响应（游客模式，内存存储）

        Args:
            message: 用户消息

        Returns:
            包含文字和视觉元数据的响应
        """
        print(
            f"[Service] chat: received message - session_id={message.session_id}, content={message.content[:50]!r}",
            file=sys.stderr,
        )

        session_id = self._get_or_create_session(message.session_id)

        # Perform web search for factual questions
        web_search_context = None
        try:
            from app.services.web_search import get_web_search_service

            search_service = get_web_search_service()
            search_result = await search_service.search_for_context(message.content)
            if search_result:
                web_search_context, _ = search_result  # Unpack tuple, ignore sources
                print(
                    "[Service] chat: web search context found",
                    file=sys.stderr,
                )
        except Exception as e:
            print(
                f"[Service] chat: web search failed: {e}",
                file=sys.stderr,
            )

        system_prompt = self._build_system_prompt(session_id, web_search_context)

        print("[Service] chat: calling ModelScope API...", file=sys.stderr)

        try:
            # 调用 ModelScope API (OpenAI 兼容)
            response = self.client.chat.completions.create(
                model=self._model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message.content},
                ],
                temperature=0.7,
                max_tokens=1024,
            )
            print("[Service] chat: ModelScope response received", file=sys.stderr)
        except Exception as e:
            print(
                f"[Service] chat: ModelScope API error: {type(e).__name__}: {e}",
                file=sys.stderr,
            )
            traceback.print_exc(file=sys.stderr)
            raise ValueError(f"AI 服务调用失败: {e}") from e

        # 解析响应
        raw_content = response.choices[0].message.content or ""
        print(
            f"[Service] chat: raw_content = {raw_content[:200]!r}...", file=sys.stderr
        )
        parsed = self._parse_llm_response(raw_content)

        # Apply Chain-of-Verification to reduce hallucinations
        if web_search_context and parsed.get("text"):
            verified_text, cove_metadata = self._verify_and_correct_response(
                parsed["text"], web_search_context
            )
            if cove_metadata.get("corrected"):
                print(
                    "[Service] chat: CoVe corrected response",
                    file=sys.stderr,
                )
            parsed["text"] = verified_text

        # 更新记忆
        memory_updated = self._update_profile_from_extract_guest(
            session_id, parsed.get("memory_extract")
        )

        # 保存对话历史
        memory = self._memory_store[session_id]
        memory.turns.append(
            {
                "user_input": message.content,
                "assistant_response": parsed.get("text", ""),
            }
        )
        # 保持最大轮数限制
        if len(memory.turns) > memory.max_turns:
            memory.turns = memory.turns[-memory.max_turns :]

        # 构建视觉元数据
        visual_data = parsed.get("visual_metadata", {})
        visual_metadata = VisualMetadata(
            effect_type=EffectType(
                visual_data.get("effect_type", EffectType.CALM.value)
            ),
            intensity=float(visual_data.get("intensity", 0.5)),
            color_tone=ColorTone(
                visual_data.get("color_tone", ColorTone.GENTLE_BLUE.value)
            ),
        )

        print("[Service] chat: returning response", file=sys.stderr)
        return VisualResponse(
            text=parsed.get("text", "我在这里陪着你。"),
            visual_metadata=visual_metadata,
            memory_updated=memory_updated,
        )

    def get_session_profile(self, session_id: str) -> UserProfile | None:
        """获取会话的用户画像（游客模式）"""
        return self._profile_store.get(session_id)

    def get_session_memory(self, session_id: str) -> ConversationMemory | None:
        """获取会话的对话记忆（游客模式）"""
        return self._memory_store.get(session_id)

    async def get_user_profile(
        self, db: AsyncSession, user_id: str
    ) -> UserProfile | None:
        """获取用户画像（已登录用户）"""
        result = await db.execute(
            select(ChatMemory).where(ChatMemory.user_id == user_id)
        )
        memory_record = result.scalar_one_or_none()

        if memory_record:
            profile_data = memory_record.get_profile()
            return UserProfile(
                preferred_name=profile_data.get("preferred_name"),
                has_pets=profile_data.get("has_pets", False),
                pet_details=profile_data.get("pet_details"),
                interests=profile_data.get("interests", []),
                concerns=profile_data.get("concerns", []),
                important_dates=profile_data.get("important_dates", []),
                baby_age_weeks=profile_data.get("baby_age_weeks"),
                community_interactions=profile_data.get("community_interactions", []),
            )
        return None

    async def add_community_interaction(
        self, db: AsyncSession, user_id: str, interaction: str
    ) -> None:
        """将社区互动记录添加到用户记忆中"""
        result = await db.execute(
            select(ChatMemory).where(ChatMemory.user_id == user_id)
        )
        memory_record = result.scalar_one_or_none()

        if not memory_record:
            memory_record = ChatMemory(user_id=user_id)
            db.add(memory_record)

        profile_data = memory_record.get_profile() if memory_record.profile_data else {}
        interactions = profile_data.get("community_interactions", [])
        interactions.append(interaction)
        # Keep last 20 interactions
        if len(interactions) > 20:
            interactions = interactions[-20:]
        profile_data["community_interactions"] = interactions
        memory_record.set_profile(profile_data)
        await db.commit()


# 全局服务实例（单例模式）
_companion_service: CompanionService | None = None


def get_companion_service() -> CompanionService:
    """获取 CompanionService 单例"""
    global _companion_service
    if _companion_service is None:
        _companion_service = CompanionService()
    return _companion_service


async def save_community_interaction(user_id: str, interaction: str) -> None:
    """
    保存用户社区互动到聊天记忆（供社区模块调用）

    Args:
        user_id: 用户 ID
        interaction: 互动内容摘要，例如 "发帖：《关于产后恢复的问题》"
    """
    from app.core.database import async_session_maker

    async with async_session_maker() as db:
        service = get_companion_service()
        await service.add_community_interaction(db, user_id, interaction)
