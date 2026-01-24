"""Certification routes for community module."""

from fastapi import APIRouter, HTTPException, Query

from ..dependencies import (
    AdminUser,
    CurrentUser,
    DbSession,
)
from ..enums import PROFESSIONAL_ROLES, CertificationStatus
from ..schemas import (
    CertificationCreate,
    CertificationListItem,
    CertificationReview,
    CertificationStatus_,
    PaginatedResponse,
)

router = APIRouter(prefix="/certifications", tags=["Community - Certifications"])


@router.post("/", response_model=CertificationStatus_, status_code=201)
async def create_certification(
    cert_in: CertificationCreate,
    db: DbSession,
    current_user: CurrentUser,
) -> CertificationStatus_:
    """Submit a certification application."""
    import json

    from ..models import UserCertification

    # Check if certification type is valid
    if cert_in.certification_type not in PROFESSIONAL_ROLES:
        raise HTTPException(
            status_code=400,
            detail="认证类型必须是: certified_doctor, certified_therapist, certified_nurse",
        )

    # Check if user already has a certification
    if current_user.certification:
        if current_user.certification.status == CertificationStatus.PENDING:
            raise HTTPException(status_code=400, detail="您已有待审核的认证申请")
        if current_user.certification.status == CertificationStatus.APPROVED:
            raise HTTPException(status_code=400, detail="您已通过认证")

    # Create certification
    cert = UserCertification(
        user_id=current_user.id,
        certification_type=cert_in.certification_type,
        real_name=cert_in.real_name,
        id_card_number=cert_in.id_card_number,
        license_number=cert_in.license_number,
        hospital_or_institution=cert_in.hospital_or_institution,
        department=cert_in.department,
        title=cert_in.title,
        license_image_url=cert_in.license_image_url,
        id_card_image_url=cert_in.id_card_image_url,
        additional_docs_urls=(
            json.dumps(cert_in.additional_docs_urls)
            if cert_in.additional_docs_urls
            else None
        ),
        status=CertificationStatus.PENDING,
    )
    db.add(cert)
    await db.commit()
    await db.refresh(cert)

    return CertificationStatus_(
        id=cert.id,
        user_id=cert.user_id,
        certification_type=cert.certification_type,
        real_name=cert.real_name,
        license_number=cert.license_number,
        hospital_or_institution=cert.hospital_or_institution,
        department=cert.department,
        title=cert.title,
        status=cert.status,
        review_comment=cert.review_comment,
        reviewed_at=cert.reviewed_at,
        valid_from=cert.valid_from,
        valid_until=cert.valid_until,
        created_at=cert.created_at,
        updated_at=cert.updated_at,
    )


@router.get("/my", response_model=CertificationStatus_ | None)
async def get_my_certification(
    db: DbSession,
    current_user: CurrentUser,
) -> CertificationStatus_ | None:
    """Get current user's certification status."""
    cert = current_user.certification
    if not cert:
        return None

    return CertificationStatus_(
        id=cert.id,
        user_id=cert.user_id,
        certification_type=cert.certification_type,
        real_name=cert.real_name,
        license_number=cert.license_number,
        hospital_or_institution=cert.hospital_or_institution,
        department=cert.department,
        title=cert.title,
        status=cert.status,
        review_comment=cert.review_comment,
        reviewed_at=cert.reviewed_at,
        valid_from=cert.valid_from,
        valid_until=cert.valid_until,
        created_at=cert.created_at,
        updated_at=cert.updated_at,
    )


@router.get("/", response_model=PaginatedResponse[CertificationListItem])
async def list_certifications(
    db: DbSession,
    admin: AdminUser,
    status: CertificationStatus | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PaginatedResponse[CertificationListItem]:
    """Get list of certification applications (admin only)."""
    from sqlalchemy import func, select
    from sqlalchemy.orm import selectinload

    from ..models import UserCertification

    query = select(UserCertification).options(selectinload(UserCertification.user))

    if status:
        query = query.where(UserCertification.status == status)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Order by created_at desc
    query = query.order_by(UserCertification.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    certs = result.scalars().all()

    items = [
        CertificationListItem(
            id=c.id,
            user_id=c.user_id,
            user_nickname=c.user.nickname if c.user else "Unknown",
            certification_type=c.certification_type,
            real_name=c.real_name,
            license_number=c.license_number,
            hospital_or_institution=c.hospital_or_institution,
            status=c.status,
            created_at=c.created_at,
        )
        for c in certs
    ]

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.put("/{cert_id}/review", response_model=CertificationStatus_)
async def review_certification(
    cert_id: str,
    review_in: CertificationReview,
    db: DbSession,
    admin: AdminUser,
) -> CertificationStatus_:
    """Review a certification application (admin only)."""
    from datetime import datetime

    from ..models import User, UserCertification

    cert = await db.get(UserCertification, cert_id)
    if not cert:
        raise HTTPException(status_code=404, detail="认证申请不存在")

    if cert.status != CertificationStatus.PENDING:
        raise HTTPException(status_code=400, detail="该申请已被处理")

    if review_in.status not in (
        CertificationStatus.APPROVED,
        CertificationStatus.REJECTED,
    ):
        raise HTTPException(
            status_code=400, detail="审核状态必须是: approved 或 rejected"
        )

    # Update certification
    cert.status = review_in.status
    cert.review_comment = review_in.review_comment
    cert.reviewer_id = admin.id
    cert.reviewed_at = datetime.utcnow()

    if review_in.status == CertificationStatus.APPROVED:
        cert.valid_from = review_in.valid_from or datetime.utcnow()
        cert.valid_until = review_in.valid_until

        # Update user role
        user = await db.get(User, cert.user_id)
        if user:
            user.role = cert.certification_type

    await db.commit()
    await db.refresh(cert)

    return CertificationStatus_(
        id=cert.id,
        user_id=cert.user_id,
        certification_type=cert.certification_type,
        real_name=cert.real_name,
        license_number=cert.license_number,
        hospital_or_institution=cert.hospital_or_institution,
        department=cert.department,
        title=cert.title,
        status=cert.status,
        review_comment=cert.review_comment,
        reviewed_at=cert.reviewed_at,
        valid_from=cert.valid_from,
        valid_until=cert.valid_until,
        created_at=cert.created_at,
        updated_at=cert.updated_at,
    )
