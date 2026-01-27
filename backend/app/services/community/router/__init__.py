"""Router module for community."""

from fastapi import APIRouter

from .answers import router as answers_router
from .certifications import router as certifications_router
from .comments import router as comments_router
from .interactions import router as interactions_router
from .moderation import router as moderation_router
from .questions import router as questions_router
from .tags import router as tags_router
from .user import router as user_router

# Create main community router
router = APIRouter()

# Include all sub-routers
router.include_router(questions_router)
router.include_router(answers_router)
router.include_router(comments_router)
router.include_router(interactions_router)
router.include_router(tags_router)
router.include_router(certifications_router)
router.include_router(moderation_router)
router.include_router(user_router)

__all__ = ["router"]
