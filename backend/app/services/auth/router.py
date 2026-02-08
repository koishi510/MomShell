"""Authentication API router."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db

from .dependencies import CurrentUserJWT
from .schemas import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserResponse,
)
from .security import (
    create_password_reset_token,
    verify_password,
    verify_password_reset_token,
)
from .service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse)
async def register(
    request: RegisterRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserResponse:
    """Register a new user."""
    service = AuthService(db)
    return await service.register(request)


@router.post("/login", response_model=TokenResponse)
async def login(
    request: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    """Login with username/email and password."""
    service = AuthService(db)
    return await service.login(request)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: RefreshRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    """Refresh access token using refresh token."""
    from .security import decode_token

    payload = decode_token(request.refresh_token)
    if payload is None:
        raise HTTPException(status_code=401, detail="无效的刷新令牌")

    token_type = payload.get("type")
    if token_type != "refresh":
        raise HTTPException(status_code=401, detail="无效的令牌类型")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="无效的刷新令牌")

    service = AuthService(db)
    return await service.refresh(user_id)


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    request: ForgotPasswordRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MessageResponse:
    """Request a password reset email."""
    from sqlalchemy import select

    from app.services.community.models import User

    # Find user by email
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalar_one_or_none()

    if user:
        # Generate password reset token
        reset_token = create_password_reset_token(user.id)
        # In production, send this token via email
        # For now, only log that a reset token was generated (without the token itself)
        import logging

        logging.info(f"Password reset token generated for {request.email}")

    # Always return success to prevent email enumeration
    return MessageResponse(message="如果该邮箱已注册，您将收到重置密码的邮件")


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    request: ResetPasswordRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MessageResponse:
    """Reset password using reset token."""
    user_id = verify_password_reset_token(request.token)
    if not user_id:
        raise HTTPException(status_code=400, detail="无效或已过期的重置令牌")

    service = AuthService(db)
    success = await service.update_password(user_id, request.new_password)

    if not success:
        raise HTTPException(status_code=400, detail="密码重置失败")

    return MessageResponse(message="密码已重置，请使用新密码登录")


@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    request: ChangePasswordRequest,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MessageResponse:
    """Change password for authenticated user."""
    # Verify old password
    if not verify_password(request.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="当前密码错误")

    service = AuthService(db)
    success = await service.update_password(current_user.id, request.new_password)

    if not success:
        raise HTTPException(status_code=400, detail="密码修改失败")

    return MessageResponse(message="密码修改成功")


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: CurrentUserJWT,
) -> UserResponse:
    """Get current authenticated user information."""
    from app.services.community.enums import CertificationStatus

    is_certified = False
    certification_title = None

    if hasattr(current_user, "certification") and current_user.certification:
        cert = current_user.certification
        if cert.status == CertificationStatus.APPROVED:
            is_certified = True
            certification_title = cert.title

    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        nickname=current_user.nickname,
        avatar_url=current_user.avatar_url,
        role=current_user.role.value,
        is_certified=is_certified,
        certification_title=certification_title,
        baby_birth_date=current_user.baby_birth_date,
        postpartum_weeks=current_user.postpartum_weeks,
        created_at=current_user.created_at,
    )
