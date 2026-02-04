"""Community module enums."""

from enum import Enum


class UserRole(str, Enum):
    """User role enumeration."""

    GUEST = "guest"  # Guest (not logged in)
    MOM = "mom"  # Mother
    DAD = "dad"  # Father
    FAMILY = "family"  # Other family members
    CERTIFIED_DOCTOR = "certified_doctor"  # Certified doctor
    CERTIFIED_THERAPIST = "certified_therapist"  # Certified therapist
    CERTIFIED_NURSE = "certified_nurse"  # Certified nurse
    ADMIN = "admin"  # Administrator
    AI_ASSISTANT = "ai_assistant"  # AI Assistant (auto-reply bot)


class ChannelType(str, Enum):
    """Channel type enumeration."""

    PROFESSIONAL = "professional"  # Professional channel (certified professionals only)
    EXPERIENCE = "experience"  # Experience channel (all users can answer)


class CertificationStatus(str, Enum):
    """Certification status enumeration."""

    PENDING = "pending"  # Pending review
    APPROVED = "approved"  # Approved
    REJECTED = "rejected"  # Rejected
    EXPIRED = "expired"  # Expired
    REVOKED = "revoked"  # Revoked by admin


class ContentStatus(str, Enum):
    """Content status enumeration."""

    DRAFT = "draft"  # Draft
    PENDING_REVIEW = "pending_review"  # Pending review
    PUBLISHED = "published"  # Published
    HIDDEN = "hidden"  # Hidden (violation)
    DELETED = "deleted"  # Deleted


class ModerationResult(str, Enum):
    """Moderation result enumeration."""

    PASSED = "passed"  # Passed
    REJECTED = "rejected"  # Rejected
    NEED_MANUAL_REVIEW = "need_manual_review"  # Needs manual review


class SensitiveCategory(str, Enum):
    """Sensitive content category enumeration."""

    PSEUDOSCIENCE = "pseudoscience"  # Pseudoscience
    DEPRESSION_TRIGGER = "depression_trigger"  # Postpartum depression triggers
    SOFT_PORNOGRAPHY = "soft_pornography"  # Soft pornography
    VIOLENCE = "violence"  # Violent content
    SPAM = "spam"  # Spam/advertising
    MISINFORMATION = "misinformation"  # Medical misinformation
    SELF_HARM = "self_harm"  # Self-harm related
    POLITICAL = "political"  # Politically sensitive
    HARASSMENT = "harassment"  # Harassment/abuse


# Role sets for permission checking
PROFESSIONAL_ROLES = {
    UserRole.CERTIFIED_DOCTOR,
    UserRole.CERTIFIED_THERAPIST,
    UserRole.CERTIFIED_NURSE,
}

FAMILY_ROLES = {
    UserRole.MOM,
    UserRole.DAD,
    UserRole.FAMILY,
}
