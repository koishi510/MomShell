"""Seed data for Echo Domain - preset scenes and audio."""

import json

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .enums import AudioType, SceneCategory
from .models import EchoAudioLibrary, EchoSceneLibrary

# ============================================================
# Preset Scenes
# ============================================================

PRESET_SCENES = [
    # Nature scenes
    {
        "title": "静谧森林",
        "description": "阳光透过树叶洒下斑驳光影，一条小径通向未知",
        "image_url": "/static/echo/scenes/forest.jpg",
        "thumbnail_url": "/static/echo/scenes/forest_thumb.jpg",
        "category": SceneCategory.NATURE,
        "keywords": [
            "森林",
            "树木",
            "阳光",
            "安静",
            "自然",
            "绿色",
            "forest",
            "nature",
        ],
    },
    {
        "title": "山间云海",
        "description": "站在山巅俯瞰云海翻涌，世界在脚下静静流淌",
        "image_url": "/static/echo/scenes/mountains.jpg",
        "thumbnail_url": "/static/echo/scenes/mountains_thumb.jpg",
        "category": SceneCategory.NATURE,
        "keywords": [
            "山",
            "云海",
            "高处",
            "壮观",
            "自然",
            "宁静",
            "mountains",
            "clouds",
        ],
    },
    {
        "title": "雨后花园",
        "description": "雨后的花园空气清新，水珠在花瓣上闪烁",
        "image_url": "/static/echo/scenes/garden.jpg",
        "thumbnail_url": "/static/echo/scenes/garden_thumb.jpg",
        "category": SceneCategory.NATURE,
        "keywords": ["花园", "雨后", "清新", "花朵", "自然", "春天", "garden", "rain"],
    },
    # Ocean scenes
    {
        "title": "日落海滩",
        "description": "金色的阳光洒在海面上，浪花轻轻拍打沙滩",
        "image_url": "/static/echo/scenes/beach_sunset.jpg",
        "thumbnail_url": "/static/echo/scenes/beach_sunset_thumb.jpg",
        "category": SceneCategory.OCEAN,
        "keywords": [
            "海滩",
            "日落",
            "海浪",
            "沙滩",
            "金色",
            "浪漫",
            "beach",
            "sunset",
            "ocean",
        ],
    },
    {
        "title": "深海静谧",
        "description": "深蓝色的海水中，光线柔和地穿透水面",
        "image_url": "/static/echo/scenes/deep_ocean.jpg",
        "thumbnail_url": "/static/echo/scenes/deep_ocean_thumb.jpg",
        "category": SceneCategory.OCEAN,
        "keywords": ["海洋", "深海", "蓝色", "安静", "神秘", "ocean", "deep", "blue"],
    },
    # Cozy scenes
    {
        "title": "温暖书房",
        "description": "壁炉边的舒适角落，一杯茶，一本书",
        "image_url": "/static/echo/scenes/cozy_study.jpg",
        "thumbnail_url": "/static/echo/scenes/cozy_study_thumb.jpg",
        "category": SceneCategory.COZY,
        "keywords": ["书房", "温暖", "壁炉", "阅读", "舒适", "室内", "cozy", "reading"],
    },
    {
        "title": "雨天咖啡馆",
        "description": "窗外雨声淅沥，咖啡香气弥漫的午后",
        "image_url": "/static/echo/scenes/rainy_cafe.jpg",
        "thumbnail_url": "/static/echo/scenes/rainy_cafe_thumb.jpg",
        "category": SceneCategory.COZY,
        "keywords": ["咖啡馆", "下雨", "温暖", "午后", "咖啡", "cafe", "rain", "cozy"],
    },
    {
        "title": "星光露台",
        "description": "夜晚的露台，繁星点点，微风轻拂",
        "image_url": "/static/echo/scenes/starry_terrace.jpg",
        "thumbnail_url": "/static/echo/scenes/starry_terrace_thumb.jpg",
        "category": SceneCategory.COZY,
        "keywords": [
            "露台",
            "星空",
            "夜晚",
            "浪漫",
            "微风",
            "stars",
            "night",
            "terrace",
        ],
    },
    # Abstract scenes
    {
        "title": "流动色彩",
        "description": "柔和的色彩相互流动融合，如梦似幻",
        "image_url": "/static/echo/scenes/abstract_colors.jpg",
        "thumbnail_url": "/static/echo/scenes/abstract_colors_thumb.jpg",
        "category": SceneCategory.ABSTRACT,
        "keywords": [
            "抽象",
            "色彩",
            "艺术",
            "流动",
            "梦幻",
            "abstract",
            "colors",
            "art",
        ],
    },
    {
        "title": "光与影",
        "description": "简约的光影交织，创造宁静的视觉空间",
        "image_url": "/static/echo/scenes/light_shadow.jpg",
        "thumbnail_url": "/static/echo/scenes/light_shadow_thumb.jpg",
        "category": SceneCategory.ABSTRACT,
        "keywords": [
            "光影",
            "简约",
            "现代",
            "艺术",
            "冥想",
            "light",
            "shadow",
            "minimal",
        ],
    },
    # Vintage scenes
    {
        "title": "老唱片店",
        "description": "复古的唱片店，黑胶唱片旋转，音乐流淌",
        "image_url": "/static/echo/scenes/record_store.jpg",
        "thumbnail_url": "/static/echo/scenes/record_store_thumb.jpg",
        "category": SceneCategory.VINTAGE,
        "keywords": [
            "唱片",
            "复古",
            "音乐",
            "怀旧",
            "黑胶",
            "vinyl",
            "vintage",
            "music",
        ],
    },
    {
        "title": "旧时光影院",
        "description": "老式电影院的红色座椅，银幕上光影闪烁",
        "image_url": "/static/echo/scenes/vintage_cinema.jpg",
        "thumbnail_url": "/static/echo/scenes/vintage_cinema_thumb.jpg",
        "category": SceneCategory.VINTAGE,
        "keywords": [
            "电影院",
            "复古",
            "怀旧",
            "红色",
            "电影",
            "cinema",
            "vintage",
            "retro",
        ],
    },
]

# ============================================================
# Preset Audio
# ============================================================

PRESET_AUDIO = [
    # Nature sounds
    {
        "title": "森林鸟鸣",
        "description": "清晨森林中各种鸟类的歌声",
        "audio_url": "/static/echo/audio/forest_birds.mp3",
        "duration_seconds": 600,
        "audio_type": AudioType.NATURE,
        "keywords": ["森林", "鸟", "自然", "清晨", "宁静", "forest", "birds", "nature"],
        "source": "freesound",
    },
    {
        "title": "温柔雨声",
        "description": "轻柔的雨滴落在窗户和树叶上",
        "audio_url": "/static/echo/audio/gentle_rain.mp3",
        "duration_seconds": 600,
        "audio_type": AudioType.NATURE,
        "keywords": ["雨", "下雨", "安静", "放松", "rain", "gentle", "relaxing"],
        "source": "freesound",
    },
    {
        "title": "海浪轻拍",
        "description": "海浪有节奏地轻轻拍打沙滩",
        "audio_url": "/static/echo/audio/ocean_waves.mp3",
        "duration_seconds": 600,
        "audio_type": AudioType.NATURE,
        "keywords": ["海浪", "海洋", "沙滩", "放松", "ocean", "waves", "beach"],
        "source": "freesound",
    },
    {
        "title": "潺潺溪流",
        "description": "山间小溪流过石头的声音",
        "audio_url": "/static/echo/audio/stream.mp3",
        "duration_seconds": 600,
        "audio_type": AudioType.NATURE,
        "keywords": ["溪流", "水声", "山间", "自然", "stream", "water", "nature"],
        "source": "freesound",
    },
    {
        "title": "夏日虫鸣",
        "description": "夏夜的蝉鸣和蟋蟀声",
        "audio_url": "/static/echo/audio/summer_insects.mp3",
        "duration_seconds": 600,
        "audio_type": AudioType.NATURE,
        "keywords": ["夏天", "虫鸣", "蝉", "夜晚", "summer", "insects", "night"],
        "source": "freesound",
    },
    # Ambient sounds
    {
        "title": "咖啡馆低语",
        "description": "舒适咖啡馆的背景人声和咖啡机声",
        "audio_url": "/static/echo/audio/cafe_ambient.mp3",
        "duration_seconds": 600,
        "audio_type": AudioType.AMBIENT,
        "keywords": ["咖啡馆", "背景", "人声", "咖啡", "cafe", "ambient", "coffee"],
        "source": "freesound",
    },
    {
        "title": "壁炉噼啪",
        "description": "温暖壁炉的木柴燃烧声",
        "audio_url": "/static/echo/audio/fireplace.mp3",
        "duration_seconds": 600,
        "audio_type": AudioType.AMBIENT,
        "keywords": ["壁炉", "火焰", "温暖", "冬天", "fireplace", "fire", "warm"],
        "source": "freesound",
    },
    {
        "title": "图书馆静谧",
        "description": "图书馆中轻微的翻书声和脚步声",
        "audio_url": "/static/echo/audio/library.mp3",
        "duration_seconds": 600,
        "audio_type": AudioType.AMBIENT,
        "keywords": ["图书馆", "安静", "翻书", "学习", "library", "quiet", "study"],
        "source": "freesound",
    },
    # Music
    {
        "title": "钢琴冥想曲",
        "description": "舒缓的钢琴旋律，适合深度放松",
        "audio_url": "/static/echo/audio/piano_meditation.mp3",
        "duration_seconds": 600,
        "audio_type": AudioType.MUSIC,
        "keywords": [
            "钢琴",
            "冥想",
            "放松",
            "古典",
            "piano",
            "meditation",
            "classical",
        ],
        "source": "freesound",
    },
    {
        "title": "环境音乐",
        "description": "空灵的电子环境音乐",
        "audio_url": "/static/echo/audio/ambient_electronic.mp3",
        "duration_seconds": 600,
        "audio_type": AudioType.MUSIC,
        "keywords": [
            "环境",
            "电子",
            "空灵",
            "冥想",
            "ambient",
            "electronic",
            "meditation",
        ],
        "source": "freesound",
    },
]


async def seed_scenes(db: AsyncSession) -> int:
    """Seed preset scenes into database. Returns count of new scenes added."""
    # Check existing scenes
    result = await db.execute(select(EchoSceneLibrary))
    existing = result.scalars().all()
    existing_titles = {s.title for s in existing}

    count = 0
    for i, scene_data in enumerate(PRESET_SCENES):
        if scene_data["title"] not in existing_titles:
            scene = EchoSceneLibrary(
                title=scene_data["title"],
                description=scene_data["description"],
                image_url=scene_data["image_url"],
                thumbnail_url=scene_data.get("thumbnail_url"),
                category=scene_data["category"],
                keywords=json.dumps(scene_data["keywords"], ensure_ascii=False),
                sort_order=i,
            )
            db.add(scene)
            count += 1

    if count > 0:
        await db.commit()

    return count


async def seed_audio(db: AsyncSession) -> int:
    """Seed preset audio into database. Returns count of new audio added."""
    # Check existing audio
    result = await db.execute(select(EchoAudioLibrary))
    existing = result.scalars().all()
    existing_titles = {a.title for a in existing}

    count = 0
    for i, audio_data in enumerate(PRESET_AUDIO):
        if audio_data["title"] not in existing_titles:
            audio = EchoAudioLibrary(
                title=audio_data["title"],
                description=audio_data["description"],
                audio_url=audio_data["audio_url"],
                duration_seconds=audio_data.get("duration_seconds"),
                audio_type=audio_data["audio_type"],
                keywords=json.dumps(audio_data["keywords"], ensure_ascii=False),
                source=audio_data.get("source"),
                sort_order=i,
            )
            db.add(audio)
            count += 1

    if count > 0:
        await db.commit()

    return count


async def seed_echo_data(db: AsyncSession) -> dict[str, int]:
    """Seed all Echo preset data. Returns counts of new items added."""
    scenes_added = await seed_scenes(db)
    audio_added = await seed_audio(db)

    return {
        "scenes": scenes_added,
        "audio": audio_added,
    }
