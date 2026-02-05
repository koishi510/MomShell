"""Answer routes for community module."""

import asyncio
from typing import Literal

from fastapi import APIRouter, HTTPException, Query

from ..ai_reply import trigger_ai_comment_on_answer
from ..dependencies import (
    CommunityServiceDep,
    CurrentUser,
    DbSession,
    OptionalUser,
)
from ..enums import UserRole
from ..models import Question
from ..schemas import (
    AnswerCreate,
    AnswerDetail,
    AnswerListItem,
    AnswerUpdate,
    PaginatedResponse,
)

router = APIRouter(tags=["Community - Answers"])


@router.get(
    "/questions/{question_id}/answers",
    response_model=PaginatedResponse[AnswerListItem],
)
async def list_answers(
    question_id: str,
    db: DbSession,
    service: CommunityServiceDep,
    current_user: OptionalUser,
    is_professional: bool | None = None,
    sort_by: Literal["created_at", "like_count"] = "created_at",
    order: Literal["asc", "desc"] = "desc",
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PaginatedResponse[AnswerListItem]:
    """Get paginated list of answers for a question."""
    return await service.get_answers(
        db=db,
        question_id=question_id,
        is_professional=is_professional,
        sort_by=sort_by,
        order=order,
        page=page,
        page_size=page_size,
        current_user_id=current_user.id if current_user else None,
    )


@router.get(
    "/answers/professional/{question_id}",
    response_model=PaginatedResponse[AnswerListItem],
)
async def list_professional_answers(
    question_id: str,
    db: DbSession,
    service: CommunityServiceDep,
    current_user: OptionalUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PaginatedResponse[AnswerListItem]:
    """Get professional answers for a question."""
    return await service.get_answers(
        db=db,
        question_id=question_id,
        is_professional=True,
        page=page,
        page_size=page_size,
        current_user_id=current_user.id if current_user else None,
    )


@router.get(
    "/answers/experience/{question_id}",
    response_model=PaginatedResponse[AnswerListItem],
)
async def list_experience_answers(
    question_id: str,
    db: DbSession,
    service: CommunityServiceDep,
    current_user: OptionalUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PaginatedResponse[AnswerListItem]:
    """Get experience answers for a question."""
    return await service.get_answers(
        db=db,
        question_id=question_id,
        is_professional=False,
        page=page,
        page_size=page_size,
        current_user_id=current_user.id if current_user else None,
    )


@router.post(
    "/questions/{question_id}/answers",
    response_model=AnswerDetail,
    status_code=201,
)
async def create_answer(
    question_id: str,
    answer_in: AnswerCreate,
    db: DbSession,
    service: CommunityServiceDep,
    current_user: CurrentUser,
) -> AnswerDetail:
    """Create a new answer."""
    answer = await service.create_answer(db, question_id, answer_in, current_user)

    # Only trigger AI reply if @贝壳姐姐 is mentioned
    # Regular answers to posts do NOT trigger AI reply
    if current_user.role != UserRole.AI_ASSISTANT:
        if "@贝壳姐姐" in answer_in.content:
            # Reply as a comment inside this person's answer floor
            await trigger_ai_comment_on_answer(answer.id, question_id)

        # Save to user's chat memory
        from app.services.chat.service import save_community_interaction

        question = await db.get(Question, question_id)
        question_title = question.title if question else "未知问题"
        content_preview = (
            answer_in.content[:50] + "..."
            if len(answer_in.content) > 50
            else answer_in.content
        )
        interaction = f"回复问题《{question_title}》：{content_preview}"
        asyncio.create_task(save_community_interaction(current_user.id, interaction))

    # Build response
    import json

    from ..schemas import AuthorInfo

    return AnswerDetail(
        id=answer.id,
        question_id=answer.question_id,
        author=AuthorInfo(
            id=current_user.id,
            nickname=current_user.nickname,
            avatar_url=current_user.avatar_url,
            role=current_user.role,
            is_certified=service.is_certified_professional(current_user),
        ),
        content=answer.content,
        image_urls=json.loads(answer.image_urls) if answer.image_urls else [],
        author_role=answer.author_role,
        is_professional=answer.is_professional,
        is_accepted=answer.is_accepted,
        status=answer.status,
        like_count=answer.like_count,
        comment_count=answer.comment_count,
        is_liked=False,
        created_at=answer.created_at,
        updated_at=answer.updated_at,
    )


@router.get("/answers/{answer_id}", response_model=AnswerDetail)
async def get_answer(
    answer_id: str,
    db: DbSession,
    service: CommunityServiceDep,
    current_user: OptionalUser,
) -> AnswerDetail:
    """Get answer detail by ID."""
    # TODO: Implement get answer detail
    raise HTTPException(status_code=501, detail="功能开发中")


@router.put("/answers/{answer_id}", response_model=AnswerDetail)
async def update_answer(
    answer_id: str,
    answer_in: AnswerUpdate,
    db: DbSession,
    service: CommunityServiceDep,
    current_user: CurrentUser,
) -> AnswerDetail:
    """Update an answer (author or admin only)."""
    import json

    from ..schemas import AuthorInfo

    answer = await service.update_answer(db, answer_id, answer_in, current_user)

    # Build response
    return AnswerDetail(
        id=answer.id,
        question_id=answer.question_id,
        author=AuthorInfo(
            id=answer.author.id,
            nickname=answer.author.nickname,
            avatar_url=answer.author.avatar_url,
            role=answer.author.role,
            is_certified=service.is_certified_professional(answer.author),
        ),
        content=answer.content,
        image_urls=json.loads(answer.image_urls) if answer.image_urls else [],
        author_role=answer.author_role,
        is_professional=answer.is_professional,
        is_accepted=answer.is_accepted,
        status=answer.status,
        like_count=answer.like_count,
        comment_count=answer.comment_count,
        is_liked=False,
        created_at=answer.created_at,
        updated_at=answer.updated_at,
    )


@router.delete("/answers/{answer_id}", status_code=204)
async def delete_answer(
    answer_id: str,
    db: DbSession,
    service: CommunityServiceDep,
    current_user: CurrentUser,
) -> None:
    """Delete an answer (author, question author, or admin only)."""
    await service.delete_answer(db, answer_id, current_user)
