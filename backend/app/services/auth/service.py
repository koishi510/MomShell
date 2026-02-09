"""Authentication service."""

import random
import string
from datetime import datetime, timedelta

from sqlalchemy import inspect, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.services.community.enums import CertificationStatus, ModerationResult, UserRole
from app.services.community.models import User, UserCertification
from app.services.community.moderation import get_moderation_service
from app.services.guardian.enums import BindingStatus
from app.services.guardian.models import PartnerBinding

from .schemas import (
    LoginRequest,
    RegisterRequest,
    ShellCodeBindResponse,
    ShellCodeGenerateResponse,
    ShellCodeStatusResponse,
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
        from fastapi import HTTPException

        # Moderate nickname
        moderation = get_moderation_service()
        nickname_decision = await moderation.moderate_text(request.nickname)
        if nickname_decision.result == ModerationResult.REJECTED:
            raise HTTPException(
                status_code=400,
                detail=f"昵称包含敏感内容: {nickname_decision.reason}",
            )

        # Check if username already exists
        existing = await self.db.execute(
            select(User).where(
                or_(User.username == request.username, User.email == request.email)
            )
        )
        if existing.scalar_one_or_none():
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

    # ============================================================
    # Shell Code (贝壳码) - Partner Binding
    # ============================================================

    # Store shell codes temporarily (in production, use Redis or DB)
    _shell_codes: dict[str, dict] = {}

    @staticmethod
    def _generate_code() -> str:
        """Generate a random 6-character alphanumeric code."""
        return "".join(random.choices(string.ascii_uppercase + string.digits, k=6))

    async def generate_shell_code(self, user_id: str) -> ShellCodeGenerateResponse:
        """Generate a shell code for partner binding (Mom mode)."""
        # Check user role (should be mom)
        user = await self.db.get(User, user_id)
        if not user:
            raise ValueError("用户不存在")

        if user.role not in [UserRole.MOM]:
            raise ValueError("只有妈妈可以生成贝壳码")

        # Check if already bound
        existing_binding = await self.db.execute(
            select(PartnerBinding).where(
                PartnerBinding.mom_id == user_id,
                PartnerBinding.status == BindingStatus.ACTIVE,
            )
        )
        if existing_binding.scalar_one_or_none():
            raise ValueError("您已绑定伴侣，无法生成新的贝壳码")

        # Generate unique code
        code = self._generate_code()
        while code in AuthService._shell_codes:
            code = self._generate_code()

        # Store with 24-hour expiration
        expires_at = datetime.utcnow() + timedelta(hours=24)
        AuthService._shell_codes[code] = {
            "user_id": user_id,
            "expires_at": expires_at,
        }

        return ShellCodeGenerateResponse(
            shell_code=code,
            expires_at=expires_at,
        )

    async def bind_with_shell_code(
        self, user_id: str, shell_code: str
    ) -> ShellCodeBindResponse:
        """Bind to a partner using their shell code (Partner mode)."""
        # Validate code
        code_upper = shell_code.upper()
        code_data = AuthService._shell_codes.get(code_upper)

        if not code_data:
            raise ValueError("无效的贝壳码")

        if datetime.utcnow() > code_data["expires_at"]:
            del AuthService._shell_codes[code_upper]
            raise ValueError("贝壳码已过期")

        mom_id = code_data["user_id"]

        # Can't bind to self
        if mom_id == user_id:
            raise ValueError("不能绑定自己")

        # Check user role (should be partner/dad/family)
        user = await self.db.get(User, user_id)
        if not user:
            raise ValueError("用户不存在")

        if user.role == UserRole.MOM:
            raise ValueError("妈妈角色不能作为守护者绑定")

        # Check if already bound
        existing = await self.db.execute(
            select(PartnerBinding).where(
                PartnerBinding.partner_id == user_id,
                PartnerBinding.status == BindingStatus.ACTIVE,
            )
        )
        if existing.scalar_one_or_none():
            raise ValueError("您已绑定其他用户")

        # Create binding
        binding = PartnerBinding(
            mom_id=mom_id,
            partner_id=user_id,
            status=BindingStatus.ACTIVE,
        )
        self.db.add(binding)
        await self.db.commit()

        # Remove used code
        del AuthService._shell_codes[code_upper]

        return ShellCodeBindResponse(
            message="绑定成功",
            partner_id=mom_id,
        )

    async def get_shell_code_status(self, user_id: str) -> ShellCodeStatusResponse:
        """Get current shell code status."""
        # Check for active binding
        binding = await self.db.execute(
            select(PartnerBinding).where(
                (PartnerBinding.mom_id == user_id)
                | (PartnerBinding.partner_id == user_id),
                PartnerBinding.status == BindingStatus.ACTIVE,
            )
        )
        active_binding = binding.scalar_one_or_none()

        partner_nickname = None
        if active_binding:
            # Get partner's nickname
            if active_binding.mom_id == user_id:
                partner = await self.db.get(User, active_binding.partner_id)
            else:
                partner = await self.db.get(User, active_binding.mom_id)
            if partner:
                partner_nickname = partner.nickname

        # Check for existing shell code
        has_code = False
        shell_code = None
        expires_at = None

        for code, data in AuthService._shell_codes.items():
            if data["user_id"] == user_id:
                if datetime.utcnow() <= data["expires_at"]:
                    has_code = True
                    shell_code = code
                    expires_at = data["expires_at"]
                break

        return ShellCodeStatusResponse(
            has_code=has_code,
            shell_code=shell_code,
            expires_at=expires_at,
            is_bound=active_binding is not None,
            partner_nickname=partner_nickname,
        )


async def get_auth_service(db: AsyncSession) -> AuthService:
    """Dependency to get AuthService instance."""
    return AuthService(db)
