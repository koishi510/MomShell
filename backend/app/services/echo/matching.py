"""Scene and audio matching algorithms for Echo Domain."""

import json
import random
from typing import TYPE_CHECKING

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

if TYPE_CHECKING:
    from .models import EchoAudioLibrary, EchoIdentityTag, EchoSceneLibrary


async def match_scenes(
    db: AsyncSession,
    identity_tags: list["EchoIdentityTag"],
    limit: int = 5,
) -> list[tuple["EchoSceneLibrary", float]]:
    """
    Match scenes based on identity tags.

    Algorithm:
    1. Extract all tag keywords
    2. Calculate each scene's match score = keyword matches × 10
    3. Add random factor (0.8-1.2) for diversity
    4. Return top N scenes with scores
    """
    from .models import EchoSceneLibrary

    # Extract keywords from tags
    tag_keywords = set()
    for tag in identity_tags:
        # Add the content itself as a keyword
        tag_keywords.add(tag.content.lower())
        # Add words from content
        words = tag.content.lower().replace("，", " ").replace(",", " ").split()
        tag_keywords.update(words)

    if not tag_keywords:
        # If no tags, return random scenes
        result = await db.execute(
            select(EchoSceneLibrary)
            .where(EchoSceneLibrary.is_active.is_(True))
            .order_by(EchoSceneLibrary.sort_order)
            .limit(limit)
        )
        scenes = list(result.scalars().all())
        return [(scene, 0.0) for scene in scenes]

    # Get all active scenes
    result = await db.execute(
        select(EchoSceneLibrary).where(EchoSceneLibrary.is_active.is_(True))
    )
    all_scenes = list(result.scalars().all())

    # Calculate match scores
    scored_scenes: list[tuple[EchoSceneLibrary, float]] = []
    for scene in all_scenes:
        try:
            scene_keywords = set(
                kw.lower() for kw in json.loads(scene.keywords) if isinstance(kw, str)
            )
        except (json.JSONDecodeError, TypeError):
            scene_keywords = set()

        # Count keyword matches
        matches = len(tag_keywords & scene_keywords)

        # Base score = matches × 10
        base_score = matches * 10

        # Add random factor (0.8-1.2) for diversity
        random_factor = random.uniform(0.8, 1.2)
        final_score = base_score * random_factor

        # Boost if category matches tag type hints
        category_boosts = {
            "rock": "abstract",
            "classical": "nature",
            "jazz": "cozy",
            "pop": "abstract",
            "forest": "nature",
            "ocean": "ocean",
            "rain": "nature",
            "cafe": "cozy",
            "vintage": "vintage",
        }
        for keyword in tag_keywords:
            if keyword in category_boosts:
                if scene.category.value == category_boosts[keyword]:
                    final_score += 5

        scored_scenes.append((scene, final_score))

    # Sort by score descending
    scored_scenes.sort(key=lambda x: x[1], reverse=True)

    # Return top N
    return scored_scenes[:limit]


async def match_audio(
    db: AsyncSession,
    identity_tags: list["EchoIdentityTag"],
    limit: int = 5,
) -> list[tuple["EchoAudioLibrary", float]]:
    """
    Match audio based on identity tags.

    Similar algorithm to scene matching, but considers audio-specific keywords.
    """
    from .models import EchoAudioLibrary

    # Extract keywords from tags
    tag_keywords = set()
    for tag in identity_tags:
        tag_keywords.add(tag.content.lower())
        words = tag.content.lower().replace("，", " ").replace(",", " ").split()
        tag_keywords.update(words)

    if not tag_keywords:
        # If no tags, return random audio
        result = await db.execute(
            select(EchoAudioLibrary)
            .where(EchoAudioLibrary.is_active.is_(True))
            .order_by(EchoAudioLibrary.sort_order)
            .limit(limit)
        )
        audios = list(result.scalars().all())
        return [(audio, 0.0) for audio in audios]

    # Get all active audio
    result = await db.execute(
        select(EchoAudioLibrary).where(EchoAudioLibrary.is_active.is_(True))
    )
    all_audio = list(result.scalars().all())

    # Calculate match scores
    scored_audio: list[tuple[EchoAudioLibrary, float]] = []
    for audio in all_audio:
        try:
            audio_keywords = set(
                kw.lower() for kw in json.loads(audio.keywords) if isinstance(kw, str)
            )
        except (json.JSONDecodeError, TypeError):
            audio_keywords = set()

        # Count keyword matches
        matches = len(tag_keywords & audio_keywords)

        # Base score = matches × 10
        base_score = matches * 10

        # Add random factor for diversity
        random_factor = random.uniform(0.8, 1.2)
        final_score = base_score * random_factor

        # Audio type preference based on tag content
        if any(kw in tag_keywords for kw in ["rain", "thunder", "forest", "wind"]):
            if audio.audio_type.value == "nature":
                final_score += 8

        if any(kw in tag_keywords for kw in ["cafe", "city", "street"]):
            if audio.audio_type.value == "ambient":
                final_score += 8

        scored_audio.append((audio, final_score))

    # Sort by score descending
    scored_audio.sort(key=lambda x: x[1], reverse=True)

    return scored_audio[:limit]


def calculate_clarity(
    tasks_confirmed: int,
    tasks_completed: int,
    streak_days: int,
    partner_level: str,
) -> tuple[int, dict[str, int]]:
    """
    Calculate window clarity level.

    Formula:
    - Base: Each confirmed task = +20%, max 60%
    - Additional: Each unconfirmed completed task = +10%, max 20%
    - Streak bonus: streak_days × 2%, max 20%
    - Level bonus: intern=0, trainee=5, regular=10, gold=15

    Returns:
        Tuple of (total_clarity, breakdown_dict)
    """
    # Base from confirmed tasks
    base_clarity = min(tasks_confirmed * 20, 60)

    # Additional from completed but unconfirmed
    unconfirmed_completed = max(0, tasks_completed - tasks_confirmed)
    task_clarity = min(unconfirmed_completed * 10, 20)

    # Streak bonus
    streak_bonus = min(streak_days * 2, 20)

    # Level bonus
    level_bonuses = {
        "intern": 0,
        "trainee": 5,
        "regular": 10,
        "gold": 15,
    }
    level_bonus = level_bonuses.get(partner_level, 0)

    # Calculate total (cap at 100)
    total = min(base_clarity + task_clarity + streak_bonus + level_bonus, 100)

    breakdown = {
        "base_clarity": base_clarity,
        "task_clarity": task_clarity,
        "streak_bonus": streak_bonus,
        "level_bonus": level_bonus,
    }

    return total, breakdown
