"""Web search service for grounding AI responses with real information.

This service integrates with Firecrawl API to provide web search capabilities
for reducing AI hallucinations in medical/factual questions.
"""

import logging
import re
from typing import Any

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Keywords that suggest a factual/medical question needing web search
FACTUAL_KEYWORDS = [
    # Medical terms (Chinese)
    "产后",
    "恢复",
    "母乳",
    "喂养",
    "婴儿",
    "宝宝",
    "症状",
    "治疗",
    "药物",
    "医生",
    "医院",
    "感染",
    "发烧",
    "疼痛",
    "出血",
    "伤口",
    "抑郁",
    "焦虑",
    "睡眠",
    "失眠",
    "盆底",
    "腹直肌",
    "分离",
    "运动",
    "营养",
    "饮食",
    "食物",
    "维生素",
    # Medical terms (English)
    "postpartum",
    "recovery",
    "breastfeeding",
    "baby",
    "symptom",
    "treatment",
    "medicine",
    "doctor",
    "infection",
    "fever",
    "pain",
    "bleeding",
    "depression",
    "anxiety",
    "sleep",
    "insomnia",
    "pelvic floor",
    "diastasis recti",
    "exercise",
    "nutrition",
    "diet",
    "vitamin",
    # Question indicators
    "怎么",
    "如何",
    "为什么",
    "是什么",
    "什么是",
    "应该",
    "需要",
    "可以吗",
    "正常吗",
    "有什么",
    "哪些",
    "推荐",
    "建议",
    "how",
    "what",
    "why",
    "should",
    "can",
    "need",
    "recommend",
    "suggest",
]

# Keywords that suggest emotional support (no search needed)
EMOTIONAL_KEYWORDS = [
    "累了",
    "难过",
    "伤心",
    "哭",
    "崩溃",
    "孤独",
    "害怕",
    "担心",
    "烦躁",
    "开心",
    "高兴",
    "感谢",
    "谢谢",
    "tired",
    "sad",
    "cry",
    "lonely",
    "scared",
    "worried",
    "happy",
    "thankful",
]


def strip_markdown(text: str) -> str:
    """
    Remove markdown formatting from text to prevent AI from mimicking markdown style.

    Strips: headers, bold, italic, links, images, code blocks, lists, etc.
    """
    if not text:
        return text

    # Remove code blocks (```...```)
    text = re.sub(r"```[\s\S]*?```", "", text)

    # Remove inline code (`...`)
    text = re.sub(r"`[^`]+`", "", text)

    # Remove images ![alt](url)
    text = re.sub(r"!\[[^\]]*\]\([^)]+\)", "", text)

    # Remove links [text](url) -> keep text
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)

    # Remove headers (# ## ### etc)
    text = re.sub(r"^#{1,6}\s+", "", text, flags=re.MULTILINE)

    # Remove bold **text** or __text__
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"__([^_]+)__", r"\1", text)

    # Remove italic *text* or _text_
    text = re.sub(r"\*([^*]+)\*", r"\1", text)
    text = re.sub(r"_([^_]+)_", r"\1", text)

    # Remove strikethrough ~~text~~
    text = re.sub(r"~~([^~]+)~~", r"\1", text)

    # Remove blockquotes (> at start of line)
    text = re.sub(r"^>\s*", "", text, flags=re.MULTILINE)

    # Remove horizontal rules (---, ***, ___)
    text = re.sub(r"^[-*_]{3,}\s*$", "", text, flags=re.MULTILINE)

    # Remove list markers (- * + and numbered lists)
    text = re.sub(r"^\s*[-*+]\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*\d+\.\s+", "", text, flags=re.MULTILINE)

    # Remove HTML tags
    text = re.sub(r"<[^>]+>", "", text)

    # Clean up extra whitespace
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = text.strip()

    return text


def should_search(text: str) -> bool:
    """
    Determine if a text query should trigger web search.

    Returns True for factual/medical questions, False for emotional support.
    """
    text_lower = text.lower()

    # Check for emotional content first (no search needed)
    emotional_score = sum(1 for kw in EMOTIONAL_KEYWORDS if kw in text_lower)
    if emotional_score >= 2:
        return False

    # Check for factual/medical content
    factual_score = sum(1 for kw in FACTUAL_KEYWORDS if kw in text_lower)

    # Check for question patterns
    question_patterns = [
        r"怎么[办回]",
        r"如何",
        r"为什么",
        r"是什么",
        r"有什么",
        r"推荐",
        r"正常吗",
        r"可以吗",
        r"需要.+吗",
        r"\?$",
        r"？$",
    ]
    has_question_pattern = any(re.search(p, text) for p in question_patterns)

    # Trigger search if factual keywords found AND question pattern present
    return factual_score >= 1 and has_question_pattern


def extract_keywords(text: str, max_keywords: int = 5) -> str:
    """
    Extract keywords from text for optimized search query.

    Instead of using the full sentence, extract relevant keywords
    to improve search quality.

    Args:
        text: The input text (question/comment)
        max_keywords: Maximum number of keywords to extract

    Returns:
        A space-separated string of keywords for search
    """
    text_lower = text.lower()

    # Extract matching factual keywords from the text
    found_keywords = []
    for kw in FACTUAL_KEYWORDS:
        if kw in text_lower and kw not in found_keywords:
            found_keywords.append(kw)

    # Also extract Chinese noun phrases (simple heuristic)
    # Look for 2-4 character Chinese word patterns that might be nouns
    chinese_pattern = re.findall(r"[\u4e00-\u9fff]{2,4}", text)
    for phrase in chinese_pattern:
        # Skip if it's a question word or emotional keyword
        if phrase in ["怎么", "如何", "为什么", "是什么", "什么", "有什么", "哪些"]:
            continue
        if phrase in EMOTIONAL_KEYWORDS:
            continue
        if phrase not in found_keywords:
            found_keywords.append(phrase)

    # Limit to max_keywords
    keywords = found_keywords[:max_keywords]

    # If we found keywords, return them; otherwise return original text trimmed
    if keywords:
        return " ".join(keywords)
    else:
        # Fallback: return first 50 chars of original text
        return text[:50].strip()


class WebSearchService:
    """Service for performing web searches using Firecrawl API."""

    def __init__(self) -> None:
        settings = get_settings()
        self._api_key = settings.firecrawl_api_key
        self._base_url = "https://api.firecrawl.dev/v1"
        self._client: httpx.AsyncClient | None = None

    @property
    def is_configured(self) -> bool:
        """Check if Firecrawl API is configured."""
        return bool(self._api_key)

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=30.0)
        return self._client

    async def search(
        self,
        query: str,
        max_results: int = 3,
    ) -> dict[str, Any]:
        """
        Perform a web search using Firecrawl API.

        Args:
            query: Search query string
            max_results: Maximum number of results (1-10)

        Returns:
            dict with 'results' key containing search results
        """
        if not self.is_configured:
            logger.warning("Firecrawl API not configured, skipping web search")
            return {"results": []}

        client = await self._get_client()

        try:
            response = await client.post(
                f"{self._base_url}/search",
                headers={
                    "Authorization": f"Bearer {self._api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "query": query,
                    "limit": max_results,
                    "scrapeOptions": {"formats": ["markdown"]},
                },
            )
            response.raise_for_status()
            data = response.json()

            if not data.get("success"):
                logger.error(f"Firecrawl search failed: {data}")
                return {"results": []}

            return {
                "results": [
                    {
                        "title": r.get("title", ""),
                        "url": r.get("url", ""),
                        "content": strip_markdown(
                            (r.get("description") or r.get("markdown", ""))[:500]
                        ),
                    }
                    for r in data.get("data", [])[:max_results]
                ],
            }
        except httpx.HTTPStatusError as e:
            logger.error(
                f"Firecrawl API error: {e.response.status_code} - {e.response.text}"
            )
            return {"results": []}
        except Exception as e:
            logger.error(f"Web search failed: {e}")
            return {"results": []}

    async def search_for_context(self, question: str) -> str | None:
        """
        Search web and format results as context for LLM.

        Returns a formatted string with search results, or None if no results.
        """
        if not self.is_configured:
            return None

        if not should_search(question):
            logger.debug(
                f"Skipping search for non-factual question: {question[:50]}..."
            )
            return None

        # Extract keywords for optimized search query
        search_query = extract_keywords(question)
        logger.debug(f"Extracted search keywords: {search_query}")

        results = await self.search(search_query, max_results=10)

        if not results["results"]:
            return None

        # Format context for LLM
        context_parts = ["【参考来源（来自网络搜索）】"]
        for i, r in enumerate(results["results"], 1):
            context_parts.append(f"{i}. {r['title']}")
            if r["content"]:
                content_preview = r["content"][:500].strip()
                if len(r["content"]) > 500:
                    content_preview += "..."
                context_parts.append(f"   {content_preview}")

        return "\n".join(context_parts)

    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None


# Global service instance
_web_search_service: WebSearchService | None = None


def get_web_search_service() -> WebSearchService:
    """Get the web search service singleton."""
    global _web_search_service
    if _web_search_service is None:
        _web_search_service = WebSearchService()
    return _web_search_service
