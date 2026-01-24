"""Interaction routes (likes, collections) for community module."""

from typing import Literal

from fastapi import APIRouter, Query

from ..dependencies import (
    CommunityServiceDep,
    CurrentUser,
    DbSession,
)
from ..schemas import (
    CollectionCreate,
    CollectionItem,
    LikeCreate,
    LikeDelete,
    LikeStatus,
    PaginatedResponse,
)

router = APIRouter(tags=["Community - Interactions"])


# ==================== Likes ====================


@router.post("/likes", response_model=LikeStatus)
async def create_like(
    like_in: LikeCreate,
    db: DbSession,
    service: CommunityServiceDep,
    current_user: CurrentUser,
) -> LikeStatus:
    """Like a question, answer, or comment."""
    is_liked, like_count = await service.toggle_like(
        db=db,
        user_id=current_user.id,
        target_type=like_in.target_type,
        target_id=like_in.target_id,
    )
    return LikeStatus(is_liked=is_liked, like_count=like_count)


@router.delete("/likes", response_model=LikeStatus)
async def delete_like(
    like_in: LikeDelete,
    db: DbSession,
    service: CommunityServiceDep,
    current_user: CurrentUser,
) -> LikeStatus:
    """Unlike a question, answer, or comment."""
    is_liked, like_count = await service.toggle_like(
        db=db,
        user_id=current_user.id,
        target_type=like_in.target_type,
        target_id=like_in.target_id,
    )
    return LikeStatus(is_liked=is_liked, like_count=like_count)


@router.get("/likes/status", response_model=LikeStatus)
async def get_like_status(
    target_type: Literal["question", "answer", "comment"],
    target_id: str,
    db: DbSession,
    service: CommunityServiceDep,
    current_user: CurrentUser,
) -> LikeStatus:
    """Check if current user has liked a target."""
    from sqlalchemy import select

    from ..models import Answer, Comment, Like, Question

    # Check like status
    query = select(Like).where(
        Like.user_id == current_user.id,
        Like.target_type == target_type,
        Like.target_id == target_id,
    )
    like = (await db.execute(query)).scalar_one_or_none()

    # Get like count
    model_map = {
        "question": Question,
        "answer": Answer,
        "comment": Comment,
    }
    model = model_map[target_type]
    target = await db.get(model, target_id)

    return LikeStatus(
        is_liked=like is not None,
        like_count=target.like_count if target else 0,  # type: ignore[attr-defined]
    )


# ==================== Collections ====================


@router.post("/collections", response_model=dict)
async def create_collection(
    collection_in: CollectionCreate,
    db: DbSession,
    service: CommunityServiceDep,
    current_user: CurrentUser,
) -> dict:
    """Collect a question."""
    is_collected, collection_count = await service.toggle_collection(
        db=db,
        user_id=current_user.id,
        question_id=collection_in.question_id,
        folder_name=collection_in.folder_name,
        note=collection_in.note,
    )
    return {
        "is_collected": is_collected,
        "collection_count": collection_count,
    }


@router.delete("/collections/{collection_id}", status_code=204)
async def delete_collection(
    collection_id: str,
    db: DbSession,
    service: CommunityServiceDep,
    current_user: CurrentUser,
) -> None:
    """Remove a collection."""
    from ..models import Collection

    collection = await db.get(Collection, collection_id)
    if not collection:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="收藏不存在")

    if collection.user_id != current_user.id:
        from fastapi import HTTPException

        raise HTTPException(status_code=403, detail="无权操作")

    await service.toggle_collection(
        db=db,
        user_id=current_user.id,
        question_id=collection.question_id,
    )


@router.get("/collections/my", response_model=PaginatedResponse[CollectionItem])
async def list_my_collections(
    db: DbSession,
    service: CommunityServiceDep,
    current_user: CurrentUser,
    folder_name: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PaginatedResponse[CollectionItem]:
    """Get current user's collections."""
    from fastapi import HTTPException

    # TODO: Implement list collections
    raise HTTPException(status_code=501, detail="功能开发中")
