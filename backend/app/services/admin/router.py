"""Admin API router."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.services.community.dependencies import AdminUser, DbSession

from .schemas import (
    AdminUserDetail,
    AdminUserListItem,
    AdminUserUpdate,
    ConfigResponse,
    ConfigUpdate,
    DashboardStats,
    PaginatedResponse,
)
from .service import AdminService

router = APIRouter(prefix="/admin", tags=["Admin"])

MessageResponse = dict  # simple {"message": "..."}


# ---------------------------------------------------------------------------
# Dashboard Stats
# ---------------------------------------------------------------------------


@router.get("/stats", response_model=DashboardStats)
async def get_stats(db: DbSession, admin: AdminUser) -> DashboardStats:
    """Get dashboard overview statistics."""
    svc = AdminService(db)
    return await svc.get_stats()


# ---------------------------------------------------------------------------
# User Management
# ---------------------------------------------------------------------------


@router.get("/users", response_model=PaginatedResponse[AdminUserListItem])
async def list_users(
    db: DbSession,
    admin: AdminUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    role: str | None = None,
    status: str | None = None,
) -> PaginatedResponse[AdminUserListItem]:
    """List all users with pagination, search, and filtering."""
    svc = AdminService(db)
    return await svc.list_users(
        page=page,
        page_size=page_size,
        search=search,
        role=role,
        status=status,
    )


@router.get("/users/{user_id}", response_model=AdminUserDetail)
async def get_user(
    user_id: str,
    db: DbSession,
    admin: AdminUser,
) -> AdminUserDetail:
    """Get detailed user information."""
    svc = AdminService(db)
    detail = await svc.get_user(user_id)
    if not detail:
        raise HTTPException(status_code=404, detail="User not found")
    return detail


@router.patch("/users/{user_id}", response_model=AdminUserDetail)
async def update_user(
    user_id: str,
    update: AdminUserUpdate,
    db: DbSession,
    admin: AdminUser,
) -> AdminUserDetail:
    """Update user role or status."""
    svc = AdminService(db)
    detail = await svc.update_user(user_id, update, admin_id=admin.id)
    if not detail:
        raise HTTPException(status_code=404, detail="User not found")
    return detail


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    db: DbSession,
    admin: AdminUser,
) -> dict:
    """Delete a user. Cannot delete yourself."""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    svc = AdminService(db)
    deleted = await svc.delete_user(user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}


# ---------------------------------------------------------------------------
# Config Management
# ---------------------------------------------------------------------------


@router.get("/config", response_model=ConfigResponse)
async def get_config(admin: AdminUser) -> ConfigResponse:
    """Get current runtime config (secrets masked)."""
    return AdminService.get_safe_config()


@router.patch("/config", response_model=ConfigResponse)
async def update_config(
    update: ConfigUpdate,
    admin: AdminUser,
) -> ConfigResponse:
    """Update runtime config. Writes to .env file."""
    return AdminService.update_config(update)
