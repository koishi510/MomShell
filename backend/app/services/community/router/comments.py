"""Comment routes for community module."""

import asyncio

from fastapi import APIRouter

from ..ai_reply import trigger_ai_reply_to_ai_content, trigger_ai_reply_to_comment
from ..dependencies import (
    CommunityServiceDep,
    CurrentUser,
    DbSession,
    OptionalUser,
)
from ..enums import UserRole
from ..models import Answer, Comment
from ..schemas import CommentCreate, CommentListItem

router = APIRouter(tags=["Community - Comments"])


@router.get("/answers/{answer_id}/comments", response_model=list[CommentListItem])
async def list_comments(
    answer_id: str,
    db: DbSession,
    service: CommunityServiceDep,
    current_user: OptionalUser,
) -> list[CommentListItem]:
    """Get comments for an answer."""
    user_id = current_user.id if current_user else None
    return await service.get_comments(db, answer_id, user_id)


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
    """Create a new comment on an answer."""
    result = await service.create_comment(db, answer_id, current_user, comment_in)

    # Skip AI reply logic if the commenter is AI
    if current_user.role == UserRole.AI_ASSISTANT:
        return result

    # Save to user's chat memory
    from app.services.chat.service import save_community_interaction

    content_preview = (
        comment_in.content[:50] + "..."
        if len(comment_in.content) > 50
        else comment_in.content
    )
    interaction = f"评论：{content_preview}"
    asyncio.create_task(save_community_interaction(current_user.id, interaction))

    # Trigger AI reply if comment mentions @贝壳姐姐
    if "@贝壳姐姐" in comment_in.content:
        await trigger_ai_reply_to_comment(result.id, answer_id)
        return result

    # Check if commenting on AI's answer or replying to AI's comment
    # Get the answer to check its author
    answer = await db.get(Answer, answer_id)
    if answer and answer.author_role == UserRole.AI_ASSISTANT:
        # Commenting on AI's answer
        await trigger_ai_reply_to_ai_content(result.id, answer_id, comment_in.parent_id)
    elif comment_in.parent_id:
        # Check if replying to AI's comment
        parent_comment = await db.get(Comment, comment_in.parent_id)
        if parent_comment:
            from ..models import User

            parent_author = await db.get(User, parent_comment.author_id)
            if parent_author and parent_author.role == UserRole.AI_ASSISTANT:
                await trigger_ai_reply_to_ai_content(
                    result.id, answer_id, comment_in.parent_id
                )

    return result


@router.delete("/comments/{comment_id}", status_code=204)
async def delete_comment(
    comment_id: str,
    db: DbSession,
    service: CommunityServiceDep,
    current_user: CurrentUser,
) -> None:
    """Delete a comment (author or admin only)."""
    await service.delete_comment(db, comment_id, current_user)
