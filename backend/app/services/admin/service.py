"""Admin service — business logic."""

from __future__ import annotations

import math
from pathlib import Path

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.services.community.enums import (
    CertificationStatus,
    ContentStatus,
    UserRole,
)
from app.services.community.models import Answer, Question, User, UserCertification

from .schemas import (
    AdminUserDetail,
    AdminUserListItem,
    AdminUserUpdate,
    ConfigResponse,
    ConfigUpdate,
    DashboardStats,
    PaginatedResponse,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _mask(value: str) -> str:
    """Mask a secret value, keeping first 2 and last 2 chars."""
    if not value:
        return ""
    if len(value) <= 6:
        return "****"
    return value[:2] + "****" + value[-2:]


def _user_to_list_item(user: User) -> AdminUserListItem:
    return AdminUserListItem(
        id=user.id,
        username=user.username,
        email=user.email,
        nickname=user.nickname,
        avatar_url=user.avatar_url,
        role=user.role.value,
        is_active=user.is_active,
        is_banned=user.is_banned,
        is_guest=user.is_guest,
        postpartum_weeks=user.postpartum_weeks,
        created_at=user.created_at,
        last_active_at=user.last_active_at,
    )


def _user_to_detail(user: User) -> AdminUserDetail:
    has_cert = False
    cert_status = None
    if hasattr(user, "certification") and user.certification:
        has_cert = True
        cert_status = user.certification.status.value

    return AdminUserDetail(
        id=user.id,
        username=user.username,
        email=user.email,
        nickname=user.nickname,
        avatar_url=user.avatar_url,
        role=user.role.value,
        is_active=user.is_active,
        is_banned=user.is_banned,
        is_guest=user.is_guest,
        postpartum_weeks=user.postpartum_weeks,
        created_at=user.created_at,
        last_active_at=user.last_active_at,
        shell_code=user.shell_code,
        partner_id=user.partner_id,
        baby_birth_date=user.baby_birth_date,
        updated_at=user.updated_at,
        has_certification=has_cert,
        certification_status=cert_status,
    )


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------


class AdminService:
    """Admin operations backed by the database."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # -- Users --------------------------------------------------------------

    async def list_users(
        self,
        *,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
        role: str | None = None,
        status: str | None = None,
    ) -> PaginatedResponse[AdminUserListItem]:
        query = select(User)
        count_query = select(func.count()).select_from(User)

        # Search filter
        if search:
            pattern = f"%{search}%"
            search_filter = or_(
                User.username.ilike(pattern),
                User.email.ilike(pattern),
                User.nickname.ilike(pattern),
            )
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)

        # Role filter
        if role:
            try:
                role_enum = UserRole(role)
                query = query.where(User.role == role_enum)
                count_query = count_query.where(User.role == role_enum)
            except ValueError:
                pass

        # Status filter
        if status == "active":
            query = query.where(User.is_active.is_(True), User.is_banned.is_(False))
            count_query = count_query.where(
                User.is_active.is_(True), User.is_banned.is_(False)
            )
        elif status == "banned":
            query = query.where(User.is_banned.is_(True))
            count_query = count_query.where(User.is_banned.is_(True))
        elif status == "inactive":
            query = query.where(User.is_active.is_(False))
            count_query = count_query.where(User.is_active.is_(False))

        # Count
        total = (await self.db.execute(count_query)).scalar() or 0
        total_pages = max(1, math.ceil(total / page_size))

        # Fetch page
        query = query.order_by(User.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(query)
        users = result.scalars().all()

        return PaginatedResponse[AdminUserListItem](
            items=[_user_to_list_item(u) for u in users],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    async def get_user(self, user_id: str) -> AdminUserDetail | None:
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.certification))
            .where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        if not user:
            return None
        return _user_to_detail(user)

    async def update_user(
        self,
        user_id: str,
        update: AdminUserUpdate,
        admin_id: str,
    ) -> AdminUserDetail | None:
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.certification))
            .where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        if not user:
            return None

        if update.role is not None:
            # Prevent demoting self
            if user_id == admin_id and update.role != UserRole.ADMIN.value:
                from fastapi import HTTPException

                raise HTTPException(
                    status_code=400, detail="Cannot demote your own admin role"
                )
            try:
                user.role = UserRole(update.role)
            except ValueError:
                from fastapi import HTTPException

                raise HTTPException(
                    status_code=400, detail=f"Invalid role: {update.role}"
                ) from None

        if update.is_active is not None:
            user.is_active = update.is_active
        if update.is_banned is not None:
            user.is_banned = update.is_banned

        await self.db.commit()
        await self.db.refresh(user)
        return _user_to_detail(user)

    async def delete_user(self, user_id: str) -> bool:
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            return False
        await self.db.delete(user)
        await self.db.commit()
        return True

    # -- Stats --------------------------------------------------------------

    async def get_stats(self) -> DashboardStats:
        # User counts
        total = (
            await self.db.execute(select(func.count()).select_from(User))
        ).scalar() or 0

        active = (
            await self.db.execute(
                select(func.count())
                .select_from(User)
                .where(User.is_active.is_(True), User.is_banned.is_(False))
            )
        ).scalar() or 0

        banned = (
            await self.db.execute(
                select(func.count()).select_from(User).where(User.is_banned.is_(True))
            )
        ).scalar() or 0

        guest = (
            await self.db.execute(
                select(func.count()).select_from(User).where(User.is_guest.is_(True))
            )
        ).scalar() or 0

        # Users by role
        role_rows = (
            await self.db.execute(select(User.role, func.count()).group_by(User.role))
        ).all()
        users_by_role = {str(r.role.value): r[1] for r in role_rows}

        # Questions
        total_q = (
            await self.db.execute(select(func.count()).select_from(Question))
        ).scalar() or 0
        pending_q = (
            await self.db.execute(
                select(func.count())
                .select_from(Question)
                .where(Question.status == ContentStatus.PENDING_REVIEW)
            )
        ).scalar() or 0

        # Answers
        total_a = (
            await self.db.execute(select(func.count()).select_from(Answer))
        ).scalar() or 0

        # Certifications
        total_cert = (
            await self.db.execute(select(func.count()).select_from(UserCertification))
        ).scalar() or 0
        pending_cert = (
            await self.db.execute(
                select(func.count())
                .select_from(UserCertification)
                .where(UserCertification.status == CertificationStatus.PENDING)
            )
        ).scalar() or 0

        return DashboardStats(
            total_users=total,
            users_by_role=users_by_role,
            active_users=active,
            banned_users=banned,
            guest_users=guest,
            total_questions=total_q,
            pending_questions=pending_q,
            total_answers=total_a,
            total_certifications=total_cert,
            pending_certifications=pending_cert,
        )

    # -- Config -------------------------------------------------------------

    @staticmethod
    def get_safe_config() -> ConfigResponse:
        settings = get_settings()
        return ConfigResponse(
            app_name=settings.app_name,
            debug=settings.debug,
            database_url=_mask(settings.database_url),
            modelscope_key=_mask(settings.modelscope_key),
            modelscope_base_url=settings.modelscope_base_url,
            modelscope_model=settings.modelscope_model,
            modelscope_image_model=settings.modelscope_image_model or "",
            jwt_algorithm=settings.jwt_algorithm,
            jwt_access_token_expire_minutes=settings.jwt_access_token_expire_minutes,
            jwt_refresh_token_expire_days=settings.jwt_refresh_token_expire_days,
            firecrawl_api_key=_mask(settings.firecrawl_api_key),
            tts_voice=settings.tts_voice,
            tts_rate=settings.tts_rate,
            pose_model_complexity=settings.pose_model_complexity,
            min_detection_confidence=settings.min_detection_confidence,
            min_tracking_confidence=settings.min_tracking_confidence,
        )

    @staticmethod
    def update_config(update: ConfigUpdate) -> ConfigResponse:
        """Write changed values to .env and clear settings cache."""
        from app.core.config import _find_env_file

        env_path_str = _find_env_file()
        if env_path_str:
            env_path = Path(env_path_str)
        else:
            # Create .env at project root (backend/../.env)
            env_path = Path(__file__).resolve().parents[4] / ".env"

        # Read existing lines
        existing_lines: list[str] = []
        if env_path.exists():
            existing_lines = env_path.read_text(encoding="utf-8").splitlines()

        # Collect updates as KEY=VALUE
        changes: dict[str, str] = {}
        for field_name, value in update.model_dump(exclude_none=True).items():
            env_key = field_name.upper()
            changes[env_key] = (
                str(value).lower() if isinstance(value, bool) else str(value)
            )

        if not changes:
            return AdminService.get_safe_config()

        # Update existing lines or track what's already been written
        updated_keys: set[str] = set()
        new_lines: list[str] = []
        for line in existing_lines:
            stripped = line.strip()
            if "=" in stripped and not stripped.startswith("#"):
                key = stripped.split("=", 1)[0].strip()
                if key in changes:
                    new_lines.append(f"{key}={changes[key]}")
                    updated_keys.add(key)
                    continue
            new_lines.append(line)

        # Append new keys that weren't already in the file
        for key, value in changes.items():
            if key not in updated_keys:
                new_lines.append(f"{key}={value}")

        # Write back
        env_path.write_text("\n".join(new_lines) + "\n", encoding="utf-8")

        # Clear settings cache so next call picks up changes
        get_settings.cache_clear()

        return AdminService.get_safe_config()
