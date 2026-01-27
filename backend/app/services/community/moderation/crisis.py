"""Crisis intervention module for mental health emergencies."""

from dataclasses import dataclass


@dataclass
class CrisisResource:
    """Crisis intervention resource."""

    name: str
    description: str
    hotline: str
    url: str | None = None


# Crisis intervention resources in China
CRISIS_RESOURCES: list[CrisisResource] = [
    CrisisResource(
        name="全国心理援助热线",
        description="24小时免费心理援助",
        hotline="400-161-9995",
    ),
    CrisisResource(
        name="北京心理危机研究与干预中心",
        description="专业心理危机干预",
        hotline="010-82951332",
    ),
    CrisisResource(
        name="生命热线",
        description="倾听与陪伴",
        hotline="400-821-1215",
    ),
    CrisisResource(
        name="希望24热线",
        description="全国性心理援助",
        hotline="400-161-9995",
    ),
]


CRISIS_MESSAGE = """
我们注意到你可能正在经历一段困难的时期。请记住，你并不孤单，有很多人愿意帮助你。

如果你正在经历心理困扰，请考虑拨打以下热线寻求帮助：

📞 全国心理援助热线：400-161-9995（24小时）
📞 生命热线：400-821-1215
📞 北京心理危机研究与干预中心：010-82951332

你的感受很重要，寻求帮助是勇敢的表现。
"""


async def trigger_crisis_intervention(
    user_id: str,
    content: str,
    detected_categories: list[str],
) -> dict:
    """
    Trigger crisis intervention when dangerous signals are detected.

    Args:
        user_id: User ID who posted the content
        content: Original content
        detected_categories: List of detected sensitive categories

    Returns:
        Crisis intervention response
    """
    # TODO: In production, implement:
    # 1. Log to special crisis intervention table
    # 2. Notify moderators/admins
    # 3. Consider notifying emergency contacts if configured
    # 4. Track follow-up

    return {
        "intervention_triggered": True,
        "message": CRISIS_MESSAGE,
        "resources": [
            {
                "name": r.name,
                "description": r.description,
                "hotline": r.hotline,
                "url": r.url,
            }
            for r in CRISIS_RESOURCES
        ],
        "user_id": user_id,
        "detected_categories": detected_categories,
    }


def get_crisis_resources() -> list[dict]:
    """Get list of crisis intervention resources."""
    return [
        {
            "name": r.name,
            "description": r.description,
            "hotline": r.hotline,
            "url": r.url,
        }
        for r in CRISIS_RESOURCES
    ]
