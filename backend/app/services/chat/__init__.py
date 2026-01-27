# app/services/chat/__init__.py
"""Soulful Companion 情感交互模块"""

from .router import router
from .schemas import (
    ColorTone,
    ConversationMemory,
    EffectType,
    UserMessage,
    UserProfile,
    VisualMetadata,
    VisualResponse,
)
from .service import CompanionService, get_companion_service

__all__ = [
    "ColorTone",
    "CompanionService",
    "ConversationMemory",
    "EffectType",
    "UserMessage",
    "UserProfile",
    "VisualMetadata",
    "VisualResponse",
    "get_companion_service",
    "router",
]
