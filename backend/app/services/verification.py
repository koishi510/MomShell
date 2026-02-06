"""Chain-of-Verification (CoVe) service for reducing AI hallucinations.

This service implements an optimized CoVe approach in a single LLM call:
1. Extract factual claims from response
2. Verify claims against search results
3. Generate corrected response if needed

Reference: https://arxiv.org/abs/2309.11495
"""

import json
import logging
from typing import Any

from openai import OpenAI

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Combined prompt for verification and correction in ONE call
VERIFY_AND_CORRECT_PROMPT = """你是一个事实核查助手。请分析以下AI回复，验证其中的事实性陈述，并在必要时进行修正。

## AI回复
{response}

## 参考资料（来自网络搜索）
{context}

## 任务
1. 识别回复中的事实性陈述（不包括情感表达）
2. 对照参考资料验证这些陈述
3. 如果发现错误或无法验证的事实，生成修正后的回复

## 返回格式（JSON）
{{
  "has_factual_claims": true/false,
  "claims_found": ["陈述1", "陈述2"],
  "verification": {{
    "verified": ["已验证的陈述"],
    "unverified": ["无法验证的陈述"],
    "incorrect": ["错误的陈述"]
  }},
  "needs_correction": true/false,
  "corrected_response": "修正后的回复（保持温暖语气，100-200字）或null"
}}

只返回JSON，不要其他内容。"""


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

    def verify_and_correct(
        self,
        response: str,
        search_context: str | None,
    ) -> tuple[str, dict[str, Any]]:
        """
        Verify a response and correct if needed in ONE LLM call.

        Args:
            response: The initial LLM response
            search_context: The web search context used for generation

        Returns:
            Tuple of (corrected_response, verification_metadata)
        """
        # If no search context, skip verification
        if not search_context:
            return response, {"skipped": True, "reason": "no_search_context"}

        try:
            result = self.client.chat.completions.create(
                model=self._model,
                messages=[
                    {
                        "role": "user",
                        "content": VERIFY_AND_CORRECT_PROMPT.format(
                            response=response,
                            context=search_context,
                        ),
                    }
                ],
                temperature=0.3,
                max_tokens=1024,
            )
            content = result.choices[0].message.content or "{}"

            # Parse JSON response
            parsed = json.loads(content.strip())

            # Check if there are factual claims
            if not parsed.get("has_factual_claims", False):
                return response, {"skipped": True, "reason": "no_claims"}

            claims = parsed.get("claims_found", [])
            verification = parsed.get("verification", {})

            logger.info(
                f"CoVe: {len(verification.get('verified', []))} verified, "
                f"{len(verification.get('unverified', []))} unverified, "
                f"{len(verification.get('incorrect', []))} incorrect"
            )

            # If correction is needed and provided, use it
            if parsed.get("needs_correction") and parsed.get("corrected_response"):
                return parsed["corrected_response"], {
                    "corrected": True,
                    "claims": claims,
                    "verification": verification,
                }

            # If only unverified claims, add disclaimer
            if (
                verification.get("unverified")
                and not verification.get("verified")
                and not verification.get("incorrect")
            ):
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

        except json.JSONDecodeError as e:
            logger.warning(f"CoVe JSON parse failed: {e}")
            return response, {"error": "json_parse_failed"}
        except Exception as e:
            logger.warning(f"CoVe failed: {e}")
            return response, {"error": str(e)}


# Global service instance
_cove_service: ChainOfVerification | None = None


def get_cove_service() -> ChainOfVerification:
    """Get the Chain-of-Verification service singleton."""
    global _cove_service
    if _cove_service is None:
        _cove_service = ChainOfVerification()
    return _cove_service
