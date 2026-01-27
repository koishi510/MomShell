"""Certification schemas for community module."""

from datetime import datetime

from pydantic import BaseModel, Field

from ..enums import CertificationStatus, UserRole


class CertificationCreate(BaseModel):
    """Request schema for creating a certification."""

    certification_type: UserRole = Field(
        ...,
        description="Must be one of: certified_doctor, certified_therapist, certified_nurse",
    )
    real_name: str = Field(..., min_length=2, max_length=50)
    id_card_number: str | None = Field(None, min_length=18, max_length=18)
    license_number: str = Field(..., min_length=5, max_length=100)
    hospital_or_institution: str = Field(..., min_length=2, max_length=200)
    department: str | None = Field(None, max_length=100)
    title: str | None = Field(None, max_length=50)
    license_image_url: str = Field(..., max_length=500)
    id_card_image_url: str | None = Field(None, max_length=500)
    additional_docs_urls: list[str] = Field(default_factory=list, max_length=5)


class CertificationReview(BaseModel):
    """Request schema for reviewing a certification."""

    status: CertificationStatus = Field(..., description="Must be: approved, rejected")
    review_comment: str | None = Field(None, max_length=500)
    valid_from: datetime | None = None
    valid_until: datetime | None = None


class CertificationStatus_(BaseModel):
    """Certification status response."""

    id: str
    user_id: str
    certification_type: UserRole
    real_name: str
    license_number: str
    hospital_or_institution: str
    department: str | None
    title: str | None
    status: CertificationStatus
    review_comment: str | None
    reviewed_at: datetime | None
    valid_from: datetime | None
    valid_until: datetime | None
    created_at: datetime
    updated_at: datetime


class CertificationListItem(BaseModel):
    """Certification list item for admin review."""

    id: str
    user_id: str
    user_nickname: str
    certification_type: UserRole
    real_name: str
    license_number: str
    hospital_or_institution: str
    status: CertificationStatus
    created_at: datetime
