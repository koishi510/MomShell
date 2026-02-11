"""Sticker generation service using ModelScope image API."""

import logging
from typing import Any

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Placeholder image for when generation fails
PLACEHOLDER_STICKER_URL = "https://placehold.co/512x512/fef3c7/78350f?text=Memory+Sticker"


class StickerGenerator:
    """Generate stickers using ModelScope image generation API."""

    # ModelScope image generation endpoint
    # Using flux-schnell model for fast image generation
    MODELSCOPE_IMAGE_API = "https://api-inference.modelscope.cn/api/v1/models/black-forest-labs/FLUX.1-schnell/text-to-image"

    def __init__(self):
        self.api_key = settings.modelscope_key

    def _build_prompt(self, memory_text: str, style: str = "sticker") -> str:
        """Build a prompt for image generation based on memory text."""
        style_prefixes = {
            "sticker": "A cute kawaii sticker illustration of",
            "watercolor": "A soft watercolor painting of",
            "sketch": "A pencil sketch of",
            "vintage": "A vintage photograph style image of",
        }

        prefix = style_prefixes.get(style, style_prefixes["sticker"])

        # Create a visual description from memory text
        prompt = f"{prefix} {memory_text}, simple clean design, white background, warm pastel colors, minimalist, suitable for scrapbook"

        return prompt

    async def generate(
        self,
        memory_text: str,
        style: str = "sticker",
    ) -> dict[str, Any]:
        """
        Generate a sticker image from memory description.

        Args:
            memory_text: Description of the memory
            style: Generation style (sticker, watercolor, sketch, vintage)

        Returns:
            Dictionary with image_url, prompt, and generation details
        """
        prompt = self._build_prompt(memory_text, style)

        logger.info(f"Generating sticker with prompt: {prompt[:100]}...")

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    self.MODELSCOPE_IMAGE_API,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "input": {
                            "prompt": prompt,
                        },
                        "parameters": {
                            "width": 512,
                            "height": 512,
                            "num_inference_steps": 4,  # flux-schnell is fast
                        },
                    },
                )

                if response.status_code == 200:
                    result = response.json()
                    # ModelScope returns image URL in the response
                    image_url = result.get("output", {}).get("image_url", "")

                    if not image_url and "images" in result.get("output", {}):
                        # Alternative response format
                        images = result["output"]["images"]
                        if images:
                            image_url = images[0]

                    return {
                        "success": True,
                        "image_url": image_url,
                        "prompt": prompt,
                        "style": style,
                        "model": "FLUX.1-schnell",
                    }
                else:
                    logger.warning(f"Image generation failed: {response.status_code} - {response.text}")
                    # Return placeholder instead of failing
                    return {
                        "success": True,
                        "image_url": PLACEHOLDER_STICKER_URL,
                        "prompt": prompt,
                        "style": style,
                        "model": "placeholder",
                        "note": "Using placeholder due to API unavailability",
                    }

        except Exception as e:
            logger.warning(f"Image generation error: {str(e)}, using placeholder")
            # Return placeholder instead of failing
            return {
                "success": True,
                "image_url": PLACEHOLDER_STICKER_URL,
                "prompt": prompt,
                "style": style,
                "model": "placeholder",
                "note": f"Using placeholder due to error: {str(e)}",
            }

    async def generate_from_keywords(
        self,
        keywords: list[str],
        style: str = "sticker",
    ) -> dict[str, Any]:
        """
        Generate a sticker from memory keywords.

        Args:
            keywords: List of memory-related keywords
            style: Generation style

        Returns:
            Dictionary with image_url and generation details
        """
        memory_text = ", ".join(keywords)
        return await self.generate(memory_text, style)


# Singleton instance
_sticker_generator: StickerGenerator | None = None


def get_sticker_generator() -> StickerGenerator:
    """Get or create sticker generator instance."""
    global _sticker_generator
    if _sticker_generator is None:
        _sticker_generator = StickerGenerator()
    return _sticker_generator
