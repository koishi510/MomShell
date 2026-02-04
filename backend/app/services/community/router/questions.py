"""Question routes for community module."""

from typing import Literal

from fastapi import APIRouter, HTTPException, Query

from ..ai_reply import trigger_ai_reply_to_question
from ..dependencies import (
    CommunityServiceDep,
    CurrentUser,
    DbSession,
    OptionalUser,
)
from ..enums import ChannelType
from ..schemas import (
    PaginatedResponse,
    QuestionCreate,
    QuestionDetail,
    QuestionListItem,
    QuestionUpdate,
)

router = APIRouter(prefix="/questions", tags=["Community - Questions"])


@router.get("", response_model=PaginatedResponse[QuestionListItem])
async def list_questions(
    db: DbSession,
    service: CommunityServiceDep,
    current_user: OptionalUser,
    channel: ChannelType | None = None,
    tag_id: str | None = None,
    sort_by: Literal[
        "created_at", "view_count", "answer_count", "like_count"
    ] = "created_at",
    order: Literal["asc", "desc"] = "desc",
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PaginatedResponse[QuestionListItem]:
    """Get paginated list of questions."""
    return await service.get_questions(
        db=db,
        channel=channel,
        tag_id=tag_id,
        sort_by=sort_by,
        order=order,
        page=page,
        page_size=page_size,
        current_user_id=current_user.id if current_user else None,
    )


@router.get("/hot", response_model=PaginatedResponse[QuestionListItem])
async def list_hot_questions(
    db: DbSession,
    service: CommunityServiceDep,
    current_user: OptionalUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PaginatedResponse[QuestionListItem]:
    """Get hot questions sorted by view count."""
    return await service.get_questions(
        db=db,
        sort_by="view_count",
        order="desc",
        page=page,
        page_size=page_size,
        current_user_id=current_user.id if current_user else None,
    )


@router.get("/channel/{channel}", response_model=PaginatedResponse[QuestionListItem])
async def list_questions_by_channel(
    channel: ChannelType,
    db: DbSession,
    service: CommunityServiceDep,
    current_user: OptionalUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PaginatedResponse[QuestionListItem]:
    """Get questions by channel."""
    return await service.get_questions(
        db=db,
        channel=channel,
        page=page,
        page_size=page_size,
        current_user_id=current_user.id if current_user else None,
    )


@router.get("/{question_id}", response_model=QuestionDetail)
async def get_question(
    question_id: str,
    db: DbSession,
    service: CommunityServiceDep,
    current_user: OptionalUser,
) -> QuestionDetail:
    """Get question detail by ID."""
    question = await service.get_question(
        db=db,
        question_id=question_id,
        current_user_id=current_user.id if current_user else None,
    )
    if not question:
        raise HTTPException(status_code=404, detail="问题不存在")
    return question


@router.post("", response_model=QuestionDetail, status_code=201)
async def create_question(
    question_in: QuestionCreate,
    db: DbSession,
    service: CommunityServiceDep,
    current_user: CurrentUser,
) -> QuestionDetail:
    """Create a new question."""
    question = await service.create_question(db, question_in, current_user)

    # Trigger AI auto-reply in background
    await trigger_ai_reply_to_question(question.id)

    # Return full detail
    detail = await service.get_question(
        db=db,
        question_id=question.id,
        current_user_id=current_user.id,
        increment_view=False,
    )
    if not detail:
        raise HTTPException(status_code=500, detail="创建问题失败")
    return detail


@router.put("/{question_id}", response_model=QuestionDetail)
async def update_question(
    question_id: str,
    question_in: QuestionUpdate,
    db: DbSession,
    service: CommunityServiceDep,
    current_user: CurrentUser,
) -> QuestionDetail:
    """Update a question (author or admin only)."""
    await service.update_question(db, question_id, question_in, current_user)

    # Return full detail
    detail = await service.get_question(
        db=db,
        question_id=question_id,
        current_user_id=current_user.id,
        increment_view=False,
    )
    if not detail:
        raise HTTPException(status_code=500, detail="更新问题失败")
    return detail


@router.delete("/{question_id}", status_code=204)
async def delete_question(
    question_id: str,
    db: DbSession,
    service: CommunityServiceDep,
    current_user: CurrentUser,
) -> None:
    """Delete a question (author or admin only)."""
    await service.delete_question(db, question_id, current_user)


@router.post("/{question_id}/accept/{answer_id}", status_code=200)
async def accept_answer(
    question_id: str,
    answer_id: str,
    db: DbSession,
    service: CommunityServiceDep,
    current_user: CurrentUser,
) -> dict:
    """Accept an answer (question author only)."""
    # TODO: Implement accept logic
    raise HTTPException(status_code=501, detail="功能开发中")
