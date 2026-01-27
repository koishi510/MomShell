"""Moderation module for content safety."""

from .crisis import (
    CRISIS_MESSAGE,
    CRISIS_RESOURCES,
    CrisisResource,
    get_crisis_resources,
    trigger_crisis_intervention,
)
from .keywords import KeywordFilter
from .service import ModerationDecision, ModerationService, get_moderation_service

__all__ = [
    # Service
    "ModerationService",
    "ModerationDecision",
    "get_moderation_service",
    # Keywords
    "KeywordFilter",
    # Crisis
    "CrisisResource",
    "CRISIS_RESOURCES",
    "CRISIS_MESSAGE",
    "trigger_crisis_intervention",
    "get_crisis_resources",
]
