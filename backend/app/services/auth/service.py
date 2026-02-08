"""Authentication service."""

from sqlalchemy import inspect, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.services.community.enums import CertificationStatus, UserRole
from app.services.community.models import User, UserCertification

from .schemas import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from .security import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    verify_password,
)


class AuthService:
    """Service for handling authentication operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def register(self, request: RegisterRequest) -> UserResponse:
        """Register a new user."""
        # Check if username already exists
        existing = await self.db.execute(
            select(User).where(
                or_(User.username == request.username, User.email == request.email)
            )
        )
        if existing.scalar_one_or_none():
            from fastapi import HTTPException

            raise HTTPException(status_code=400, detail="用户名或邮箱已存在")

        # Create new user
        user = User(
            username=request.username,
            email=request.email,
            password_hash=get_password_hash(request.password),
            nickname=request.nickname,
            role=UserRole(request.role),
            is_active=True,
            is_banned=False,
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)

        # New user has no certification, pass explicitly
        return self._build_user_response(user, certification_loaded=False)

    async def login(self, request: LoginRequest) -> TokenResponse:
        """Authenticate user and return tokens."""
        from fastapi import HTTPException

        # Find user by username or email
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.certification))
            .where(or_(User.username == request.login, User.email == request.login))
        )
        user = result.scalar_one_or_none()

        if not user or not verify_password(request.password, user.password_hash):
            raise HTTPException(status_code=401, detail="用户名或密码错误")

        if not user.is_active:
            raise HTTPException(status_code=403, detail="账号已禁用")

        if user.is_banned:
            raise HTTPException(status_code=403, detail="账号已被封禁")

        # Generate tokens
        settings = get_settings()
        access_token = create_access_token(data={"sub": user.id})
        refresh_token = create_refresh_token(data={"sub": user.id})

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.jwt_access_token_expire_minutes * 60,
        )

    async def refresh(self, user_id: str) -> TokenResponse:
        """Refresh access token."""
        from fastapi import HTTPException

        user = await self.db.get(User, user_id)
        if not user or not user.is_active or user.is_banned:
            raise HTTPException(status_code=401, detail="无效的刷新令牌")

        settings = get_settings()
        access_token = create_access_token(data={"sub": user.id})
        refresh_token = create_refresh_token(data={"sub": user.id})

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.jwt_access_token_expire_minutes * 60,
        )

    async def get_user_by_id(self, user_id: str) -> User | None:
        """Get user by ID with certification loaded."""
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.certification))
            .where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_user_response(self, user_id: str) -> UserResponse | None:
        """Get user response by ID."""
        user = await self.get_user_by_id(user_id)
        if not user:
            return None
        return self._build_user_response(user, certification_loaded=True)

    async def update_password(self, user_id: str, new_password: str) -> bool:
        """Update user password."""
        user = await self.db.get(User, user_id)
        if not user:
            return False

        user.password_hash = get_password_hash(new_password)
        await self.db.commit()
        return True

    def _build_user_response(
        self, user: User, certification_loaded: bool = True
    ) -> UserResponse:
        """Build UserResponse from User model."""
        is_certified = False
        certification_title = None

        # Only access certification if it's been loaded to avoid lazy loading in async
        if certification_loaded:
            insp = inspect(user)
            if "certification" in insp.dict and user.certification:
                cert: UserCertification = user.certification
                if cert.status == CertificationStatus.APPROVED:
                    is_certified = True
                    certification_title = cert.title

        return UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            nickname=user.nickname,
            avatar_url=user.avatar_url,
            role=user.role.value,
            is_certified=is_certified,
            certification_title=certification_title,
            baby_birth_date=user.baby_birth_date,
            postpartum_weeks=user.postpartum_weeks,
            created_at=user.created_at,
        )


async def get_auth_service(db: AsyncSession) -> AuthService:
    """Dependency to get AuthService instance."""
    return AuthService(db)
