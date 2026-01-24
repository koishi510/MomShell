"""Comment routes for community module."""

from fastapi import APIRouter, HTTPException, Query

from ..dependencies import (
    CommunityServiceDep,
    CurrentUser,
    DbSession,
    OptionalUser,
)
from ..schemas import CommentCreate, CommentListItem

router = APIRouter(tags=["Community - Comments"])


@router.get("/answers/{answer_id}/comments", response_model=list[CommentListItem])
async def list_comments(
    answer_id: str,
    db: DbSession,
    service: CommunityServiceDep,
    current_user: OptionalUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
) -> list[CommentListItem]:
    """Get comments for an answer."""
    # TODO: Implement list comments
    raise HTTPException(status_code=501, detail="功能开发中")


@router.post(
    "/answers/{answer_id}/comments",
    response_model=CommentListItem,
    status_code=201,
)
async def create_comment(
    answer_id: str,
    comment_in: CommentCreate,
    db: DbSession,
    service: CommunityServiceDep,
    current_user: CurrentUser,
) -> CommentListItem:
    """Create a new comment."""
    # TODO: Implement create comment
    raise HTTPException(status_code=501, detail="功能开发中")


@router.delete("/comments/{comment_id}", status_code=204)
async def delete_comment(
    comment_id: str,
    db: DbSession,
    service: CommunityServiceDep,
    current_user: CurrentUser,
) -> None:
    """Delete a comment (author or admin only)."""
    raise HTTPException(status_code=501, detail="功能开发中")
