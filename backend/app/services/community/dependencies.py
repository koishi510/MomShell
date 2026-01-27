"""Dependencies for community module."""

from typing import Annotated

from fastapi import Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db

from .models import User
from .service import CommunityService, get_community_service

# Type aliases for dependency injection
DbSession = Annotated[AsyncSession, Depends(get_db)]
CommunityServiceDep = Annotated[CommunityService, Depends(get_community_service)]


async def get_current_user(
    db: DbSession,
    x_user_id: str | None = Header(None, alias="X-User-ID"),
) -> User:
    """
    Get current user from request header.

    Note: This is a simplified implementation. In production,
    implement proper JWT/OAuth2 authentication.
    """
    if not x_user_id:
        raise HTTPException(status_code=401, detail="未登录")

    user = await db.get(User, x_user_id)
    if not user:
        # Auto-create user for development/demo purposes
        from .enums import UserRole

        user = User(
            id=x_user_id,
            username=f"user_{x_user_id[:8]}",
            email=f"{x_user_id[:8]}@example.com",
            password_hash="",
            nickname="新用户",
            role=UserRole.MOM,
            is_active=True,
            is_banned=False,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    if not user.is_active:
        raise HTTPException(status_code=403, detail="账号已禁用")

    if user.is_banned:
        raise HTTPException(status_code=403, detail="账号已被封禁")

    return user


async def get_current_user_optional(
    db: DbSession,
    x_user_id: str | None = Header(None, alias="X-User-ID"),
) -> User | None:
    """Get current user if authenticated, None otherwise."""
    if not x_user_id:
        return None

    user = await db.get(User, x_user_id)
    if not user:
        # Auto-create user for development/demo purposes
        from .enums import UserRole

        user = User(
            id=x_user_id,
            username=f"user_{x_user_id[:8]}",
            email=f"{x_user_id[:8]}@example.com",
            password_hash="",
            nickname="新用户",
            role=UserRole.MOM,
            is_active=True,
            is_banned=False,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    if not user.is_active or user.is_banned:
        return None

    return user


async def get_admin_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Require admin user."""
    from .enums import UserRole

    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="需要管理员权限")

    return current_user


# Type aliases for authenticated dependencies
CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalUser = Annotated[User | None, Depends(get_current_user_optional)]
AdminUser = Annotated[User, Depends(get_admin_user)]
