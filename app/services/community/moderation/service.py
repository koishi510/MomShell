"""Content moderation service."""

from typing import NamedTuple

from ..enums import ModerationResult, SensitiveCategory
from .keywords import KeywordFilter
from .crisis import trigger_crisis_intervention, CRISIS_MESSAGE


class ModerationDecision(NamedTuple):
    """Moderation decision result."""

    result: ModerationResult
    categories: list[SensitiveCategory]
    confidence: float
    reason: str | None
    crisis_intervention: dict | None = None


class ModerationService:
    """Content moderation service."""

    # Categories that trigger automatic rejection (high risk)
    AUTO_REJECT_CATEGORIES = {
        SensitiveCategory.PSEUDOSCIENCE,
        SensitiveCategory.SOFT_PORNOGRAPHY,
        SensitiveCategory.VIOLENCE,
        SensitiveCategory.SPAM,
        SensitiveCategory.HARASSMENT,
    }

    # Categories that trigger crisis intervention
    CRISIS_INTERVENTION_CATEGORIES = {
        SensitiveCategory.DEPRESSION_TRIGGER,
        SensitiveCategory.SELF_HARM,
    }

    # Categories that need manual review
    MANUAL_REVIEW_CATEGORIES = {
        SensitiveCategory.MISINFORMATION,
        SensitiveCategory.POLITICAL,
    }

    def __init__(self, keyword_filter: KeywordFilter | None = None):
        """
        Initialize moderation service.

        Args:
            keyword_filter: Custom keyword filter, uses default if not provided
        """
        self._keyword_filter = keyword_filter or KeywordFilter()

    async def moderate_text(
        self,
        content: str,
        user_id: str | None = None,
    ) -> ModerationDecision:
        """
        Moderate text content.

        Args:
            content: Text content to moderate
            user_id: User ID for crisis intervention

        Returns:
            ModerationDecision with result and details
        """
        detected_categories: list[SensitiveCategory] = []

        # Step 1: Keyword filtering
        keyword_matches = self._keyword_filter.scan(content)
        detected_categories.extend(keyword_matches)

        # Step 2: TODO - LLM-based analysis (optional enhancement)
        # This could be added later for more sophisticated detection

        # Remove duplicates
        detected_categories = list(set(detected_categories))

        # Step 3: Make decision
        return await self._make_decision(detected_categories, user_id)

    async def moderate_images(
        self,
        image_urls: list[str],
    ) -> ModerationDecision:
        """
        Moderate image content.

        Args:
            image_urls: List of image URLs to moderate

        Returns:
            ModerationDecision with result and details

        Note:
            This is a placeholder. In production, integrate with
            image moderation APIs (e.g., Aliyun Content Security,
            Tencent Cloud Image Moderation, etc.)
        """
        # TODO: Implement actual image moderation
        # For now, pass all images
        return ModerationDecision(
            result=ModerationResult.PASSED,
            categories=[],
            confidence=1.0,
            reason=None,
        )

    async def _make_decision(
        self,
        categories: list[SensitiveCategory],
        user_id: str | None = None,
    ) -> ModerationDecision:
        """
        Make moderation decision based on detected categories.

        Args:
            categories: List of detected sensitive categories
            user_id: User ID for crisis intervention

        Returns:
            ModerationDecision with appropriate action
        """
        if not categories:
            return ModerationDecision(
                result=ModerationResult.PASSED,
                categories=[],
                confidence=1.0,
                reason=None,
            )

        # Check for crisis intervention categories
        crisis_cats = [
            c for c in categories if c in self.CRISIS_INTERVENTION_CATEGORIES
        ]
        if crisis_cats:
            crisis_response = None
            if user_id:
                crisis_response = await trigger_crisis_intervention(
                    user_id=user_id,
                    content="",  # Don't log actual content for privacy
                    detected_categories=[c.value for c in crisis_cats],
                )
            return ModerationDecision(
                result=ModerationResult.REJECTED,
                categories=crisis_cats,
                confidence=0.95,
                reason="检测到可能存在心理危机，已推送帮助资源。如需发布，请修改内容后重试。",
                crisis_intervention=crisis_response,
            )

        # Check for auto-reject categories
        reject_cats = [c for c in categories if c in self.AUTO_REJECT_CATEGORIES]
        if reject_cats:
            reasons = {
                SensitiveCategory.PSEUDOSCIENCE: "内容可能包含未经证实的医疗信息",
                SensitiveCategory.SOFT_PORNOGRAPHY: "内容包含不适当信息",
                SensitiveCategory.VIOLENCE: "内容包含暴力相关信息",
                SensitiveCategory.SPAM: "内容疑似广告或垃圾信息",
                SensitiveCategory.HARASSMENT: "内容包含不友善言论",
            }
            reason_parts = [reasons.get(c, "内容违反社区规范") for c in reject_cats]
            return ModerationDecision(
                result=ModerationResult.REJECTED,
                categories=reject_cats,
                confidence=0.9,
                reason="；".join(set(reason_parts)),
            )

        # Check for manual review categories
        manual_cats = [c for c in categories if c in self.MANUAL_REVIEW_CATEGORIES]
        if manual_cats:
            return ModerationDecision(
                result=ModerationResult.NEED_MANUAL_REVIEW,
                categories=manual_cats,
                confidence=0.7,
                reason="内容需要人工审核",
            )

        # Unknown categories - default to pass with lower confidence
        return ModerationDecision(
            result=ModerationResult.PASSED,
            categories=categories,
            confidence=0.8,
            reason=None,
        )


# Module-level service instance (singleton pattern)
_moderation_service: ModerationService | None = None


def get_moderation_service() -> ModerationService:
    """Get ModerationService singleton instance."""
    global _moderation_service
    if _moderation_service is None:
        _moderation_service = ModerationService()
    return _moderation_service
