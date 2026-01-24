"""Community service - core business logic."""

import json
from datetime import datetime
from typing import Literal

from fastapi import HTTPException
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .enums import (
    PROFESSIONAL_ROLES,
    CertificationStatus,
    ChannelType,
    ContentStatus,
    ModerationResult,
)
from .models import (
    Answer,
    Collection,
    Comment,
    Like,
    ModerationLog,
    Question,
    QuestionTag,
    Tag,
    User,
)
from .moderation import ModerationService, get_moderation_service
from .schemas import (
    AnswerCreate,
    AnswerListItem,
    AuthorInfo,
    PaginatedResponse,
    QuestionCreate,
    QuestionDetail,
    QuestionListItem,
    TagInfo,
)


class CommunityService:
    """Community service - handles all community-related business logic."""

    def __init__(self, moderation: ModerationService | None = None):
        """Initialize community service."""
        self._moderation = moderation or get_moderation_service()

    # ==================== Helper Methods ====================

    def is_certified_professional(self, user: User) -> bool:
        """Check if user is a certified professional."""
        return (
            user.role in PROFESSIONAL_ROLES
            and user.certification is not None
            and user.certification.status == CertificationStatus.APPROVED
        )

    def _build_author_info(self, user: User) -> AuthorInfo:
        """Build AuthorInfo from User model."""
        certification_title = None
        is_certified = False

        if (
            user.certification
            and user.certification.status == CertificationStatus.APPROVED
        ):
            is_certified = True
            parts = []
            if user.certification.hospital_or_institution:
                parts.append(user.certification.hospital_or_institution)
            if user.certification.department:
                parts.append(user.certification.department)
            if user.certification.title:
                parts.append(user.certification.title)
            certification_title = " ".join(parts) if parts else None

        return AuthorInfo(
            id=user.id,
            nickname=user.nickname,
            avatar_url=user.avatar_url,
            role=user.role,
            is_certified=is_certified,
            certification_title=certification_title,
        )

    def _build_tag_info(self, tag: Tag) -> TagInfo:
        """Build TagInfo from Tag model."""
        return TagInfo(id=tag.id, name=tag.name, slug=tag.slug)

    # ==================== Question Operations ====================

    async def get_questions(
        self,
        db: AsyncSession,
        channel: ChannelType | None = None,
        tag_id: str | None = None,
        status: ContentStatus = ContentStatus.PUBLISHED,
        sort_by: Literal[
            "created_at", "view_count", "answer_count", "like_count"
        ] = "created_at",
        order: Literal["asc", "desc"] = "desc",
        page: int = 1,
        page_size: int = 20,
        current_user_id: str | None = None,
    ) -> PaginatedResponse[QuestionListItem]:
        """Get paginated list of questions."""
        # Build query
        query = (
            select(Question)
            .options(selectinload(Question.author).selectinload(User.certification))
            .options(selectinload(Question.tags))
            .where(Question.status == status)
        )

        if channel:
            query = query.where(Question.channel == channel)

        if tag_id:
            query = query.join(QuestionTag).where(QuestionTag.tag_id == tag_id)

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar() or 0

        # Sort
        sort_column = getattr(Question, sort_by)
        if order == "desc":
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())

        # Paginate
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await db.execute(query)
        questions = result.scalars().all()

        # Build response
        items = []
        for q in questions:
            items.append(
                QuestionListItem(
                    id=q.id,
                    title=q.title,
                    content_preview=q.content[:100] + "..."
                    if len(q.content) > 100
                    else q.content,
                    channel=q.channel,
                    author=self._build_author_info(q.author),
                    tags=[self._build_tag_info(t) for t in q.tags],
                    view_count=q.view_count,
                    answer_count=q.answer_count,
                    like_count=q.like_count,
                    is_pinned=q.is_pinned,
                    is_featured=q.is_featured,
                    has_accepted_answer=q.accepted_answer_id is not None,
                    created_at=q.created_at,
                )
            )

        return PaginatedResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=(total + page_size - 1) // page_size,
        )

    async def get_question(
        self,
        db: AsyncSession,
        question_id: str,
        current_user_id: str | None = None,
        increment_view: bool = True,
    ) -> QuestionDetail | None:
        """Get question detail by ID."""
        query = (
            select(Question)
            .options(selectinload(Question.author).selectinload(User.certification))
            .options(selectinload(Question.tags))
            .where(Question.id == question_id)
        )

        result = await db.execute(query)
        question = result.scalar_one_or_none()

        if not question:
            return None

        # Increment view count
        if increment_view:
            await db.execute(
                update(Question)
                .where(Question.id == question_id)
                .values(view_count=Question.view_count + 1)
            )
            await db.commit()
            question.view_count += 1

        # Check user interactions
        is_liked = False
        is_collected = False
        if current_user_id:
            like_query = select(Like).where(
                Like.user_id == current_user_id,
                Like.target_type == "question",
                Like.target_id == question_id,
            )
            is_liked = (await db.execute(like_query)).scalar_one_or_none() is not None

            collection_query = select(Collection).where(
                Collection.user_id == current_user_id,
                Collection.question_id == question_id,
            )
            is_collected = (
                await db.execute(collection_query)
            ).scalar_one_or_none() is not None

        # Count professional vs experience answers
        pro_count_query = select(func.count()).where(
            Answer.question_id == question_id,
            Answer.is_professional.is_(True),
            Answer.status == ContentStatus.PUBLISHED,
        )
        exp_count_query = select(func.count()).where(
            Answer.question_id == question_id,
            Answer.is_professional.is_(False),
            Answer.status == ContentStatus.PUBLISHED,
        )
        professional_count = (await db.execute(pro_count_query)).scalar() or 0
        experience_count = (await db.execute(exp_count_query)).scalar() or 0

        image_urls = json.loads(question.image_urls) if question.image_urls else []

        return QuestionDetail(
            id=question.id,
            title=question.title,
            content=question.content,
            content_preview=question.content[:100] + "..."
            if len(question.content) > 100
            else question.content,
            channel=question.channel,
            status=question.status,
            author=self._build_author_info(question.author),
            tags=[self._build_tag_info(t) for t in question.tags],
            image_urls=image_urls,
            view_count=question.view_count,
            answer_count=question.answer_count,
            like_count=question.like_count,
            collection_count=question.collection_count,
            is_pinned=question.is_pinned,
            is_featured=question.is_featured,
            has_accepted_answer=question.accepted_answer_id is not None,
            accepted_answer_id=question.accepted_answer_id,
            is_liked=is_liked,
            is_collected=is_collected,
            professional_answer_count=professional_count,
            experience_answer_count=experience_count,
            created_at=question.created_at,
            updated_at=question.updated_at,
            published_at=question.published_at,
        )

    async def create_question(
        self,
        db: AsyncSession,
        question_in: QuestionCreate,
        author: User,
    ) -> Question:
        """Create a new question with moderation."""
        # Content moderation
        decision = await self._moderation.moderate_text(question_in.content, author.id)

        if decision.result == ModerationResult.REJECTED:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": f"内容审核未通过: {decision.reason}",
                    "categories": [c.value for c in decision.categories],
                    "crisis_intervention": decision.crisis_intervention,
                },
            )

        # Determine initial status
        if decision.result == ModerationResult.PASSED:
            status = ContentStatus.PUBLISHED
            published_at = datetime.utcnow()
        else:  # NEED_MANUAL_REVIEW
            status = ContentStatus.PENDING_REVIEW
            published_at = None

        # Create question
        question = Question(
            author_id=author.id,
            title=question_in.title,
            content=question_in.content,
            channel=question_in.channel,
            status=status,
            published_at=published_at,
            image_urls=json.dumps(question_in.image_urls)
            if question_in.image_urls
            else None,
        )
        db.add(question)
        await db.flush()

        # Associate tags
        if question_in.tag_ids:
            for tag_id in question_in.tag_ids:
                db.add(QuestionTag(question_id=question.id, tag_id=tag_id))
                # Update tag question count
                await db.execute(
                    update(Tag)
                    .where(Tag.id == tag_id)
                    .values(question_count=Tag.question_count + 1)
                )

        # Log moderation result
        db.add(
            ModerationLog(
                target_type="question",
                target_id=question.id,
                moderation_type="auto",
                result=decision.result,
                sensitive_categories=(
                    json.dumps([c.value for c in decision.categories])
                    if decision.categories
                    else None
                ),
                confidence_score=decision.confidence,
                reason=decision.reason,
            )
        )

        await db.commit()
        await db.refresh(question)
        return question

    # ==================== Answer Operations ====================

    async def get_answers(
        self,
        db: AsyncSession,
        question_id: str,
        is_professional: bool | None = None,
        sort_by: Literal["created_at", "like_count"] = "created_at",
        order: Literal["asc", "desc"] = "desc",
        page: int = 1,
        page_size: int = 20,
        current_user_id: str | None = None,
    ) -> PaginatedResponse[AnswerListItem]:
        """Get paginated list of answers for a question."""
        query = (
            select(Answer)
            .options(selectinload(Answer.author).selectinload(User.certification))
            .where(Answer.question_id == question_id)
            .where(Answer.status == ContentStatus.PUBLISHED)
        )

        if is_professional is not None:
            query = query.where(Answer.is_professional == is_professional)

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar() or 0

        # Sort
        sort_column = getattr(Answer, sort_by)
        if order == "desc":
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())

        # Paginate
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await db.execute(query)
        answers = result.scalars().all()

        items = []
        for a in answers:
            items.append(
                AnswerListItem(
                    id=a.id,
                    question_id=a.question_id,
                    author=self._build_author_info(a.author),
                    content_preview=a.content[:200] + "..."
                    if len(a.content) > 200
                    else a.content,
                    is_professional=a.is_professional,
                    is_accepted=a.is_accepted,
                    like_count=a.like_count,
                    comment_count=a.comment_count,
                    created_at=a.created_at,
                )
            )

        return PaginatedResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=(total + page_size - 1) // page_size,
        )

    async def create_answer(
        self,
        db: AsyncSession,
        question_id: str,
        answer_in: AnswerCreate,
        author: User,
    ) -> Answer:
        """Create a new answer with moderation and permission check."""
        # Get question to check channel
        question = await db.get(Question, question_id)
        if not question:
            raise HTTPException(status_code=404, detail="问题不存在")

        # Check permission for professional channel
        if question.channel == ChannelType.PROFESSIONAL:
            if not self.is_certified_professional(author):
                raise HTTPException(
                    status_code=403, detail="专业频道仅限认证专业人士回答"
                )

        # Content moderation
        decision = await self._moderation.moderate_text(answer_in.content, author.id)

        if decision.result == ModerationResult.REJECTED:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": f"内容审核未通过: {decision.reason}",
                    "categories": [c.value for c in decision.categories],
                    "crisis_intervention": decision.crisis_intervention,
                },
            )

        # Determine status and professional flag
        status = (
            ContentStatus.PUBLISHED
            if decision.result == ModerationResult.PASSED
            else ContentStatus.PENDING_REVIEW
        )
        is_professional = self.is_certified_professional(author)

        # Create answer
        answer = Answer(
            question_id=question_id,
            author_id=author.id,
            content=answer_in.content,
            author_role=author.role,
            is_professional=is_professional,
            status=status,
            image_urls=json.dumps(answer_in.image_urls)
            if answer_in.image_urls
            else None,
        )
        db.add(answer)

        # Update question answer count
        await db.execute(
            update(Question)
            .where(Question.id == question_id)
            .values(answer_count=Question.answer_count + 1)
        )

        # Log moderation
        await db.flush()
        db.add(
            ModerationLog(
                target_type="answer",
                target_id=answer.id,
                moderation_type="auto",
                result=decision.result,
                sensitive_categories=(
                    json.dumps([c.value for c in decision.categories])
                    if decision.categories
                    else None
                ),
                confidence_score=decision.confidence,
                reason=decision.reason,
            )
        )

        await db.commit()
        await db.refresh(answer)
        return answer

    # ==================== Like Operations ====================

    async def toggle_like(
        self,
        db: AsyncSession,
        user_id: str,
        target_type: Literal["question", "answer", "comment"],
        target_id: str,
    ) -> tuple[bool, int]:
        """Toggle like status. Returns (is_liked, new_count)."""
        # Check existing like
        query = select(Like).where(
            Like.user_id == user_id,
            Like.target_type == target_type,
            Like.target_id == target_id,
        )
        existing = (await db.execute(query)).scalar_one_or_none()

        # Get target model
        model_map = {
            "question": Question,
            "answer": Answer,
            "comment": Comment,
        }
        model = model_map[target_type]

        if existing:
            # Unlike
            await db.delete(existing)
            await db.execute(
                update(model)
                .where(model.id == target_id)  # type: ignore[attr-defined]
                .values(like_count=model.like_count - 1)  # type: ignore[attr-defined]
            )
            await db.commit()

            # Get new count
            target = await db.get(model, target_id)
            return False, target.like_count if target else 0  # type: ignore[attr-defined]
        else:
            # Like
            db.add(
                Like(
                    user_id=user_id,
                    target_type=target_type,
                    target_id=target_id,
                )
            )
            await db.execute(
                update(model)
                .where(model.id == target_id)  # type: ignore[attr-defined]
                .values(like_count=model.like_count + 1)  # type: ignore[attr-defined]
            )
            await db.commit()

            target = await db.get(model, target_id)
            return True, target.like_count if target else 1  # type: ignore[attr-defined]

    # ==================== Collection Operations ====================

    async def toggle_collection(
        self,
        db: AsyncSession,
        user_id: str,
        question_id: str,
        folder_name: str | None = None,
        note: str | None = None,
    ) -> tuple[bool, int]:
        """Toggle collection status. Returns (is_collected, new_count)."""
        query = select(Collection).where(
            Collection.user_id == user_id,
            Collection.question_id == question_id,
        )
        existing = (await db.execute(query)).scalar_one_or_none()

        if existing:
            # Uncollect
            await db.delete(existing)
            await db.execute(
                update(Question)
                .where(Question.id == question_id)
                .values(collection_count=Question.collection_count - 1)
            )
            await db.commit()

            question = await db.get(Question, question_id)
            return False, question.collection_count if question else 0
        else:
            # Collect
            db.add(
                Collection(
                    user_id=user_id,
                    question_id=question_id,
                    folder_name=folder_name,
                    note=note,
                )
            )
            await db.execute(
                update(Question)
                .where(Question.id == question_id)
                .values(collection_count=Question.collection_count + 1)
            )
            await db.commit()

            question = await db.get(Question, question_id)
            return True, question.collection_count if question else 1


# Singleton pattern
_community_service: CommunityService | None = None


def get_community_service() -> CommunityService:
    """Get CommunityService singleton instance."""
    global _community_service
    if _community_service is None:
        _community_service = CommunityService()
    return _community_service
