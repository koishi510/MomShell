"""Schemas module for community."""

from .answers import AnswerCreate, AnswerDetail, AnswerListItem, AnswerUpdate
from .base import AuthorInfo, PaginatedResponse, TagInfo, TimestampMixin
from .certifications import (
    CertificationCreate,
    CertificationListItem,
    CertificationReview,
    CertificationStatus_,
)
from .comments import CommentCreate, CommentListItem
from .interactions import (
    CollectionCreate,
    CollectionItem,
    CollectionUpdate,
    LikeCreate,
    LikeDelete,
    LikeStatus,
)
from .questions import QuestionCreate, QuestionDetail, QuestionListItem, QuestionUpdate
from .tags import TagCreate, TagDetail, TagListItem, TagUpdate
from .user import (
    MyAnswerListItem,
    MyQuestionListItem,
    QuestionBrief,
    UserProfile,
    UserProfileUpdate,
    UserStats,
)

__all__ = [
    # Base
    "PaginatedResponse",
    "AuthorInfo",
    "TagInfo",
    "TimestampMixin",
    # Questions
    "QuestionCreate",
    "QuestionUpdate",
    "QuestionListItem",
    "QuestionDetail",
    # Answers
    "AnswerCreate",
    "AnswerUpdate",
    "AnswerListItem",
    "AnswerDetail",
    # Comments
    "CommentCreate",
    "CommentListItem",
    # Interactions
    "LikeCreate",
    "LikeDelete",
    "LikeStatus",
    "CollectionCreate",
    "CollectionUpdate",
    "CollectionItem",
    # Tags
    "TagCreate",
    "TagUpdate",
    "TagListItem",
    "TagDetail",
    # Certifications
    "CertificationCreate",
    "CertificationReview",
    "CertificationStatus_",
    "CertificationListItem",
    # User
    "UserProfileUpdate",
    "UserStats",
    "UserProfile",
    "MyQuestionListItem",
    "QuestionBrief",
    "MyAnswerListItem",
]
