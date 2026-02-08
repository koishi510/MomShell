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
    UserRole,
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
    AnswerUpdate,
    AuthorInfo,
    CollectionItem,
    CommentCreate,
    CommentListItem,
    MyAnswerListItem,
    MyQuestionListItem,
    PaginatedResponse,
    QuestionBrief,
    QuestionCreate,
    QuestionDetail,
    QuestionListItem,
    QuestionUpdate,
    TagInfo,
    UserProfile,
    UserProfileUpdate,
    UserStats,
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

        # Get user's likes and collections for these questions if logged in
        liked_question_ids: set[str] = set()
        collected_question_ids: set[str] = set()
        if current_user_id and questions:
            question_ids = [q.id for q in questions]
            # Query likes
            like_query = select(Like.target_id).where(
                Like.user_id == current_user_id,
                Like.target_type == "question",
                Like.target_id.in_(question_ids),
            )
            like_result = await db.execute(like_query)
            liked_question_ids = set(like_result.scalars().all())
            # Query collections
            collection_query = select(Collection.question_id).where(
                Collection.user_id == current_user_id,
                Collection.question_id.in_(question_ids),
            )
            collection_result = await db.execute(collection_query)
            collected_question_ids = set(collection_result.scalars().all())

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
                    tags=[self._build_tag_info(t) for t in (q.tags or [])],
                    view_count=q.view_count,
                    answer_count=q.answer_count,
                    like_count=q.like_count,
                    collection_count=q.collection_count,
                    is_pinned=q.is_pinned,
                    is_featured=q.is_featured,
                    has_accepted_answer=q.accepted_answer_id is not None,
                    is_liked=q.id in liked_question_ids,
                    is_collected=q.id in collected_question_ids,
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
            await db.refresh(question)

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
            tags=[self._build_tag_info(t) for t in (question.tags or [])],
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

        # Get user's likes for these answers if logged in
        liked_answer_ids: set[str] = set()
        if current_user_id:
            answer_ids = [a.id for a in answers]
            like_query = select(Like.target_id).where(
                Like.user_id == current_user_id,
                Like.target_type == "answer",
                Like.target_id.in_(answer_ids),
            )
            like_result = await db.execute(like_query)
            liked_answer_ids = set(like_result.scalars().all())

        items = []
        for a in answers:
            items.append(
                AnswerListItem(
                    id=a.id,
                    question_id=a.question_id,
                    author=self._build_author_info(a.author),
                    content=a.content,
                    content_preview=a.content[:200] + "..."
                    if len(a.content) > 200
                    else a.content,
                    is_professional=a.is_professional,
                    is_accepted=a.is_accepted,
                    like_count=a.like_count,
                    comment_count=a.comment_count,
                    is_liked=a.id in liked_answer_ids,
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
            is_author = question.author_id == author.id
            if (
                not self.is_certified_professional(author)
                and author.role != UserRole.ADMIN
                and not is_author
            ):
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

    async def get_user_collections(
        self,
        db: AsyncSession,
        user_id: str,
        folder_name: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> PaginatedResponse[CollectionItem]:
        """Get user's collections."""
        # Build query
        query = (
            select(Collection)
            .options(
                selectinload(Collection.question)
                .selectinload(Question.author)
                .selectinload(User.certification)
            )
            .options(selectinload(Collection.question).selectinload(Question.tags))
            .where(Collection.user_id == user_id)
            .order_by(Collection.created_at.desc())
        )

        if folder_name:
            query = query.where(Collection.folder_name == folder_name)

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar() or 0

        # Paginate
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await db.execute(query)
        collections = result.scalars().all()

        # Get question IDs to check likes
        question_ids = [c.question.id for c in collections if c.question]

        # Query liked question IDs for current user
        liked_ids: set[str] = set()
        if question_ids:
            like_query = select(Like.target_id).where(
                Like.user_id == user_id,
                Like.target_type == "question",
                Like.target_id.in_(question_ids),
            )
            like_result = await db.execute(like_query)
            liked_ids = {row[0] for row in like_result.fetchall()}

        # Build response
        items = []
        for c in collections:
            if c.question:
                items.append(
                    CollectionItem(
                        id=c.id,
                        question=QuestionListItem(
                            id=c.question.id,
                            title=c.question.title,
                            content_preview=c.question.content[:100] + "..."
                            if len(c.question.content) > 100
                            else c.question.content,
                            channel=c.question.channel,
                            author=self._build_author_info(c.question.author),
                            tags=[
                                self._build_tag_info(t) for t in (c.question.tags or [])
                            ],
                            view_count=c.question.view_count,
                            answer_count=c.question.answer_count,
                            like_count=c.question.like_count,
                            collection_count=c.question.collection_count,
                            is_pinned=c.question.is_pinned,
                            is_featured=c.question.is_featured,
                            has_accepted_answer=c.question.accepted_answer_id
                            is not None,
                            is_liked=c.question.id in liked_ids,
                            is_collected=True,  # User has this in collection
                            created_at=c.question.created_at,
                        ),
                        folder_name=c.folder_name,
                        note=c.note,
                        created_at=c.created_at,
                    )
                )

        return PaginatedResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=(total + page_size - 1) // page_size,
        )

    # ==================== Comment Operations ====================

    async def get_comments(
        self,
        db: AsyncSession,
        answer_id: str,
        user_id: str | None = None,
    ) -> list[CommentListItem]:
        """Get comments for an answer with flat replies (max 1 level nesting)."""
        # First check if answer exists
        answer = await db.get(Answer, answer_id)
        if not answer:
            raise HTTPException(status_code=404, detail="回答不存在")

        # Get all comments for this answer with author.certification eagerly loaded
        query = (
            select(Comment)
            .options(
                selectinload(Comment.author).selectinload(User.certification),
                selectinload(Comment.reply_to_user).selectinload(User.certification),
            )
            .where(
                Comment.answer_id == answer_id,
                Comment.status == ContentStatus.PUBLISHED,
            )
            .order_by(Comment.created_at.asc())
        )
        result = await db.execute(query)
        comments = result.scalars().all()

        # Get user's likes for these comments
        liked_comment_ids: set[str] = set()
        if user_id and comments:
            comment_ids = [c.id for c in comments]
            like_query = select(Like.target_id).where(
                Like.user_id == user_id,
                Like.target_type == "comment",
                Like.target_id.in_(comment_ids),
            )
            like_result = await db.execute(like_query)
            liked_comment_ids = set(like_result.scalars().all())

        # Build flat structure with max 1 level nesting
        # Root comments (no parent_id) are at level 0
        # All replies (with parent_id) are at level 1, shown under their root ancestor
        comment_map: dict[str, Comment] = {c.id: c for c in comments}
        root_comments: list[CommentListItem] = []
        root_comment_items: dict[str, CommentListItem] = {}

        # Find root ancestor for any comment
        def find_root_id(comment_id: str) -> str | None:
            c = comment_map.get(comment_id)
            if not c:
                return None
            if not c.parent_id:
                return c.id
            return find_root_id(c.parent_id)

        # First pass: create all CommentListItems
        for c in comments:
            if not c.parent_id:
                # Root comment
                item = CommentListItem(
                    id=c.id,
                    answer_id=c.answer_id,
                    author=self._build_author_info(c.author),
                    content=c.content,
                    parent_id=None,
                    reply_to_user=None,
                    like_count=c.like_count,
                    is_liked=c.id in liked_comment_ids,
                    created_at=c.created_at,
                    replies=[],
                )
                root_comments.append(item)
                root_comment_items[c.id] = item

        # Second pass: add all replies to their root ancestor
        for c in comments:
            if c.parent_id:
                root_id = find_root_id(c.id)
                if root_id and root_id in root_comment_items:
                    item = CommentListItem(
                        id=c.id,
                        answer_id=c.answer_id,
                        author=self._build_author_info(c.author),
                        content=c.content,
                        parent_id=root_id,  # Always point to root
                        reply_to_user=self._build_author_info(c.reply_to_user)
                        if c.reply_to_user
                        else None,
                        like_count=c.like_count,
                        is_liked=c.id in liked_comment_ids,
                        created_at=c.created_at,
                        replies=[],  # No further nesting
                    )
                    root_comment_items[root_id].replies.append(item)

        return root_comments

    async def create_comment(
        self,
        db: AsyncSession,
        answer_id: str,
        user: User,
        comment_in: CommentCreate,
    ) -> CommentListItem:
        """Create a new comment on an answer."""
        # Check if answer exists
        answer = await db.get(Answer, answer_id)
        if not answer:
            raise HTTPException(status_code=404, detail="回答不存在")

        # If replying to a comment, verify parent exists
        reply_to_user_id = None
        if comment_in.parent_id:
            parent = await db.get(Comment, comment_in.parent_id)
            if not parent or parent.answer_id != answer_id:
                raise HTTPException(status_code=404, detail="回复目标不存在")
            reply_to_user_id = parent.author_id

        # Run moderation
        moderation_result = await self._moderation.moderate_text(comment_in.content)
        status = (
            ContentStatus.PUBLISHED
            if moderation_result.result == ModerationResult.PASSED
            else ContentStatus.PENDING_REVIEW
        )

        # Create comment
        comment = Comment(
            answer_id=answer_id,
            author_id=user.id,
            parent_id=comment_in.parent_id,
            reply_to_user_id=reply_to_user_id,
            content=comment_in.content,
            status=status,
        )
        db.add(comment)

        # Update answer's comment count
        await db.execute(
            update(Answer)
            .where(Answer.id == answer_id)
            .values(comment_count=Answer.comment_count + 1)
        )

        await db.commit()
        await db.refresh(comment)

        # Reload comment with author and certification eagerly loaded
        comment_query = (
            select(Comment)
            .options(
                selectinload(Comment.author).selectinload(User.certification),
                selectinload(Comment.reply_to_user).selectinload(User.certification),
            )
            .where(Comment.id == comment.id)
        )
        result = await db.execute(comment_query)
        comment = result.scalar_one()

        return CommentListItem(
            id=comment.id,
            answer_id=comment.answer_id,
            author=self._build_author_info(comment.author),
            content=comment.content,
            parent_id=comment.parent_id,
            reply_to_user=self._build_author_info(comment.reply_to_user)
            if comment.reply_to_user
            else None,
            like_count=0,
            is_liked=False,
            created_at=comment.created_at,
            replies=[],
        )

    async def delete_comment(
        self,
        db: AsyncSession,
        comment_id: str,
        user: User,
    ) -> None:
        """Delete a comment (author only)."""
        from .enums import UserRole

        comment = await db.get(Comment, comment_id)
        if not comment:
            raise HTTPException(status_code=404, detail="评论不存在")

        # Check permission
        is_author = comment.author_id == user.id
        is_admin = user.role == UserRole.ADMIN

        if not is_author and not is_admin:
            raise HTTPException(status_code=403, detail="无权删除此评论")

        # Decrease answer's comment count
        await db.execute(
            update(Answer)
            .where(Answer.id == comment.answer_id)
            .values(comment_count=Answer.comment_count - 1)
        )

        # Delete child comments first
        child_query = select(Comment).where(Comment.parent_id == comment_id)
        child_result = await db.execute(child_query)
        children = child_result.scalars().all()
        for child in children:
            await db.delete(child)
            # Decrease count for each child
            await db.execute(
                update(Answer)
                .where(Answer.id == comment.answer_id)
                .values(comment_count=Answer.comment_count - 1)
            )

        await db.delete(comment)
        await db.commit()

    # ==================== Delete Operations ====================

    async def update_question(
        self,
        db: AsyncSession,
        question_id: str,
        question_in: QuestionUpdate,
        user: User,
    ) -> Question:
        """
        Update a question.
        - Author can update their own questions
        - Admin can update any question
        """
        result = await db.execute(
            select(Question)
            .options(selectinload(Question.tags), selectinload(Question.author))
            .where(Question.id == question_id)
        )
        question = result.scalar_one_or_none()

        if not question:
            raise HTTPException(status_code=404, detail="问题不存在")

        # Check permission
        is_author = question.author_id == user.id
        is_admin = user.role == UserRole.ADMIN

        if not is_author and not is_admin:
            raise HTTPException(status_code=403, detail="无权修改此问题")

        # Update fields if provided
        if question_in.title is not None:
            question.title = question_in.title
        if question_in.content is not None:
            # Content moderation for new content
            decision = await self._moderation.moderate_text(
                question_in.content, user.id
            )
            if decision.result == ModerationResult.REJECTED:
                raise HTTPException(
                    status_code=400,
                    detail={
                        "message": f"内容审核未通过: {decision.reason}",
                        "categories": [c.value for c in decision.categories],
                    },
                )
            question.content = question_in.content
            # If content changed, may need re-review
            if decision.result == ModerationResult.NEED_MANUAL_REVIEW:
                question.status = ContentStatus.PENDING_REVIEW

        # Update tags if provided
        if question_in.tag_ids is not None:
            # Remove existing tags
            await db.execute(
                select(QuestionTag).where(QuestionTag.question_id == question_id)
            )
            existing_tags = (
                (
                    await db.execute(
                        select(QuestionTag).where(
                            QuestionTag.question_id == question_id
                        )
                    )
                )
                .scalars()
                .all()
            )
            for qt in existing_tags:
                await db.delete(qt)

            # Add new tags
            for tag_id in question_in.tag_ids:
                tag = await db.get(Tag, tag_id)
                if tag:
                    question_tag = QuestionTag(question_id=question_id, tag_id=tag_id)
                    db.add(question_tag)

        question.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(question)

        return question

    async def update_answer(
        self,
        db: AsyncSession,
        answer_id: str,
        answer_in: AnswerUpdate,
        user: User,
    ) -> Answer:
        """
        Update an answer.
        - Author can update their own answers
        - Admin can update any answer
        """
        result = await db.execute(
            select(Answer)
            .options(selectinload(Answer.author), selectinload(Answer.question))
            .where(Answer.id == answer_id)
        )
        answer = result.scalar_one_or_none()

        if not answer:
            raise HTTPException(status_code=404, detail="回答不存在")

        # Check permission
        is_author = answer.author_id == user.id
        is_admin = user.role == UserRole.ADMIN

        if not is_author and not is_admin:
            raise HTTPException(status_code=403, detail="无权修改此回答")

        # Update content if provided
        if answer_in.content is not None:
            # Content moderation
            decision = await self._moderation.moderate_text(answer_in.content, user.id)
            if decision.result == ModerationResult.REJECTED:
                raise HTTPException(
                    status_code=400,
                    detail={
                        "message": f"内容审核未通过: {decision.reason}",
                        "categories": [c.value for c in decision.categories],
                    },
                )
            answer.content = answer_in.content
            if decision.result == ModerationResult.NEED_MANUAL_REVIEW:
                answer.status = ContentStatus.PENDING_REVIEW

        answer.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(answer)

        return answer

    async def delete_question(
        self,
        db: AsyncSession,
        question_id: str,
        user: User,
    ) -> None:
        """
        Delete a question.
        - Author can delete their own questions
        - Admin can delete any question
        """
        from .enums import UserRole

        question = await db.get(Question, question_id)
        if not question:
            raise HTTPException(status_code=404, detail="问题不存在")

        # Check permission
        is_author = question.author_id == user.id
        is_admin = user.role == UserRole.ADMIN

        if not is_author and not is_admin:
            raise HTTPException(status_code=403, detail="无权删除此问题")

        # Delete related data (answers, likes, collections, etc.)
        # Delete answers for this question
        await db.execute(select(Answer).where(Answer.question_id == question_id))
        answers = (
            (await db.execute(select(Answer).where(Answer.question_id == question_id)))
            .scalars()
            .all()
        )
        for answer in answers:
            await db.delete(answer)

        # Delete likes for this question
        await db.execute(
            select(Like).where(
                Like.target_type == "question", Like.target_id == question_id
            )
        )
        likes = (
            (
                await db.execute(
                    select(Like).where(
                        Like.target_type == "question", Like.target_id == question_id
                    )
                )
            )
            .scalars()
            .all()
        )
        for like in likes:
            await db.delete(like)

        # Delete collections for this question
        collections = (
            (
                await db.execute(
                    select(Collection).where(Collection.question_id == question_id)
                )
            )
            .scalars()
            .all()
        )
        for collection in collections:
            await db.delete(collection)

        # Delete question tags
        await db.execute(
            select(QuestionTag).where(QuestionTag.question_id == question_id)
        )
        tags = (
            (
                await db.execute(
                    select(QuestionTag).where(QuestionTag.question_id == question_id)
                )
            )
            .scalars()
            .all()
        )
        for tag in tags:
            await db.delete(tag)

        # Delete the question
        await db.delete(question)
        await db.commit()

    async def delete_answer(
        self,
        db: AsyncSession,
        answer_id: str,
        user: User,
    ) -> None:
        """
        Delete an answer.
        - Author can delete their own answers
        - Question author can delete answers on their question
        - Admin can delete any answer
        """
        from .enums import UserRole

        result = await db.execute(
            select(Answer)
            .options(selectinload(Answer.question))
            .where(Answer.id == answer_id)
        )
        answer = result.scalar_one_or_none()

        if not answer:
            raise HTTPException(status_code=404, detail="回答不存在")

        # Check permission
        is_answer_author = answer.author_id == user.id
        is_question_author = answer.question.author_id == user.id
        is_admin = user.role == UserRole.ADMIN

        if not is_answer_author and not is_question_author and not is_admin:
            raise HTTPException(status_code=403, detail="无权删除此回答")

        # Update question answer count
        await db.execute(
            update(Question)
            .where(Question.id == answer.question_id)
            .values(answer_count=Question.answer_count - 1)
        )

        # Delete likes for this answer
        likes = (
            (
                await db.execute(
                    select(Like).where(
                        Like.target_type == "answer", Like.target_id == answer_id
                    )
                )
            )
            .scalars()
            .all()
        )
        for like in likes:
            await db.delete(like)

        # Delete the answer
        await db.delete(answer)
        await db.commit()

    # ==================== User Profile Operations ====================

    async def get_user_profile(
        self,
        db: AsyncSession,
        user: User,
    ) -> UserProfile:
        """Get user profile with statistics."""
        from .enums import CertificationStatus

        # Reload user with certification to avoid lazy loading issues
        user_query = (
            select(User)
            .options(selectinload(User.certification))
            .where(User.id == user.id)
        )
        result = await db.execute(user_query)
        user = result.scalar_one()

        # Count questions
        question_count_query = select(func.count()).where(Question.author_id == user.id)
        question_count = (await db.execute(question_count_query)).scalar() or 0

        # Count answers
        answer_count_query = select(func.count()).where(Answer.author_id == user.id)
        answer_count = (await db.execute(answer_count_query)).scalar() or 0

        # Count likes received (on questions and answers)
        question_likes_query = select(func.sum(Question.like_count)).where(
            Question.author_id == user.id
        )
        question_likes = (await db.execute(question_likes_query)).scalar() or 0

        answer_likes_query = select(func.sum(Answer.like_count)).where(
            Answer.author_id == user.id
        )
        answer_likes = (await db.execute(answer_likes_query)).scalar() or 0

        like_received_count = question_likes + answer_likes

        # Count collections
        collection_count_query = select(func.count()).where(
            Collection.user_id == user.id
        )
        collection_count = (await db.execute(collection_count_query)).scalar() or 0

        # Build certification info
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

        return UserProfile(
            id=user.id,
            nickname=user.nickname,
            email=user.email,
            avatar_url=user.avatar_url,
            role=user.role,
            is_certified=is_certified,
            certification_title=certification_title,
            stats=UserStats(
                question_count=question_count,
                answer_count=answer_count,
                like_received_count=like_received_count,
                collection_count=collection_count,
            ),
            created_at=user.created_at,
        )

    async def update_user_profile(
        self,
        db: AsyncSession,
        user: User,
        profile_update: UserProfileUpdate,
    ) -> UserProfile:
        """Update user profile (nickname/avatar/role)."""
        from .enums import FAMILY_ROLES, PROFESSIONAL_ROLES

        if profile_update.nickname is not None:
            user.nickname = profile_update.nickname

        if profile_update.email is not None and profile_update.email != user.email:
            # Check if email is already taken
            existing = await db.execute(
                select(User).where(User.email == profile_update.email)
            )
            if existing.scalar_one_or_none():
                raise HTTPException(status_code=400, detail="该邮箱已被使用")
            user.email = profile_update.email

        if profile_update.avatar_url is not None:
            user.avatar_url = profile_update.avatar_url

        if profile_update.role is not None:
            # Map string to UserRole enum
            role_map = {
                "mom": UserRole.MOM,
                "dad": UserRole.DAD,
                "family": UserRole.FAMILY,
            }
            new_role = role_map.get(profile_update.role)

            if new_role is None or new_role not in FAMILY_ROLES:
                raise HTTPException(
                    status_code=400,
                    detail="角色只能是: mom, dad, family",
                )

            # Certified professionals cannot change their role
            if user.role in PROFESSIONAL_ROLES:
                raise HTTPException(
                    status_code=403,
                    detail="认证专业人员不能修改角色",
                )

            # Admin cannot change their role this way
            if user.role == UserRole.ADMIN:
                raise HTTPException(
                    status_code=403,
                    detail="管理员不能通过此接口修改角色",
                )

            user.role = new_role

        await db.commit()
        await db.refresh(user)

        return await self.get_user_profile(db, user)

    async def get_user_questions(
        self,
        db: AsyncSession,
        user_id: str,
        page: int = 1,
        page_size: int = 20,
    ) -> PaginatedResponse[MyQuestionListItem]:
        """Get questions created by user."""
        query = (
            select(Question)
            .options(selectinload(Question.tags))
            .where(Question.author_id == user_id)
            .order_by(Question.created_at.desc())
        )

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar() or 0

        # Paginate
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await db.execute(query)
        questions = result.scalars().all()

        # Get user's likes and collections for these questions
        liked_question_ids: set[str] = set()
        collected_question_ids: set[str] = set()
        if questions:
            question_ids = [q.id for q in questions]
            # Query likes
            like_query = select(Like.target_id).where(
                Like.user_id == user_id,
                Like.target_type == "question",
                Like.target_id.in_(question_ids),
            )
            like_result = await db.execute(like_query)
            liked_question_ids = set(like_result.scalars().all())
            # Query collections
            collection_query = select(Collection.question_id).where(
                Collection.user_id == user_id,
                Collection.question_id.in_(question_ids),
            )
            collection_result = await db.execute(collection_query)
            collected_question_ids = set(collection_result.scalars().all())

        items = []
        for q in questions:
            items.append(
                MyQuestionListItem(
                    id=q.id,
                    title=q.title,
                    content_preview=q.content[:100] + "..."
                    if len(q.content) > 100
                    else q.content,
                    channel=q.channel.value,
                    tags=[self._build_tag_info(t) for t in (q.tags or [])],
                    view_count=q.view_count,
                    answer_count=q.answer_count,
                    like_count=q.like_count,
                    collection_count=q.collection_count,
                    status=q.status.value,
                    has_accepted_answer=q.accepted_answer_id is not None,
                    is_liked=q.id in liked_question_ids,
                    is_collected=q.id in collected_question_ids,
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

    async def get_user_answers(
        self,
        db: AsyncSession,
        user_id: str,
        page: int = 1,
        page_size: int = 20,
    ) -> PaginatedResponse[MyAnswerListItem]:
        """Get answers created by user with question context."""
        query = (
            select(Answer)
            .options(selectinload(Answer.question))
            .where(Answer.author_id == user_id)
            .order_by(Answer.created_at.desc())
        )

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar() or 0

        # Paginate
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await db.execute(query)
        answers = result.scalars().all()

        # Get user's likes for these answers
        liked_answer_ids: set[str] = set()
        if answers:
            answer_ids = [a.id for a in answers]
            like_query = select(Like.target_id).where(
                Like.user_id == user_id,
                Like.target_type == "answer",
                Like.target_id.in_(answer_ids),
            )
            like_result = await db.execute(like_query)
            liked_answer_ids = set(like_result.scalars().all())

        items = []
        for a in answers:
            items.append(
                MyAnswerListItem(
                    id=a.id,
                    content_preview=a.content[:200] + "..."
                    if len(a.content) > 200
                    else a.content,
                    question=QuestionBrief(
                        id=a.question.id,
                        title=a.question.title,
                        channel=a.question.channel.value,
                    ),
                    is_professional=a.is_professional,
                    is_accepted=a.is_accepted,
                    like_count=a.like_count,
                    comment_count=a.comment_count,
                    status=a.status.value,
                    is_liked=a.id in liked_answer_ids,
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


# Singleton pattern
_community_service: CommunityService | None = None


def get_community_service() -> CommunityService:
    """Get CommunityService singleton instance."""
    global _community_service
    if _community_service is None:
        _community_service = CommunityService()
    return _community_service
