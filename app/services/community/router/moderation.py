"""Moderation routes for community module."""

from fastapi import APIRouter, HTTPException, Query

from ..dependencies import AdminUser, DbSession
from ..enums import ContentStatus, ModerationResult
from ..schemas import PaginatedResponse

router = APIRouter(prefix="/moderation", tags=["Community - Moderation"])


@router.get("/pending")
async def list_pending_content(
    db: DbSession,
    admin: AdminUser,
    content_type: str | None = None,  # question, answer, comment
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> dict:
    """Get list of content pending moderation (admin only)."""
    from sqlalchemy import select, func
    from ..models import Question, Answer, Comment

    items = []

    # Get pending questions
    if content_type is None or content_type == "question":
        query = select(Question).where(Question.status == ContentStatus.PENDING_REVIEW)
        result = await db.execute(query)
        questions = result.scalars().all()
        for q in questions:
            items.append({
                "type": "question",
                "id": q.id,
                "author_id": q.author_id,
                "title": q.title,
                "content_preview": q.content[:200] if q.content else "",
                "created_at": q.created_at.isoformat(),
            })

    # Get pending answers
    if content_type is None or content_type == "answer":
        query = select(Answer).where(Answer.status == ContentStatus.PENDING_REVIEW)
        result = await db.execute(query)
        answers = result.scalars().all()
        for a in answers:
            items.append({
                "type": "answer",
                "id": a.id,
                "author_id": a.author_id,
                "question_id": a.question_id,
                "content_preview": a.content[:200] if a.content else "",
                "created_at": a.created_at.isoformat(),
            })

    # Get pending comments
    if content_type is None or content_type == "comment":
        query = select(Comment).where(Comment.status == ContentStatus.PENDING_REVIEW)
        result = await db.execute(query)
        comments = result.scalars().all()
        for c in comments:
            items.append({
                "type": "comment",
                "id": c.id,
                "author_id": c.author_id,
                "answer_id": c.answer_id,
                "content_preview": c.content[:200] if c.content else "",
                "created_at": c.created_at.isoformat(),
            })

    # Sort by created_at
    items.sort(key=lambda x: x["created_at"], reverse=True)

    # Paginate
    total = len(items)
    start = (page - 1) * page_size
    end = start + page_size
    paginated_items = items[start:end]

    return {
        "items": paginated_items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("/{content_type}/{content_id}/approve")
async def approve_content(
    content_type: str,
    content_id: str,
    db: DbSession,
    admin: AdminUser,
) -> dict:
    """Approve pending content (admin only)."""
    from datetime import datetime
    import json
    from ..models import Question, Answer, Comment, ModerationLog

    model_map = {
        "question": Question,
        "answer": Answer,
        "comment": Comment,
    }

    if content_type not in model_map:
        raise HTTPException(status_code=400, detail="无效的内容类型")

    model = model_map[content_type]
    content = await db.get(model, content_id)

    if not content:
        raise HTTPException(status_code=404, detail="内容不存在")

    if content.status != ContentStatus.PENDING_REVIEW:
        raise HTTPException(status_code=400, detail="内容不在待审核状态")

    # Update status
    content.status = ContentStatus.PUBLISHED
    if hasattr(content, "published_at"):
        content.published_at = datetime.utcnow()

    # Log moderation
    db.add(
        ModerationLog(
            target_type=content_type,
            target_id=content_id,
            moderation_type="manual",
            result=ModerationResult.PASSED,
            reviewer_id=admin.id,
        )
    )

    await db.commit()

    return {"status": "approved", "content_type": content_type, "content_id": content_id}


@router.post("/{content_type}/{content_id}/reject")
async def reject_content(
    content_type: str,
    content_id: str,
    reason: str | None = None,
    db: DbSession = None,
    admin: AdminUser = None,
) -> dict:
    """Reject pending content (admin only)."""
    import json
    from ..models import Question, Answer, Comment, ModerationLog

    model_map = {
        "question": Question,
        "answer": Answer,
        "comment": Comment,
    }

    if content_type not in model_map:
        raise HTTPException(status_code=400, detail="无效的内容类型")

    model = model_map[content_type]
    content = await db.get(model, content_id)

    if not content:
        raise HTTPException(status_code=404, detail="内容不存在")

    if content.status != ContentStatus.PENDING_REVIEW:
        raise HTTPException(status_code=400, detail="内容不在待审核状态")

    # Update status
    content.status = ContentStatus.HIDDEN

    # Log moderation
    db.add(
        ModerationLog(
            target_type=content_type,
            target_id=content_id,
            moderation_type="manual",
            result=ModerationResult.REJECTED,
            reason=reason,
            original_content=content.content if hasattr(content, "content") else None,
            reviewer_id=admin.id,
        )
    )

    await db.commit()

    return {"status": "rejected", "content_type": content_type, "content_id": content_id}


@router.get("/logs")
async def list_moderation_logs(
    db: DbSession,
    admin: AdminUser,
    content_type: str | None = None,
    result: ModerationResult | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> dict:
    """Get moderation logs (admin only)."""
    from sqlalchemy import select, func
    from ..models import ModerationLog

    query = select(ModerationLog)

    if content_type:
        query = query.where(ModerationLog.target_type == content_type)

    if result:
        query = query.where(ModerationLog.result == result)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Order and paginate
    query = query.order_by(ModerationLog.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    db_result = await db.execute(query)
    logs = db_result.scalars().all()

    items = [
        {
            "id": log.id,
            "target_type": log.target_type,
            "target_id": log.target_id,
            "moderation_type": log.moderation_type,
            "result": log.result.value,
            "sensitive_categories": log.sensitive_categories,
            "confidence_score": log.confidence_score,
            "reason": log.reason,
            "reviewer_id": log.reviewer_id,
            "created_at": log.created_at.isoformat(),
        }
        for log in logs
    ]

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }
