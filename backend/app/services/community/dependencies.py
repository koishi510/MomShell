"""Dependencies for community module."""

from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.services.auth.security import decode_token

from .models import User
from .service import CommunityService, get_community_service

# Type aliases for dependency injection
DbSession = Annotated[AsyncSession, Depends(get_db)]
CommunityServiceDep = Annotated[CommunityService, Depends(get_community_service)]

# HTTP Bearer scheme (auto_error=False to allow fallback to X-Access-Token)
http_bearer = HTTPBearer(auto_error=False)


def get_token_from_request(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = None,
) -> str | None:
    """
    Extract token from multiple sources (fallback order):
    1. Authorization: Bearer header
    2. X-Access-Token custom header (for proxies that strip Authorization)
    """
    # 1. Try Authorization header
    if credentials and credentials.credentials:
        return credentials.credentials

    # 2. Try custom header (some proxies like ModelScope strip Authorization)
    custom_token = request.headers.get("X-Access-Token")
    if custom_token:
        return custom_token

    return None


async def get_current_user(
    request: Request,
    db: DbSession,
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(http_bearer)
    ] = None,
    x_user_id: str | None = Header(None, alias="X-User-ID"),
) -> User:
    """
    Get current user from JWT token or X-User-ID header (fallback for dev).

    Priority:
    1. JWT Bearer token in Authorization header
    2. X-Access-Token custom header (for proxies that strip Authorization)
    3. X-User-ID header (for backward compatibility / development)
    """
    user: User | None = None

    # Try JWT token (from Authorization header or X-Access-Token)
    token = get_token_from_request(request, credentials)
    if token:
        payload = decode_token(token)
        if payload and payload.get("type") == "access":
            user_id = payload.get("sub")
            if user_id:
                result = await db.execute(
                    select(User)
                    .options(selectinload(User.certification))
                    .where(User.id == user_id)
                )
                user = result.scalar_one_or_none()

    # Fallback to X-User-ID for development compatibility
    if not user and x_user_id:
        result = await db.execute(
            select(User)
            .options(selectinload(User.certification))
            .where(User.id == x_user_id)
        )
        user = result.scalar_one_or_none()
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

    if not user:
        raise HTTPException(status_code=401, detail="未登录")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="账号已禁用")

    if user.is_banned:
        raise HTTPException(status_code=403, detail="账号已被封禁")

    return user


async def get_current_user_optional(
    request: Request,
    db: DbSession,
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(http_bearer)
    ] = None,
    x_user_id: str | None = Header(None, alias="X-User-ID"),
) -> User | None:
    """
    Get current user if authenticated, None otherwise.

    Priority:
    1. JWT Bearer token in Authorization header
    2. X-Access-Token custom header (for proxies that strip Authorization)
    3. X-User-ID header (for backward compatibility / development)
    """
    user: User | None = None

    # Try JWT token (from Authorization header or X-Access-Token)
    token = get_token_from_request(request, credentials)
    if token:
        payload = decode_token(token)
        if payload and payload.get("type") == "access":
            user_id = payload.get("sub")
            if user_id:
                result = await db.execute(
                    select(User)
                    .options(selectinload(User.certification))
                    .where(User.id == user_id)
                )
                user = result.scalar_one_or_none()

    # Fallback to X-User-ID for development compatibility
    if not user and x_user_id:
        result = await db.execute(
            select(User)
            .options(selectinload(User.certification))
            .where(User.id == x_user_id)
        )
        user = result.scalar_one_or_none()
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

    if user and (not user.is_active or user.is_banned):
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
