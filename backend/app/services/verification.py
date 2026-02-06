"""Chain-of-Verification (CoVe) service for reducing AI hallucinations.

This service implements the CoVe approach:
1. Generate baseline response
2. Extract factual claims from response
3. Verify claims against search results
4. Generate corrected response if needed

Reference: https://arxiv.org/abs/2309.11495
"""

import json
import logging
from typing import Any

from openai import OpenAI

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Prompt for extracting factual claims
EXTRACT_CLAIMS_PROMPT = """请从以下回复中提取所有事实性陈述（不包括情感表达和建议）。

回复内容：
{response}

请以 JSON 数组格式返回，每个元素是一个事实性陈述。例如：
["产后抑郁影响10-15%的新妈妈", "盆底肌修复需要6-8周"]

如果没有事实性陈述，返回空数组 []。
只返回 JSON，不要其他内容。"""

# Prompt for verifying claims
VERIFY_CLAIMS_PROMPT = """请验证以下事实性陈述是否与参考资料一致。

## 事实性陈述
{claims}

## 参考资料
{context}

请以 JSON 格式返回验证结果：
{{
  "verified": ["已验证的陈述1", "已验证的陈述2"],
  "unverified": ["无法验证的陈述1"],
  "incorrect": ["与参考资料矛盾的陈述1"]
}}

只返回 JSON，不要其他内容。"""

# Prompt for generating corrected response
CORRECT_RESPONSE_PROMPT = """请修正以下回复，确保事实准确。

## 原始回复
{response}

## 验证结果
- 已验证的事实：{verified}
- 无法验证的事实：{unverified}
- 错误的事实：{incorrect}

## 参考资料
{context}

## 修正要求
1. 保留已验证的事实
2. 对无法验证的事实，改为更谨慎的表述（如"据了解"、"一般认为"）
3. 删除或更正错误的事实
4. 保持原有的温暖、有同理心的语气
5. 回复长度控制在 100-200 字

请直接输出修正后的回复，不需要任何前缀。"""


class ChainOfVerification:
    """Chain-of-Verification service for fact-checking LLM responses."""

    def __init__(self) -> None:
        settings = get_settings()
        self._api_key = settings.modelscope_key
        self._base_url = settings.modelscope_base_url
        self._model = settings.modelscope_model
        self._client: OpenAI | None = None

    @property
    def client(self) -> OpenAI:
        """Lazy load OpenAI client."""
        if self._client is None:
            if not self._api_key:
                raise ValueError("MODELSCOPE_KEY not configured")
            self._client = OpenAI(
                api_key=self._api_key,
                base_url=self._base_url,
            )
        return self._client

    def _extract_claims(self, response: str) -> list[str]:
        """Extract factual claims from a response."""
        try:
            result = self.client.chat.completions.create(
                model=self._model,
                messages=[
                    {
                        "role": "user",
                        "content": EXTRACT_CLAIMS_PROMPT.format(response=response),
                    }
                ],
                temperature=0.1,
                max_tokens=512,
            )
            content = result.choices[0].message.content or "[]"
            # Parse JSON
            claims = json.loads(content.strip())
            if isinstance(claims, list):
                return claims
            return []
        except Exception as e:
            logger.warning(f"Failed to extract claims: {e}")
            return []

    def _verify_claims(self, claims: list[str], context: str) -> dict[str, list[str]]:
        """Verify claims against search context."""
        if not claims:
            return {"verified": [], "unverified": [], "incorrect": []}

        try:
            claims_text = "\n".join(f"- {c}" for c in claims)
            result = self.client.chat.completions.create(
                model=self._model,
                messages=[
                    {
                        "role": "user",
                        "content": VERIFY_CLAIMS_PROMPT.format(
                            claims=claims_text, context=context
                        ),
                    }
                ],
                temperature=0.1,
                max_tokens=512,
            )
            content = result.choices[0].message.content or "{}"
            verification = json.loads(content.strip())
            return {
                "verified": verification.get("verified", []),
                "unverified": verification.get("unverified", []),
                "incorrect": verification.get("incorrect", []),
            }
        except Exception as e:
            logger.warning(f"Failed to verify claims: {e}")
            # If verification fails, treat all as unverified
            return {"verified": [], "unverified": claims, "incorrect": []}

    def _correct_response(
        self,
        response: str,
        verification: dict[str, list[str]],
        context: str,
    ) -> str:
        """Generate corrected response based on verification."""
        try:
            result = self.client.chat.completions.create(
                model=self._model,
                messages=[
                    {
                        "role": "user",
                        "content": CORRECT_RESPONSE_PROMPT.format(
                            response=response,
                            verified=", ".join(verification["verified"]) or "无",
                            unverified=", ".join(verification["unverified"]) or "无",
                            incorrect=", ".join(verification["incorrect"]) or "无",
                            context=context,
                        ),
                    }
                ],
                temperature=0.7,
                max_tokens=512,
            )
            return result.choices[0].message.content or response
        except Exception as e:
            logger.warning(f"Failed to correct response: {e}")
            return response

    def verify_and_correct(
        self,
        response: str,
        search_context: str | None,
    ) -> tuple[str, dict[str, Any]]:
        """
        Verify a response and correct if needed.

        Args:
            response: The initial LLM response
            search_context: The web search context used for generation

        Returns:
            Tuple of (corrected_response, verification_metadata)
        """
        # If no search context, skip verification
        if not search_context:
            return response, {"skipped": True, "reason": "no_search_context"}

        # Step 1: Extract factual claims
        claims = self._extract_claims(response)
        logger.info(f"Extracted {len(claims)} claims from response")

        if not claims:
            return response, {"skipped": True, "reason": "no_claims"}

        # Step 2: Verify claims against context
        verification = self._verify_claims(claims, search_context)
        logger.info(
            f"Verification: {len(verification['verified'])} verified, "
            f"{len(verification['unverified'])} unverified, "
            f"{len(verification['incorrect'])} incorrect"
        )

        # Step 3: If there are incorrect claims, correct the response
        if verification["incorrect"]:
            corrected = self._correct_response(response, verification, search_context)
            return corrected, {
                "corrected": True,
                "claims": claims,
                "verification": verification,
            }

        # If only unverified claims, add disclaimer but don't rewrite
        if verification["unverified"] and not verification["verified"]:
            # Add a gentle disclaimer
            disclaimer = "\n\n（以上信息仅供参考，建议咨询专业医生获取准确建议 💗）"
            return response + disclaimer, {
                "disclaimer_added": True,
                "claims": claims,
                "verification": verification,
            }

        return response, {
            "verified": True,
            "claims": claims,
            "verification": verification,
        }


# Global service instance
_cove_service: ChainOfVerification | None = None


def get_cove_service() -> ChainOfVerification:
    """Get the Chain-of-Verification service singleton."""
    global _cove_service
    if _cove_service is None:
        _cove_service = ChainOfVerification()
    return _cove_service
