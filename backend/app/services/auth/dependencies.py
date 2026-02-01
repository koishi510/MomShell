"""Dependencies for authentication."""

from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.services.community.models import User

from .security import decode_token

# HTTP Bearer scheme for JWT authentication
http_bearer = HTTPBearer(auto_error=False)


def get_token_from_request(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = None,
    access_token: str | None = Cookie(None, alias="momshell_access_token"),
) -> str | None:
    """
    Extract token from multiple sources (fallback order):
    1. Authorization: Bearer header
    2. X-Access-Token custom header (for proxies that strip Authorization)
    3. Cookie (momshell_access_token)
    """
    # 1. Try Authorization header
    if credentials and credentials.credentials:
        return credentials.credentials

    # 2. Try custom header (some proxies strip Authorization but not custom headers)
    custom_token = request.headers.get("X-Access-Token")
    if custom_token:
        return custom_token

    # 3. Try cookie
    if access_token:
        return access_token

    return None


async def get_current_user_jwt(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(http_bearer)
    ] = None,
    access_token: str | None = Cookie(None, alias="momshell_access_token"),
) -> User:
    """
    Get current user from JWT token.
    Supports multiple token sources for proxy compatibility.
    Raises HTTPException if not authenticated.
    """
    token = get_token_from_request(request, credentials, access_token)
    if not token:
        raise HTTPException(status_code=401, detail="未登录")

    payload = decode_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="无效的令牌")

    token_type = payload.get("type")
    if token_type != "access":
        raise HTTPException(status_code=401, detail="无效的令牌类型")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="无效的令牌")

    result = await db.execute(
        select(User).options(selectinload(User.certification)).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=401, detail="用户不存在")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="账号已禁用")

    if user.is_banned:
        raise HTTPException(status_code=403, detail="账号已被封禁")

    return user


async def get_current_user_jwt_optional(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(http_bearer)
    ] = None,
    access_token: str | None = Cookie(None, alias="momshell_access_token"),
) -> User | None:
    """
    Get current user from JWT token if present.
    Supports multiple token sources for proxy compatibility.
    Returns None if not authenticated (no exception).
    """
    token = get_token_from_request(request, credentials, access_token)
    if not token:
        return None

    payload = decode_token(token)
    if payload is None:
        return None

    token_type = payload.get("type")
    if token_type != "access":
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    result = await db.execute(
        select(User).options(selectinload(User.certification)).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user or not user.is_active or user.is_banned:
        return None

    return user


async def get_refresh_token_user(
    db: Annotated[AsyncSession, Depends(get_db)],
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(http_bearer)
    ] = None,
) -> str:
    """
    Validate refresh token and return user ID.
    Used for token refresh endpoint.
    """
    if not credentials:
        raise HTTPException(status_code=401, detail="未提供刷新令牌")

    payload = decode_token(credentials.credentials)
    if payload is None:
        raise HTTPException(status_code=401, detail="无效的刷新令牌")

    token_type = payload.get("type")
    if token_type != "refresh":
        raise HTTPException(status_code=401, detail="无效的令牌类型")

    user_id = payload.get("sub")
    if not isinstance(user_id, str):
        raise HTTPException(status_code=401, detail="无效的刷新令牌")

    return user_id


# Type aliases
CurrentUserJWT = Annotated[User, Depends(get_current_user_jwt)]
OptionalUserJWT = Annotated[User | None, Depends(get_current_user_jwt_optional)]
RefreshTokenUserId = Annotated[str, Depends(get_refresh_token_user)]
