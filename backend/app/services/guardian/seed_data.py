"""Seed data for Guardian Partner feature."""

from typing import cast

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .enums import TASK_POINTS, TaskDifficulty
from .models import TaskTemplate

# Default task templates
DEFAULT_TASKS = [
    # Easy tasks (10 points)
    {
        "title": "给太太倒一杯50度的温水",
        "description": "用温度计或手感测试，确保水温适合饮用。产后妈妈需要多喝温水。",
        "difficulty": TaskDifficulty.EASY,
        "category": "日常关怀",
    },
    {
        "title": "帮太太准备一份营养加餐",
        "description": "可以是水果、坚果、酸奶等健康小食，注意避开回奶食物。",
        "difficulty": TaskDifficulty.EASY,
        "category": "日常关怀",
    },
    {
        "title": "主动清洗宝宝的奶瓶和餐具",
        "description": "将所有奶瓶、奶嘴清洗干净并消毒，减轻太太的家务负担。",
        "difficulty": TaskDifficulty.EASY,
        "category": "家务分担",
    },
    {
        "title": "给太太一个拥抱并说'辛苦了'",
        "description": "真诚地拥抱太太，告诉她今天辛苦了。情感支持是最好的礼物。",
        "difficulty": TaskDifficulty.EASY,
        "category": "情感支持",
    },
    {
        "title": "帮宝宝换一次尿布",
        "description": "独立完成一次换尿布，注意清洁和涂抹护臀霜。",
        "difficulty": TaskDifficulty.EASY,
        "category": "育儿参与",
    },
    # Medium tasks (30 points)
    {
        "title": "学习并操作一套5分钟肩颈按摩",
        "description": "观看教学视频学习基础肩颈按摩手法，帮太太缓解肩颈疲劳。",
        "difficulty": TaskDifficulty.MEDIUM,
        "category": "身体关怀",
    },
    {
        "title": "准备一顿月子餐",
        "description": "搜索月子餐食谱，准备一顿营养均衡的正餐。注意清淡、高蛋白。",
        "difficulty": TaskDifficulty.MEDIUM,
        "category": "日常关怀",
    },
    {
        "title": "陪太太散步20分钟",
        "description": "产后适量运动有助于恢复，陪太太在小区或公园慢走散步。",
        "difficulty": TaskDifficulty.MEDIUM,
        "category": "身体关怀",
    },
    {
        "title": "独立给宝宝洗一次澡",
        "description": "准备好温水和洗浴用品，独立完成宝宝洗澡全流程。",
        "difficulty": TaskDifficulty.MEDIUM,
        "category": "育儿参与",
    },
    {
        "title": "整理一次家务（扫地拖地+收拾客厅）",
        "description": "完成基础家务清洁，保持家里整洁，让太太安心休息。",
        "difficulty": TaskDifficulty.MEDIUM,
        "category": "家务分担",
    },
    # Hard tasks (50 points)
    {
        "title": "独立带娃2小时，让太太睡个午觉",
        "description": "全程独立照看宝宝至少2小时，包括喂奶（如有存奶）、换尿布、哄睡。",
        "difficulty": TaskDifficulty.HARD,
        "category": "育儿参与",
    },
    {
        "title": "策划一个小惊喜（手写信或小礼物）",
        "description": "手写一封信或准备一个小礼物，表达你的爱意和感谢。",
        "difficulty": TaskDifficulty.HARD,
        "category": "情感支持",
    },
    {
        "title": "完成一次深度家务（厨房/卫生间大扫除）",
        "description": "选择厨房或卫生间进行一次彻底清洁，包括擦洗台面、整理收纳。",
        "difficulty": TaskDifficulty.HARD,
        "category": "家务分担",
    },
    {
        "title": "学习一项育儿新技能并实践",
        "description": "学习抚触按摩、辅食制作、婴儿游泳等新技能，并当天实践一次。",
        "difficulty": TaskDifficulty.HARD,
        "category": "育儿参与",
    },
]


async def seed_task_templates(db: AsyncSession) -> None:
    """Seed default task templates if they don't exist."""
    result = await db.execute(select(TaskTemplate).limit(1))
    if result.scalar_one_or_none():
        return  # Already seeded

    for task_data in DEFAULT_TASKS:
        difficulty = cast(TaskDifficulty, task_data["difficulty"])
        template = TaskTemplate(
            title=task_data["title"],
            description=task_data["description"],
            difficulty=difficulty,
            points=TASK_POINTS[difficulty],
            category=task_data["category"],
        )
        db.add(template)

    await db.commit()
    print(f"[Startup] Seeded {len(DEFAULT_TASKS)} task templates")
