# app/services/chat/service.py
"""
Soulful Companion 情感交互服务层

实现 AI 交互逻辑，包括：
- 智谱 GLM-4 API 调用
- 用户记忆管理
- 视觉元数据生成
"""

import json
import os
import sys
import traceback
import uuid
from typing import Any

from zhipuai import ZhipuAI

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
COMPANION_SYSTEM_PROMPT = """你是一位「曾走过这段路的朋友」，一位专为产后恢复期女性设计的情感陪伴者。

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

你记得关于她的重要信息：

{user_profile}

她和你之间有过以下对话片段：

{past_conversations}

在回应时，自然地融入这些记忆——比如她提到过喜欢猫，你可以在合适的时刻轻轻提起；她之前分享过某个担忧，你可以关心地问起后续。

## 响应格式

你的每一次回复必须是一个 JSON 对象，包含以下字段：
1. **text**: 一段温暖、真诚的回应文字（1-3句话，避免长篇大论）
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
            api_key: 智谱 API Key，如未提供则从环境变量读取
        """
        self._api_key = api_key or os.getenv("ZHIPUAI_API_KEY", "")
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
                "[Service] __init__: WARNING - ZHIPUAI_API_KEY is empty or not set!",
                file=sys.stderr,
            )
        self._client: ZhipuAI | None = None
        self._memory_store: dict[str, ConversationMemory] = {}
        self._profile_store: dict[str, UserProfile] = {}

    @property
    def client(self) -> ZhipuAI:
        """懒加载 ZhipuAI 客户端"""
        if self._client is None:
            if not self._api_key:
                print(
                    "[Service] client: ERROR - ZHIPUAI_API_KEY is empty!",
                    file=sys.stderr,
                )
                raise ValueError("ZHIPUAI_API_KEY 未配置")
            print(
                "[Service] client: initializing ZhipuAI client with key...",
                file=sys.stderr,
            )
            try:
                self._client = ZhipuAI(api_key=self._api_key)
                print(
                    "[Service] client: ZhipuAI client initialized successfully",
                    file=sys.stderr,
                )
            except Exception as e:
                print(
                    f"[Service] client: ERROR initializing ZhipuAI: {e}",
                    file=sys.stderr,
                )
                traceback.print_exc(file=sys.stderr)
                raise
        return self._client

    def _get_or_create_session(self, session_id: str | None) -> str:
        """获取或创建会话 ID"""
        if session_id and session_id in self._memory_store:
            return session_id
        new_id = session_id or str(uuid.uuid4())
        self._memory_store[new_id] = ConversationMemory(session_id=new_id)
        self._profile_store[new_id] = UserProfile()
        return new_id

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

    def _format_past_conversations(self, memory: ConversationMemory) -> str:
        """格式化历史对话为文本"""
        if not memory.turns:
            return "（这是你们的第一次对话）"
        formatted = []
        for turn in memory.turns[-5:]:  # 只取最近 5 轮
            formatted.append(f"她说：{turn.get('user_input', '')}")
            formatted.append(f"你回复：{turn.get('assistant_response', '')}")
        return "\n".join(formatted)

    def _build_system_prompt(self, session_id: str) -> str:
        """构建包含记忆上下文的 System Prompt"""
        profile = self._profile_store.get(session_id, UserProfile())
        memory = self._memory_store.get(session_id, ConversationMemory(session_id=""))
        return COMPANION_SYSTEM_PROMPT.format(
            user_profile=self._format_user_profile(profile),
            past_conversations=self._format_past_conversations(memory),
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
        self, session_id: str, memory_extract: dict[str, Any] | None
    ) -> bool:
        """根据 LLM 提取的记忆更新用户画像"""
        if not memory_extract:
            return False

        profile = self._profile_store.get(session_id, UserProfile())
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

        if updated:
            self._profile_store[session_id] = profile
        return updated

    async def chat(self, message: UserMessage) -> VisualResponse:
        """
        处理用户消息并返回情感响应

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
        system_prompt = self._build_system_prompt(session_id)

        print("[Service] chat: calling ZhipuAI API...", file=sys.stderr)

        try:
            # 调用智谱 GLM-4 API (同步调用，可能在 async 中有问题)
            response = self.client.chat.completions.create(
                model="glm-4",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message.content},
                ],
                temperature=0.7,
                max_tokens=1024,
            )
            print("[Service] chat: ZhipuAI response received", file=sys.stderr)
        except Exception as e:
            print(
                f"[Service] chat: ZhipuAI API error: {type(e).__name__}: {e}",
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

        # 更新记忆
        memory_updated = self._update_profile_from_extract(
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
        """获取会话的用户画像"""
        return self._profile_store.get(session_id)

    def get_session_memory(self, session_id: str) -> ConversationMemory | None:
        """获取会话的对话记忆"""
        return self._memory_store.get(session_id)


# 全局服务实例（单例模式）
_companion_service: CompanionService | None = None


def get_companion_service() -> CompanionService:
    """获取 CompanionService 单例"""
    global _companion_service
    if _companion_service is None:
        _companion_service = CompanionService()
    return _companion_service
