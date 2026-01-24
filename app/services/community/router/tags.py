"""Tag routes for community module."""

from fastapi import APIRouter, HTTPException, Query

from ..dependencies import (
    AdminUser,
    DbSession,
)
from ..schemas import TagCreate, TagDetail, TagListItem, TagUpdate

router = APIRouter(prefix="/tags", tags=["Community - Tags"])


@router.get("/", response_model=list[TagListItem])
async def list_tags(
    db: DbSession,
    is_featured: bool | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
) -> list[TagListItem]:
    """Get list of tags."""
    from sqlalchemy import select

    from ..models import Tag

    query = select(Tag).where(Tag.is_active.is_(True))

    if is_featured is not None:
        query = query.where(Tag.is_featured == is_featured)

    query = query.order_by(Tag.question_count.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    tags = result.scalars().all()

    return [
        TagListItem(
            id=t.id,
            name=t.name,
            slug=t.slug,
            description=t.description,
            question_count=t.question_count,
            follower_count=t.follower_count,
            is_featured=t.is_featured,
        )
        for t in tags
    ]


@router.get("/hot", response_model=list[TagListItem])
async def list_hot_tags(
    db: DbSession,
    limit: int = Query(10, ge=1, le=50),
) -> list[TagListItem]:
    """Get hot tags sorted by question count."""
    from sqlalchemy import select

    from ..models import Tag

    query = (
        select(Tag)
        .where(Tag.is_active.is_(True))
        .order_by(Tag.question_count.desc())
        .limit(limit)
    )

    result = await db.execute(query)
    tags = result.scalars().all()

    return [
        TagListItem(
            id=t.id,
            name=t.name,
            slug=t.slug,
            description=t.description,
            question_count=t.question_count,
            follower_count=t.follower_count,
            is_featured=t.is_featured,
        )
        for t in tags
    ]


@router.get("/{tag_id}", response_model=TagDetail)
async def get_tag(
    tag_id: str,
    db: DbSession,
) -> TagDetail:
    """Get tag detail by ID."""
    from ..models import Tag

    tag = await db.get(Tag, tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="标签不存在")

    return TagDetail(
        id=tag.id,
        name=tag.name,
        slug=tag.slug,
        description=tag.description,
        question_count=tag.question_count,
        follower_count=tag.follower_count,
        is_featured=tag.is_featured,
        is_active=tag.is_active,
        created_at=tag.created_at,
    )


@router.post("/", response_model=TagDetail, status_code=201)
async def create_tag(
    tag_in: TagCreate,
    db: DbSession,
    admin: AdminUser,
) -> TagDetail:
    """Create a new tag (admin only)."""
    from sqlalchemy import select

    from ..models import Tag

    # Check if tag already exists
    query = select(Tag).where((Tag.name == tag_in.name) | (Tag.slug == tag_in.slug))
    existing = (await db.execute(query)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="标签名或 slug 已存在")

    tag = Tag(
        name=tag_in.name,
        slug=tag_in.slug,
        description=tag_in.description,
        is_featured=tag_in.is_featured,
    )
    db.add(tag)
    await db.commit()
    await db.refresh(tag)

    return TagDetail(
        id=tag.id,
        name=tag.name,
        slug=tag.slug,
        description=tag.description,
        question_count=tag.question_count,
        follower_count=tag.follower_count,
        is_featured=tag.is_featured,
        is_active=tag.is_active,
        created_at=tag.created_at,
    )


@router.put("/{tag_id}", response_model=TagDetail)
async def update_tag(
    tag_id: str,
    tag_in: TagUpdate,
    db: DbSession,
    admin: AdminUser,
) -> TagDetail:
    """Update a tag (admin only)."""
    from ..models import Tag

    tag = await db.get(Tag, tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="标签不存在")

    if tag_in.name is not None:
        tag.name = tag_in.name
    if tag_in.description is not None:
        tag.description = tag_in.description
    if tag_in.is_featured is not None:
        tag.is_featured = tag_in.is_featured
    if tag_in.is_active is not None:
        tag.is_active = tag_in.is_active

    await db.commit()
    await db.refresh(tag)

    return TagDetail(
        id=tag.id,
        name=tag.name,
        slug=tag.slug,
        description=tag.description,
        question_count=tag.question_count,
        follower_count=tag.follower_count,
        is_featured=tag.is_featured,
        is_active=tag.is_active,
        created_at=tag.created_at,
    )


@router.delete("/{tag_id}", status_code=204)
async def delete_tag(
    tag_id: str,
    db: DbSession,
    admin: AdminUser,
) -> None:
    """Delete a tag (admin only). Actually soft-deletes by setting is_active=False."""
    from ..models import Tag

    tag = await db.get(Tag, tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="标签不存在")

    tag.is_active = False
    await db.commit()
