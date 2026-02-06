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


def extract_location(text: str) -> str | None:
    """
    Extract location names from Chinese text using jieba POS tagging,
    then translate to English using LLM.

    Returns location in Firecrawl format like "Shanghai,China".
    """
    import jieba
    import jieba.posseg as pseg
    from openai import OpenAI

    from app.core.config import get_settings

    # Add common location names to jieba dictionary with correct POS
    location_words = [
        "杨浦",
        "宝山",
        "浦东",
        "静安",
        "黄浦",
        "徐汇",
        "长宁",
        "虹口",
        "普陀",
        "闵行",
        "嘉定",
        "松江",
        "青浦",
        "奉贤",
        "金山",
        "崇明",
        "朝阳",
        "海淀",
        "东城",
        "西城",
        "丰台",
        "通州",
        "大兴",
        "顺义",
        "昌平",
        "天河",
        "越秀",
        "荔湾",
        "福田",
        "南山",
        "罗湖",
    ]
    for word in location_words:
        jieba.add_word(word, tag="ns")

    # POS tags: ns (地名), nr (人名 - some districts are tagged as person names)
    chinese_locations = []
    words = pseg.cut(text)
    for word, flag in words:
        if flag in ("ns", "nr"):  # Include both place names and ambiguous names
            chinese_locations.append(word)

    if not chinese_locations:
        return None

    # Use LLM to translate Chinese location to English
    try:
        settings = get_settings()
        if not settings.modelscope_key:
            return None

        client = OpenAI(
            api_key=settings.modelscope_key,
            base_url=settings.modelscope_base_url,
        )

        location_text = " ".join(chinese_locations)
        response = client.chat.completions.create(
            model=settings.modelscope_model,
            messages=[
                {
                    "role": "user",
                    "content": f"""判断以下词语是否为中国地名（城市、区县、街道等），如果是则翻译成英文。

格式要求：区名,城市名,China（如 Yangpu,Shanghai,China）或 城市名,China（如 Shanghai,China）
如果不是地名（如"康复"、"月子"等普通词汇），返回 NONE
只返回一行结果，不要其他内容。

词语：{location_text}""",
                }
            ],
            temperature=0,
            max_tokens=50,
        )
        result = response.choices[0].message.content or ""
        result = result.strip().split("\n")[0]  # Take only first line

        # If empty, NONE, or looks like an error, return None
        if not result or result.upper() == "NONE" or len(result) < 3:
            return None

        # Ensure it ends with ,China
        if not result.endswith(",China"):
            result = f"{result},China"

        return result

    except Exception as e:
        logger.warning(f"Failed to translate location: {e}")
        return None


def extract_time_filter(text: str) -> str | None:
    """
    Extract time-based filter from Chinese text.

    Returns Firecrawl tbs parameter value like "qdr:d", "qdr:w", etc.
    """
    # Time patterns mapping to tbs values
    time_patterns = [
        # Past hour
        (r"(刚才|刚刚|一小时内|一个小时)", "qdr:h"),
        # Past day
        (r"(今天|今日|24小时|二十四小时)", "qdr:d"),
        # Past week
        (r"(本周|这周|这个星期|一周内|最近几天|近几天)", "qdr:w"),
        # Past month
        (r"(本月|这个月|最近|近期|一个月内)", "qdr:m"),
        # Past year
        (r"(今年|一年内|近一年)", "qdr:y"),
    ]

    for pattern, tbs in time_patterns:
        if re.search(pattern, text):
            return tbs

    # Check for "最新" which implies recent
    if re.search(r"最新", text):
        return "qdr:w"

    return None


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

        if not should_search(question):
            logger.debug(
                f"Skipping search for non-factual question: {question[:50]}..."
            )
            return None

        # Extract location and time filters from the question
        location = extract_location(question)
        tbs = extract_time_filter(question)

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
