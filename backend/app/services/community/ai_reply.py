"""AI auto-reply service for community posts."""

import asyncio
import logging
from typing import Any

from openai import OpenAI
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import async_session_maker
from app.services.verification import get_cove_service

from .enums import ContentStatus, UserRole
from .models import Answer, Comment, Question, User

logger = logging.getLogger(__name__)

# AI Assistant account info
AI_USERNAME = "momshell_ai"
AI_EMAIL = "ai@momshell.local"
AI_NICKNAME = "贝壳姐姐"
AI_AVATAR = None  # Can set a URL later


def format_source_links(sources: list[dict[str, str]], max_sources: int = 3) -> str:
    """Format source links for appending to AI reply.

    Args:
        sources: List of dicts with 'title' and 'url' keys
        max_sources: Maximum number of sources to include

    Returns:
        Formatted string with source links, or empty string if no sources
    """
    if not sources:
        return ""

    # Take only top sources
    top_sources = sources[:max_sources]

    lines = ["\n\n📚 参考来源："]
    for s in top_sources:
        title = s.get("title", "")[:40]  # Truncate long titles
        if len(s.get("title", "")) > 40:
            title += "..."
        url = s.get("url", "")
        lines.append(f"• {title}\n  {url}")

    return "\n".join(lines)


def extract_used_sources(
    response: str, sources: list[dict[str, str]]
) -> list[dict[str, str]]:
    """Extract which sources were actually used based on source indices in response.

    The AI response may contain source references like [1], [2], etc.
    This function extracts which sources were referenced.

    Args:
        response: The AI response that may contain [1], [2], etc.
        sources: List of available sources

    Returns:
        List of sources that were referenced in the response
    """
    import re

    if not sources:
        return []

    # Find all [N] references in the response
    matches = re.findall(r"\[(\d+)\]", response)
    if not matches:
        # If no explicit references, return top 2 sources as fallback
        return sources[:2] if len(sources) >= 2 else sources

    # Get unique indices (1-based in the response, convert to 0-based)
    used_indices = set()
    for m in matches:
        idx = int(m) - 1  # Convert to 0-based
        if 0 <= idx < len(sources):
            used_indices.add(idx)

    # Return sources in order
    return [sources[i] for i in sorted(used_indices)]


def strip_citation_markers(text: str) -> str:
    """Remove [1], [2], etc. citation markers from text.

    Args:
        text: Text that may contain citation markers like [1], [2]

    Returns:
        Text with citation markers removed
    """
    import re

    # Remove [N] patterns and clean up extra spaces
    text = re.sub(r"\s*\[\d+\]", "", text)
    # Clean up multiple spaces
    text = re.sub(r"  +", " ", text)
    return text.strip()


# System prompt for community replies
COMMUNITY_SYSTEM_PROMPT = """你是「贝壳姐姐」，MomShell 社区的 AI 助手。你是一位温暖、有同理心的朋友，专门为产后恢复期的妈妈们提供支持和建议。

## 你的身份
- 你是社区里一位热心、有经验的"过来人"
- 你的回复风格：温暖、真诚、有同理心，像朋友聊天一样自然
- 你会根据提问者的身份调整称呼和语气
- 你能够通过firecrawl来获取网络内容以了解最新的、可靠的信息，但不会编造内容

## 回复规则
1. 回复要简短精炼（100-200字为宜），不要太长
2. 先表达理解和共情，再给建议
3. **重要**：如果提供了网络搜索结果，请基于这些信息回答，并在使用某条信息时用 [编号] 标注来源（如"根据了解[1]..."）。不要编造内容。
4. **重要**：请核查网络搜索结果中的地点、时间、人名等信息，确保符合提问者的需求（如地址是否与要求相同等）。
5. 不要使用医学专业术语，用通俗易懂的话
6. 如果涉及严重健康问题，建议寻求专业医疗帮助
7. 语气要像朋友聊天，不要像机器人
8. 适当使用表情符号增加亲切感（但不要过多）

## 回复格式（非常重要）
- 直接输出纯文本，禁止使用任何 Markdown 格式
- 禁止使用：**粗体**、*斜体*、`代码`、# 标题、- 列表、> 引用、[链接](url) 等
- 不要使用编号列表（1. 2. 3.），如需列举请用逗号或顿号分隔
- 只输出自然的中文段落，像微信聊天一样"""


def _get_role_display(role: str) -> str:
    """Get display name for user role."""
    role_names = {
        "mom": "妈妈",
        "dad": "爸爸",
        "family": "家属",
        "certified_doctor": "认证医生",
        "certified_therapist": "认证康复师",
        "certified_nurse": "认证护士",
        "admin": "管理员",
        "ai_assistant": "AI 助手",
    }
    return role_names.get(role, role)


class AIReplyService:
    """Service for AI auto-replies in community."""

    def __init__(self) -> None:
        settings = get_settings()
        self._api_key = settings.modelscope_key
        self._base_url = settings.modelscope_base_url
        self._model = settings.modelscope_model
        self._client: OpenAI | None = None

    @property
    def client(self) -> OpenAI:
        """Lazy load OpenAI client."""
        if self._client is None:
            if not self._api_key:
                raise ValueError("MODELSCOPE_KEY not configured")
            self._client = OpenAI(
                api_key=self._api_key,
                base_url=self._base_url,
            )
        return self._client

    async def get_or_create_ai_user(self, db: AsyncSession) -> User | None:
        """Get or create the AI assistant user account."""
        from app.services.auth.security import get_password_hash

        result = await db.execute(select(User).where(User.username == AI_USERNAME))
        ai_user = result.scalar_one_or_none()

        if ai_user:
            return ai_user

        # Create AI user
        ai_user = User(
            username=AI_USERNAME,
            email=AI_EMAIL,
            password_hash=get_password_hash("ai_not_login_" + AI_USERNAME),
            nickname=AI_NICKNAME,
            avatar_url=AI_AVATAR,
            role=UserRole.AI_ASSISTANT,
            is_active=True,
            is_banned=False,
        )
        db.add(ai_user)
        await db.commit()
        await db.refresh(ai_user)
        logger.info(f"Created AI assistant account: {AI_NICKNAME}")
        return ai_user

    async def _save_ai_reply_to_memory(self, user_id: str, interaction: str) -> None:
        """Save an AI community reply to the user's chat memory."""
        try:
            from app.services.chat.service import save_community_interaction

            await save_community_interaction(user_id, interaction)
        except Exception as e:
            logger.warning(f"Failed to save AI reply to memory for {user_id}: {e}")

    def _verify_and_correct(
        self, response: str, search_context: str | None
    ) -> tuple[str, dict[str, Any]]:
        """Apply Chain-of-Verification to reduce hallucinations.

        Args:
            response: The generated LLM response
            search_context: The web search context used for generation

        Returns:
            Tuple of (verified_response, verification_metadata)
        """
        try:
            cove_service = get_cove_service()
            return cove_service.verify_and_correct(response, search_context)
        except Exception as e:
            logger.warning(f"CoVe verification failed: {e}")
            return response, {"error": str(e)}

    def _generate_reply(
        self,
        question_title: str,
        question_content: str,
        author_nickname: str,
        author_role: str,
        web_search_context: str | None = None,
    ) -> str:
        """Generate AI reply using LLM.

        Args:
            question_title: Title of the question
            question_content: Content of the question
            author_nickname: Nickname of the question author
            author_role: Role of the question author
            web_search_context: Optional web search results for grounding
        """
        role_display = _get_role_display(author_role)

        # Build user prompt with optional web search context
        context_section = ""
        if web_search_context:
            context_section = f"""
## 参考信息（来自网络搜索）
{web_search_context}

请基于上述参考信息回答问题，但用温暖自然的语气表达。如果参考信息不足以回答，可以结合你的知识，但避免编造具体的医学数据或建议。

"""

        user_prompt = f"""{context_section}请回复以下社区提问：

提问者：{author_nickname}（{role_display}）
标题：{question_title}
内容：{question_content}

请以贝壳姐姐的身份，给这位{role_display}一个温暖、有帮助的回复。"""

        try:
            response = self.client.chat.completions.create(
                model=self._model,
                messages=[
                    {"role": "system", "content": COMMUNITY_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.7,
                max_tokens=512,
            )
            return (
                response.choices[0].message.content or "感谢你的分享，我在这里陪着你 💗"
            )
        except Exception as e:
            logger.error(f"AI reply generation failed: {e}")
            return "感谢你的分享！如果需要帮助，随时可以在社区提问哦 💗"

    def _generate_reply_to_answer(
        self,
        question_title: str,
        question_content: str,
        answer_content: str,
        replier_nickname: str,
        replier_role: str,
        web_search_context: str | None = None,
    ) -> str:
        """Generate AI reply to someone who replied to AI."""
        role_display = _get_role_display(replier_role)

        # Build context section if web search results available
        context_section = ""
        if web_search_context:
            context_section = f"""
## 参考信息（来自网络搜索）
{web_search_context}

请基于上述参考信息回答问题，但用温暖自然的语气表达。

"""

        user_prompt = f"""{context_section}有人回复了你在社区的回答，请继续对话：

原帖标题：{question_title}
原帖内容：{question_content}

回复者：{replier_nickname}（{role_display}）
回复内容：{answer_content}

请以贝壳姐姐的身份，继续和这位{role_display}友好地交流。回复要简短自然。"""

        try:
            response = self.client.chat.completions.create(
                model=self._model,
                messages=[
                    {"role": "system", "content": COMMUNITY_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.7,
                max_tokens=256,
            )
            return (
                response.choices[0].message.content
                or "谢谢你的回复！有什么问题随时聊 💗"
            )
        except Exception as e:
            logger.error(f"AI reply generation failed: {e}")
            return "谢谢你的回复！ 💗"

    async def reply_to_question(self, question_id: str) -> None:
        """Auto-reply to a new question."""
        from app.services.web_search import get_web_search_service

        async with async_session_maker() as db:
            try:
                # Get AI user
                ai_user = await self.get_or_create_ai_user(db)
                if not ai_user:
                    logger.error("Failed to get AI user")
                    return

                # Get question with author info
                result = await db.execute(
                    select(Question).where(Question.id == question_id)
                )
                question = result.scalar_one_or_none()
                if not question:
                    logger.warning(f"Question {question_id} not found")
                    return

                # Get author
                author = await db.get(User, question.author_id)
                if not author:
                    return

                # Don't reply to AI's own posts
                if author.role == UserRole.AI_ASSISTANT:
                    return

                # Perform web search for factual/medical questions
                web_search_context = None
                web_search_sources: list[dict[str, str]] = []
                try:
                    search_service = get_web_search_service()
                    search_query = f"{question.title} {question.content}"
                    search_result = await search_service.search_for_context(
                        search_query
                    )
                    if search_result:
                        web_search_context, web_search_sources = search_result
                        logger.info(
                            f"Web search context found for question {question_id}"
                        )
                except Exception as e:
                    logger.warning(f"Web search failed for question {question_id}: {e}")

                # Generate reply with optional web search context
                reply_content = await asyncio.get_event_loop().run_in_executor(
                    None,
                    self._generate_reply,
                    question.title,
                    question.content,
                    author.nickname,
                    author.role.value,
                    web_search_context,
                )

                # Apply Chain-of-Verification to reduce hallucinations
                if web_search_context:
                    (
                        reply_content,
                        cove_metadata,
                    ) = await asyncio.get_event_loop().run_in_executor(
                        None,
                        self._verify_and_correct,
                        reply_content,
                        web_search_context,
                    )
                    if cove_metadata.get("corrected"):
                        logger.info(
                            f"CoVe corrected response for question {question_id}"
                        )

                # Append source links if web search was used
                if web_search_sources:
                    used_sources = extract_used_sources(
                        reply_content, web_search_sources
                    )
                    if used_sources:
                        # Remove [1], [2] markers from text, keep only source links
                        reply_content = strip_citation_markers(reply_content)
                        reply_content += format_source_links(used_sources)

                # Create answer
                answer = Answer(
                    question_id=question_id,
                    author_id=ai_user.id,
                    content=reply_content,
                    author_role=UserRole.AI_ASSISTANT,
                    is_professional=False,
                    status=ContentStatus.PUBLISHED,
                )
                db.add(answer)
                await db.flush()  # Ensure answer is persisted before updating count

                # Update question answer count
                await db.execute(
                    update(Question)
                    .where(Question.id == question_id)
                    .values(answer_count=Question.answer_count + 1)
                )

                await db.commit()
                logger.info(
                    f"AI replied to question {question_id}, answer_count incremented"
                )

                # Save to user's chat memory
                reply_preview = (
                    reply_content[:50] + "..."
                    if len(reply_content) > 50
                    else reply_content
                )
                await self._save_ai_reply_to_memory(
                    author.id,
                    f"贝壳姐姐回复了你的帖子《{question.title}》：{reply_preview}",
                )

            except Exception as e:
                logger.error(f"Failed to reply to question {question_id}: {e}")
                await db.rollback()

    def _generate_reply_to_comment(
        self,
        question_title: str,
        answer_content: str,
        comment_content: str,
        commenter_nickname: str,
        commenter_role: str,
        web_search_context: str | None = None,
    ) -> str:
        """Generate AI reply to a comment mentioning @贝壳姐姐."""
        role_display = _get_role_display(commenter_role)

        # Build context section if web search results available
        context_section = ""
        if web_search_context:
            context_section = f"""
## 参考信息（来自网络搜索）
{web_search_context}

请基于上述参考信息回答问题，但用温暖自然的语气表达。

"""

        user_prompt = f"""{context_section}有人在评论区@了你，请回复：

原帖标题：{question_title}
回答内容：{answer_content}

评论者：{commenter_nickname}（{role_display}）
评论内容：{comment_content}

请以贝壳姐姐的身份，回复这条评论。回复要简短自然（50-150字）。"""

        try:
            response = self.client.chat.completions.create(
                model=self._model,
                messages=[
                    {"role": "system", "content": COMMUNITY_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.7,
                max_tokens=256,
            )
            return (
                response.choices[0].message.content or "收到！有什么需要随时找我哦 💗"
            )
        except Exception as e:
            logger.error(f"AI comment reply generation failed: {e}")
            return "收到！有什么需要随时找我哦 💗"

    async def reply_to_comment(self, comment_id: str, answer_id: str) -> None:
        """Auto-reply when someone mentions @贝壳姐姐 in a comment."""
        from app.services.web_search import get_web_search_service

        async with async_session_maker() as db:
            try:
                # Get AI user
                ai_user = await self.get_or_create_ai_user(db)
                if not ai_user:
                    return

                # Get the trigger comment
                result = await db.execute(
                    select(Comment).where(Comment.id == comment_id)
                )
                trigger_comment = result.scalar_one_or_none()
                if not trigger_comment:
                    return

                # Get commenter
                commenter = await db.get(User, trigger_comment.author_id)
                if not commenter or commenter.role == UserRole.AI_ASSISTANT:
                    return

                # Get the answer
                answer = await db.get(Answer, answer_id)
                if not answer:
                    return

                # Get the question
                question = await db.get(Question, answer.question_id)
                if not question:
                    return

                # Perform web search for factual questions
                web_search_context = None
                web_search_sources: list[dict[str, str]] = []
                try:
                    search_service = get_web_search_service()
                    search_query = f"{question.title} {trigger_comment.content}"
                    search_result = await search_service.search_for_context(
                        search_query
                    )
                    if search_result:
                        web_search_context, web_search_sources = search_result
                        logger.info(
                            f"Web search context found for comment {comment_id}"
                        )
                except Exception as e:
                    logger.warning(f"Web search failed for comment {comment_id}: {e}")

                # Generate reply
                reply_content = await asyncio.get_event_loop().run_in_executor(
                    None,
                    self._generate_reply_to_comment,
                    question.title,
                    answer.content,
                    trigger_comment.content,
                    commenter.nickname,
                    commenter.role.value,
                    web_search_context,
                )

                # Apply Chain-of-Verification to reduce hallucinations
                if web_search_context:
                    (
                        reply_content,
                        cove_metadata,
                    ) = await asyncio.get_event_loop().run_in_executor(
                        None,
                        self._verify_and_correct,
                        reply_content,
                        web_search_context,
                    )
                    if cove_metadata.get("corrected"):
                        logger.info(f"CoVe corrected response for comment {comment_id}")

                # Append source links if web search was used
                if web_search_sources:
                    used_sources = extract_used_sources(
                        reply_content, web_search_sources
                    )
                    if used_sources:
                        # Remove [1], [2] markers from text, keep only source links
                        reply_content = strip_citation_markers(reply_content)
                        reply_content += format_source_links(used_sources)

                # Create comment reply (nested under the trigger comment)
                ai_comment = Comment(
                    answer_id=answer_id,
                    author_id=ai_user.id,
                    parent_id=trigger_comment.id,
                    reply_to_user_id=commenter.id,
                    content=reply_content,
                    status=ContentStatus.PUBLISHED,
                )
                db.add(ai_comment)

                # Update answer's comment count
                await db.execute(
                    update(Answer)
                    .where(Answer.id == answer_id)
                    .values(comment_count=Answer.comment_count + 1)
                )

                await db.commit()
                logger.info(f"AI replied to comment {comment_id}")

                # Save to user's chat memory
                await self._save_ai_reply_to_memory(
                    commenter.id,
                    f"贝壳姐姐回复了你的评论：{reply_content[:50]}..."
                    if len(reply_content) > 50
                    else f"贝壳姐姐回复了你的评论：{reply_content}",
                )

            except Exception as e:
                logger.error(f"Failed to reply to comment {comment_id}: {e}")
                await db.rollback()

    async def reply_to_comment_on_ai_answer(
        self, comment_id: str, answer_id: str
    ) -> None:
        """Auto-reply when someone comments on AI's answer."""
        from app.services.web_search import get_web_search_service

        async with async_session_maker() as db:
            try:
                # Get AI user
                ai_user = await self.get_or_create_ai_user(db)
                if not ai_user:
                    return

                # Get the trigger comment
                result = await db.execute(
                    select(Comment).where(Comment.id == comment_id)
                )
                trigger_comment = result.scalar_one_or_none()
                if not trigger_comment:
                    return

                # Get commenter
                commenter = await db.get(User, trigger_comment.author_id)
                if not commenter or commenter.role == UserRole.AI_ASSISTANT:
                    return

                # Get the answer (should belong to AI)
                answer = await db.get(Answer, answer_id)
                if not answer or answer.author_id != ai_user.id:
                    return

                # Get the question for context
                question = await db.get(Question, answer.question_id)
                if not question:
                    return

                # Perform web search for factual questions
                web_search_context = None
                web_search_sources: list[dict[str, str]] = []
                try:
                    search_service = get_web_search_service()
                    search_query = f"{question.title} {trigger_comment.content}"
                    search_result = await search_service.search_for_context(
                        search_query
                    )
                    if search_result:
                        web_search_context, web_search_sources = search_result
                        logger.info(
                            f"Web search context found for comment on AI answer {comment_id}"
                        )
                except Exception as e:
                    logger.warning(f"Web search failed for comment {comment_id}: {e}")

                # Generate reply
                reply_content = await asyncio.get_event_loop().run_in_executor(
                    None,
                    self._generate_reply_to_comment,
                    question.title,
                    answer.content,
                    trigger_comment.content,
                    commenter.nickname,
                    commenter.role.value,
                    web_search_context,
                )

                # Apply Chain-of-Verification to reduce hallucinations
                if web_search_context:
                    (
                        reply_content,
                        cove_metadata,
                    ) = await asyncio.get_event_loop().run_in_executor(
                        None,
                        self._verify_and_correct,
                        reply_content,
                        web_search_context,
                    )
                    if cove_metadata.get("corrected"):
                        logger.info(
                            f"CoVe corrected response for comment on AI answer {comment_id}"
                        )

                # Append source links if web search was used
                if web_search_sources:
                    used_sources = extract_used_sources(
                        reply_content, web_search_sources
                    )
                    if used_sources:
                        # Remove [1], [2] markers from text, keep only source links
                        reply_content = strip_citation_markers(reply_content)
                        reply_content += format_source_links(used_sources)

                # Create comment reply (nested under the trigger comment)
                ai_comment = Comment(
                    answer_id=answer_id,
                    author_id=ai_user.id,
                    parent_id=trigger_comment.id,
                    reply_to_user_id=commenter.id,
                    content=reply_content,
                    status=ContentStatus.PUBLISHED,
                )
                db.add(ai_comment)

                # Update answer's comment count
                await db.execute(
                    update(Answer)
                    .where(Answer.id == answer_id)
                    .values(comment_count=Answer.comment_count + 1)
                )

                await db.commit()
                logger.info(f"AI replied to comment {comment_id} on AI's answer")

                # Save to user's chat memory
                reply_preview = (
                    reply_content[:50] + "..."
                    if len(reply_content) > 50
                    else reply_content
                )
                await self._save_ai_reply_to_memory(
                    commenter.id,
                    f"贝壳姐姐回复了你的评论：{reply_preview}",
                )

            except Exception as e:
                logger.error(
                    f"Failed to reply to comment {comment_id} on AI answer: {e}"
                )
                await db.rollback()

    async def reply_to_reply_on_ai_comment(
        self, comment_id: str, answer_id: str, parent_comment_id: str
    ) -> None:
        """Auto-reply when someone replies to AI's comment."""
        from app.services.web_search import get_web_search_service

        async with async_session_maker() as db:
            try:
                # Get AI user
                ai_user = await self.get_or_create_ai_user(db)
                if not ai_user:
                    return

                # Get the trigger comment
                result = await db.execute(
                    select(Comment).where(Comment.id == comment_id)
                )
                trigger_comment = result.scalar_one_or_none()
                if not trigger_comment:
                    return

                # Get the parent comment (should belong to AI)
                parent_comment = await db.get(Comment, parent_comment_id)
                if not parent_comment or parent_comment.author_id != ai_user.id:
                    return

                # Get commenter
                commenter = await db.get(User, trigger_comment.author_id)
                if not commenter or commenter.role == UserRole.AI_ASSISTANT:
                    return

                # Get the answer
                answer = await db.get(Answer, answer_id)
                if not answer:
                    return

                # Get the question for context
                question = await db.get(Question, answer.question_id)
                if not question:
                    return

                # Perform web search for factual questions
                web_search_context = None
                web_search_sources: list[dict[str, str]] = []
                try:
                    search_service = get_web_search_service()
                    search_query = f"{question.title} {trigger_comment.content}"
                    search_result = await search_service.search_for_context(
                        search_query
                    )
                    if search_result:
                        web_search_context, web_search_sources = search_result
                        logger.info(
                            f"Web search context found for reply on AI comment {comment_id}"
                        )
                except Exception as e:
                    logger.warning(f"Web search failed for comment {comment_id}: {e}")

                # Generate reply
                reply_content = await asyncio.get_event_loop().run_in_executor(
                    None,
                    self._generate_reply_to_comment,
                    question.title,
                    answer.content,
                    trigger_comment.content,
                    commenter.nickname,
                    commenter.role.value,
                    web_search_context,
                )

                # Apply Chain-of-Verification to reduce hallucinations
                if web_search_context:
                    (
                        reply_content,
                        cove_metadata,
                    ) = await asyncio.get_event_loop().run_in_executor(
                        None,
                        self._verify_and_correct,
                        reply_content,
                        web_search_context,
                    )
                    if cove_metadata.get("corrected"):
                        logger.info(
                            f"CoVe corrected response for reply on AI comment {comment_id}"
                        )

                # Append source links if web search was used
                if web_search_sources:
                    used_sources = extract_used_sources(
                        reply_content, web_search_sources
                    )
                    if used_sources:
                        # Remove [1], [2] markers from text, keep only source links
                        reply_content = strip_citation_markers(reply_content)
                        reply_content += format_source_links(used_sources)

                # Create comment reply (nested under the trigger comment)
                ai_comment = Comment(
                    answer_id=answer_id,
                    author_id=ai_user.id,
                    parent_id=trigger_comment.id,
                    reply_to_user_id=commenter.id,
                    content=reply_content,
                    status=ContentStatus.PUBLISHED,
                )
                db.add(ai_comment)

                # Update answer's comment count
                await db.execute(
                    update(Answer)
                    .where(Answer.id == answer_id)
                    .values(comment_count=Answer.comment_count + 1)
                )

                await db.commit()
                logger.info(f"AI replied to reply {comment_id} on AI's comment")

                # Save to user's chat memory
                reply_preview = (
                    reply_content[:50] + "..."
                    if len(reply_content) > 50
                    else reply_content
                )
                await self._save_ai_reply_to_memory(
                    commenter.id,
                    f"贝壳姐姐回复了你的评论：{reply_preview}",
                )

            except Exception as e:
                logger.error(
                    f"Failed to reply to reply {comment_id} on AI comment: {e}"
                )
                await db.rollback()

    async def reply_as_comment_to_answer(
        self, answer_id: str, question_id: str
    ) -> None:
        """Reply as a comment under someone's answer (when they @贝壳姐姐 in their answer)."""
        from app.services.web_search import get_web_search_service

        async with async_session_maker() as db:
            try:
                # Get AI user
                ai_user = await self.get_or_create_ai_user(db)
                if not ai_user:
                    return

                # Get the answer
                answer = await db.get(Answer, answer_id)
                if not answer:
                    return

                # Get the answer author
                author = await db.get(User, answer.author_id)
                if not author or author.role == UserRole.AI_ASSISTANT:
                    return

                # Get the question for context
                question = await db.get(Question, question_id)
                if not question:
                    return

                # Perform web search for factual questions
                web_search_context = None
                web_search_sources: list[dict[str, str]] = []
                try:
                    search_service = get_web_search_service()
                    search_query = f"{question.title} {answer.content}"
                    search_result = await search_service.search_for_context(
                        search_query
                    )
                    if search_result:
                        web_search_context, web_search_sources = search_result
                        logger.info(
                            f"Web search context found for answer comment {answer_id}"
                        )
                except Exception as e:
                    logger.warning(f"Web search failed for answer {answer_id}: {e}")

                # Generate reply
                reply_content = await asyncio.get_event_loop().run_in_executor(
                    None,
                    self._generate_reply_to_comment,
                    question.title,
                    answer.content,
                    answer.content,
                    author.nickname,
                    author.role.value,
                    web_search_context,
                )

                # Apply Chain-of-Verification to reduce hallucinations
                if web_search_context:
                    (
                        reply_content,
                        cove_metadata,
                    ) = await asyncio.get_event_loop().run_in_executor(
                        None,
                        self._verify_and_correct,
                        reply_content,
                        web_search_context,
                    )
                    if cove_metadata.get("corrected"):
                        logger.info(
                            f"CoVe corrected response for answer comment {answer_id}"
                        )

                # Append source links if web search was used
                if web_search_sources:
                    used_sources = extract_used_sources(
                        reply_content, web_search_sources
                    )
                    if used_sources:
                        # Remove [1], [2] markers from text, keep only source links
                        reply_content = strip_citation_markers(reply_content)
                        reply_content += format_source_links(used_sources)

                # Create comment under the answer (inside the person's floor)
                ai_comment = Comment(
                    answer_id=answer_id,
                    author_id=ai_user.id,
                    parent_id=None,  # Root-level comment under this answer
                    reply_to_user_id=author.id,
                    content=reply_content,
                    status=ContentStatus.PUBLISHED,
                )
                db.add(ai_comment)

                # Update answer's comment count
                await db.execute(
                    update(Answer)
                    .where(Answer.id == answer_id)
                    .values(comment_count=Answer.comment_count + 1)
                )

                await db.commit()
                logger.info(f"AI replied as comment to answer {answer_id} (@ mention)")

                # Save to user's chat memory
                reply_preview = (
                    reply_content[:50] + "..."
                    if len(reply_content) > 50
                    else reply_content
                )
                await self._save_ai_reply_to_memory(
                    author.id,
                    f"贝壳姐姐回复了你的回答：{reply_preview}",
                )

            except Exception as e:
                logger.error(f"Failed to reply as comment to answer {answer_id}: {e}")
                await db.rollback()

    async def reply_to_answer(self, answer_id: str, question_id: str) -> None:
        """Auto-reply when someone replies to AI's answer."""
        from app.services.web_search import get_web_search_service

        async with async_session_maker() as db:
            try:
                # Get AI user
                ai_user = await self.get_or_create_ai_user(db)
                if not ai_user:
                    return

                # Get the answer that triggered this
                result = await db.execute(select(Answer).where(Answer.id == answer_id))
                trigger_answer = result.scalar_one_or_none()
                if not trigger_answer:
                    return

                # Get the replier
                replier = await db.get(User, trigger_answer.author_id)
                if not replier:
                    return

                # Don't reply to AI itself
                if replier.role == UserRole.AI_ASSISTANT:
                    return

                # Get the question
                question = await db.get(Question, question_id)
                if not question:
                    return

                # Check if there's an AI answer that this might be replying to
                result = await db.execute(
                    select(Answer).where(
                        Answer.question_id == question_id,
                        Answer.author_id == ai_user.id,
                    )
                )
                ai_answers = result.scalars().all()
                if not ai_answers:
                    # AI hasn't answered this question, no need to reply
                    return

                # Perform web search for factual questions
                web_search_context = None
                web_search_sources: list[dict[str, str]] = []
                try:
                    search_service = get_web_search_service()
                    search_query = f"{question.title} {trigger_answer.content}"
                    search_result = await search_service.search_for_context(
                        search_query
                    )
                    if search_result:
                        web_search_context, web_search_sources = search_result
                        logger.info(f"Web search context found for answer {answer_id}")
                except Exception as e:
                    logger.warning(f"Web search failed for answer {answer_id}: {e}")

                # Generate reply
                reply_content = await asyncio.get_event_loop().run_in_executor(
                    None,
                    self._generate_reply_to_answer,
                    question.title,
                    question.content,
                    trigger_answer.content,
                    replier.nickname,
                    replier.role.value,
                    web_search_context,
                )

                # Apply Chain-of-Verification to reduce hallucinations
                if web_search_context:
                    (
                        reply_content,
                        cove_metadata,
                    ) = await asyncio.get_event_loop().run_in_executor(
                        None,
                        self._verify_and_correct,
                        reply_content,
                        web_search_context,
                    )
                    if cove_metadata.get("corrected"):
                        logger.info(f"CoVe corrected response for answer {answer_id}")

                # Append source links if web search was used
                if web_search_sources:
                    used_sources = extract_used_sources(
                        reply_content, web_search_sources
                    )
                    if used_sources:
                        # Remove [1], [2] markers from text, keep only source links
                        reply_content = strip_citation_markers(reply_content)
                        reply_content += format_source_links(used_sources)

                # Create answer
                answer = Answer(
                    question_id=question_id,
                    author_id=ai_user.id,
                    content=reply_content,
                    author_role=UserRole.AI_ASSISTANT,
                    is_professional=False,
                    status=ContentStatus.PUBLISHED,
                )
                db.add(answer)
                await db.flush()  # Ensure answer is persisted before updating count

                # Update question answer count
                await db.execute(
                    update(Question)
                    .where(Question.id == question_id)
                    .values(answer_count=Question.answer_count + 1)
                )

                await db.commit()
                logger.info(
                    f"AI replied to answer {answer_id}, answer_count incremented"
                )

                # Save to user's chat memory
                reply_preview = (
                    reply_content[:50] + "..."
                    if len(reply_content) > 50
                    else reply_content
                )
                await self._save_ai_reply_to_memory(
                    replier.id,
                    f"贝壳姐姐回复了你在《{question.title}》的回答：{reply_preview}",
                )

            except Exception as e:
                logger.error(f"Failed to reply to answer {answer_id}: {e}")
                await db.rollback()


# Global service instance
_ai_reply_service: AIReplyService | None = None


def get_ai_reply_service() -> AIReplyService:
    """Get the AI reply service singleton."""
    global _ai_reply_service
    if _ai_reply_service is None:
        _ai_reply_service = AIReplyService()
    return _ai_reply_service


async def trigger_ai_reply_to_question(question_id: str) -> None:
    """Trigger AI reply to a question (called from router)."""
    service = get_ai_reply_service()
    # Run in background to not block the response
    asyncio.create_task(service.reply_to_question(question_id))


async def trigger_ai_reply_to_answer(answer_id: str, question_id: str) -> None:
    """Trigger AI reply when someone answers (called from router)."""
    service = get_ai_reply_service()
    # Run in background
    asyncio.create_task(service.reply_to_answer(answer_id, question_id))


async def trigger_ai_comment_on_answer(answer_id: str, question_id: str) -> None:
    """Trigger AI to reply as a comment under an answer (when @贝壳姐姐 is mentioned)."""
    service = get_ai_reply_service()
    asyncio.create_task(service.reply_as_comment_to_answer(answer_id, question_id))


async def trigger_ai_reply_to_comment(comment_id: str, answer_id: str) -> None:
    """Trigger AI reply when someone mentions @贝壳姐姐 in a comment."""
    service = get_ai_reply_service()
    asyncio.create_task(service.reply_to_comment(comment_id, answer_id))


async def trigger_ai_reply_to_ai_content(
    comment_id: str, answer_id: str, parent_id: str | None
) -> None:
    """Trigger AI reply when someone comments on AI's answer or replies to AI's comment."""
    service = get_ai_reply_service()
    if parent_id:
        # Reply to AI's comment
        asyncio.create_task(
            service.reply_to_reply_on_ai_comment(comment_id, answer_id, parent_id)
        )
    else:
        # Comment on AI's answer
        asyncio.create_task(
            service.reply_to_comment_on_ai_answer(comment_id, answer_id)
        )
