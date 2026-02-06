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


def analyze_search_intent(text: str) -> dict[str, Any]:
    """
    Use AI to analyze user message and extract search parameters in ONE call.

    Returns dict with:
    - needs_search: bool - whether web search is needed
    - location: str | None - English location for Firecrawl
    - time_filter: str | None - tbs parameter value
    """
    from openai import OpenAI

    from app.core.config import get_settings

    try:
        settings = get_settings()
        if not settings.modelscope_key:
            return {"needs_search": False, "location": None, "time_filter": None}

        client = OpenAI(
            api_key=settings.modelscope_key,
            base_url=settings.modelscope_base_url,
        )

        response = client.chat.completions.create(
            model=settings.modelscope_model,
            messages=[
                {
                    "role": "user",
                    "content": f"""分析用户消息，返回JSON格式结果。

## 判断规则

needs_search = true 的情况：
- 询问具体地点、机构、服务（如月子中心、医院）
- 询问最新信息、新闻、活动
- 询问医学知识、症状、治疗方法
- 询问"怎么办"、"如何"等需要专业知识的问题

needs_search = false 的情况：
- 情感倾诉（如"我好累"）
- 日常闲聊、打招呼

location：如果提到中国地名，翻译成英文格式如 "Yangpu,Shanghai,China"，否则为 null

time_filter：
- 提到"今天" → "qdr:d"
- 提到"本周/最近几天" → "qdr:w"
- 提到"最近/近期/本月" → "qdr:m"
- 提到"最新" → "qdr:w"
- 否则为 null

## 返回格式（只返回JSON，不要其他内容）
{{"needs_search": true/false, "location": "..." or null, "time_filter": "..." or null}}

用户消息：{text}""",
                }
            ],
            temperature=0,
            max_tokens=100,
        )
        result = response.choices[0].message.content or "{}"

        # Parse JSON response
        import json

        try:
            parsed = json.loads(result.strip())
            return {
                "needs_search": parsed.get("needs_search", False),
                "location": parsed.get("location"),
                "time_filter": parsed.get("time_filter"),
            }
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse search intent JSON: {result}")
            return {"needs_search": False, "location": None, "time_filter": None}

    except Exception as e:
        logger.warning(f"AI analyze_search_intent failed: {e}")
        return {"needs_search": False, "location": None, "time_filter": None}


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
        location: str | None = None,
        tbs: str | None = None,
    ) -> dict[str, Any]:
        """
        Perform a web search using Firecrawl API.

        Args:
            query: Search query string
            max_results: Maximum number of results (1-10)
            location: Geographic location for search (e.g., "Shanghai,China")
            tbs: Time-based filter (e.g., "qdr:d" for past day)

        Returns:
            dict with 'results' key containing search results
        """
        if not self.is_configured:
            logger.warning("Firecrawl API not configured, skipping web search")
            return {"results": []}

        client = await self._get_client()

        # Build request payload
        payload: dict[str, Any] = {
            "query": query,
            "limit": max_results,
            "scrapeOptions": {
                "formats": ["markdown"],
                "onlyMainContent": True,  # Exclude nav, footer, etc.
            },
            "country": "CN",  # Default to China for Chinese queries
        }

        # Add optional location parameter
        if location:
            payload["location"] = location
            logger.debug(f"Using location filter: {location}")

        # Add optional time-based filter
        if tbs:
            payload["tbs"] = tbs
            logger.debug(f"Using time filter: {tbs}")

        try:
            response = await client.post(
                f"{self._base_url}/search",
                headers={
                    "Authorization": f"Bearer {self._api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

            if not data.get("success"):
                logger.error(f"Firecrawl search failed: {data}")
                return {"results": []}

            # Filter out PDFs and extract only needed fields
            results = []
            for r in data.get("data", []):
                url = r.get("url", "")
                # Skip PDF files
                if url.lower().endswith(".pdf"):
                    continue
                results.append(
                    {
                        "title": r.get("title", ""),
                        "url": url,
                        "content": strip_markdown(
                            (r.get("description") or r.get("markdown", ""))[:500]
                        ),
                    }
                )
                if len(results) >= max_results:
                    break

            return {"results": results}
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

        # Use ONE LLM call to analyze search intent, location, and time
        intent = analyze_search_intent(question)

        if not intent["needs_search"]:
            logger.debug(
                f"Skipping search for non-factual question: {question[:50]}..."
            )
            return None

        location = intent["location"]
        tbs = intent["time_filter"]

        if location:
            logger.info(f"Extracted location from query: {location}")
        if tbs:
            logger.info(f"Extracted time filter from query: {tbs}")

        # Use original question as search query (trimmed to reasonable length)
        search_query = question[:100].strip()

        results = await self.search(
            search_query, max_results=10, location=location, tbs=tbs
        )

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
