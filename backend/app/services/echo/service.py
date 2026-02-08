"""Echo Domain service layer."""

import json
from datetime import date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.guardian.enums import BindingStatus, PartnerLevel, TaskStatus
from app.services.guardian.models import (
    PartnerBinding,
    PartnerDailyTask,
    PartnerProgress,
)

from .enums import BREATHING_RHYTHM, TagType
from .matching import calculate_clarity, match_audio, match_scenes
from .models import (
    EchoAudioLibrary,
    EchoIdentityTag,
    EchoMeditationSession,
    EchoPartnerMemory,
    EchoSceneLibrary,
    EchoWindowClarity,
    EchoYouthMemoir,
)
from .schemas import (
    AudioResponse,
    EchoStatusResponse,
    IdentityTagListResponse,
    IdentityTagResponse,
    MeditationEndResponse,
    MeditationStartResponse,
    MeditationStatsResponse,
    MemoirListResponse,
    MemoirResponse,
    PartnerMemoryResponse,
    RevealedMemoriesResponse,
    SceneResponse,
    WindowClarityResponse,
)


class EchoService:
    """Service for Echo Domain feature."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ============================================================
    # Echo Status
    # ============================================================

    async def get_echo_status(self, user_id: str) -> EchoStatusResponse:
        """Get user's Echo status including role and statistics."""
        # Check binding
        binding = await self._get_binding_for_user(user_id)

        role = None
        binding_id = None
        if binding:
            if binding.mom_id == user_id:
                role = "mom"
            elif binding.partner_id == user_id:
                role = "partner"
            binding_id = binding.id

        # Count identity tags
        tags_result = await self.db.execute(
            select(func.count(EchoIdentityTag.id)).where(
                EchoIdentityTag.user_id == user_id
            )
        )
        tags_count = tags_result.scalar() or 0

        # Count meditation sessions
        sessions_result = await self.db.execute(
            select(func.count(EchoMeditationSession.id)).where(
                EchoMeditationSession.user_id == user_id
            )
        )
        sessions_count = sessions_result.scalar() or 0

        # Total meditation minutes
        minutes_result = await self.db.execute(
            select(func.sum(EchoMeditationSession.actual_duration_seconds)).where(
                EchoMeditationSession.user_id == user_id,
                EchoMeditationSession.completed.is_(True),
            )
        )
        total_seconds = minutes_result.scalar() or 0
        total_minutes = total_seconds // 60

        return EchoStatusResponse(
            role=role,
            has_binding=binding is not None and binding.status == BindingStatus.ACTIVE,
            binding_id=binding_id,
            identity_tags_count=tags_count,
            meditation_sessions_count=sessions_count,
            total_meditation_minutes=total_minutes,
        )

    # ============================================================
    # Identity Tags
    # ============================================================

    async def get_identity_tags(self, user_id: str) -> IdentityTagListResponse:
        """Get user's identity tags grouped by type."""
        result = await self.db.execute(
            select(EchoIdentityTag)
            .where(EchoIdentityTag.user_id == user_id)
            .order_by(EchoIdentityTag.created_at.desc())
        )
        tags = list(result.scalars().all())

        # Group by type
        grouped: dict[str, list[IdentityTagResponse]] = {
            "music": [],
            "sound": [],
            "literature": [],
            "memory": [],
        }

        for tag in tags:
            tag_response = IdentityTagResponse(
                id=tag.id,
                tag_type=tag.tag_type,
                content=tag.content,
                created_at=tag.created_at,
            )
            grouped[tag.tag_type.value].append(tag_response)

        return IdentityTagListResponse(**grouped)

    async def create_identity_tag(
        self, user_id: str, tag_type: TagType, content: str
    ) -> IdentityTagResponse:
        """Create a new identity tag."""
        # Check for duplicates
        existing = await self.db.execute(
            select(EchoIdentityTag).where(
                EchoIdentityTag.user_id == user_id,
                EchoIdentityTag.tag_type == tag_type,
                EchoIdentityTag.content == content,
            )
        )
        if existing.scalar_one_or_none():
            raise ValueError("该标签已存在")

        tag = EchoIdentityTag(
            user_id=user_id,
            tag_type=tag_type,
            content=content,
        )
        self.db.add(tag)
        await self.db.flush()

        return IdentityTagResponse(
            id=tag.id,
            tag_type=tag.tag_type,
            content=tag.content,
            created_at=tag.created_at,
        )

    async def delete_identity_tag(self, tag_id: str, user_id: str) -> None:
        """Delete an identity tag."""
        result = await self.db.execute(
            select(EchoIdentityTag).where(
                EchoIdentityTag.id == tag_id,
                EchoIdentityTag.user_id == user_id,
            )
        )
        tag = result.scalar_one_or_none()

        if not tag:
            raise ValueError("标签不存在")

        await self.db.delete(tag)
        await self.db.flush()

    # ============================================================
    # Scenes & Audio Matching
    # ============================================================

    async def match_scenes_for_user(
        self, user_id: str, limit: int = 5
    ) -> list[SceneResponse]:
        """Match scenes based on user's identity tags."""
        # Get user's tags
        result = await self.db.execute(
            select(EchoIdentityTag).where(EchoIdentityTag.user_id == user_id)
        )
        tags = list(result.scalars().all())

        # Match scenes
        matched = await match_scenes(self.db, tags, limit)

        return [self._scene_to_response(scene, score) for scene, score in matched]

    async def match_audio_for_user(
        self, user_id: str, limit: int = 5
    ) -> list[AudioResponse]:
        """Match audio based on user's identity tags."""
        # Get user's tags
        result = await self.db.execute(
            select(EchoIdentityTag).where(EchoIdentityTag.user_id == user_id)
        )
        tags = list(result.scalars().all())

        # Match audio
        matched = await match_audio(self.db, tags, limit)

        return [self._audio_to_response(audio, score) for audio, score in matched]

    def _scene_to_response(
        self, scene: EchoSceneLibrary, score: float | None = None
    ) -> SceneResponse:
        """Convert scene model to response."""
        try:
            keywords = json.loads(scene.keywords)
        except (json.JSONDecodeError, TypeError):
            keywords = []

        return SceneResponse(
            id=scene.id,
            title=scene.title,
            description=scene.description,
            image_url=scene.image_url,
            thumbnail_url=scene.thumbnail_url,
            category=scene.category,
            keywords=keywords,
            match_score=score,
        )

    def _audio_to_response(
        self, audio: EchoAudioLibrary, score: float | None = None
    ) -> AudioResponse:
        """Convert audio model to response."""
        try:
            keywords = json.loads(audio.keywords)
        except (json.JSONDecodeError, TypeError):
            keywords = []

        return AudioResponse(
            id=audio.id,
            title=audio.title,
            description=audio.description,
            audio_url=audio.audio_url,
            duration_seconds=audio.duration_seconds,
            audio_type=audio.audio_type,
            keywords=keywords,
            match_score=score,
        )

    # ============================================================
    # Meditation
    # ============================================================

    async def start_meditation(
        self,
        user_id: str,
        target_duration_minutes: int,
        scene_id: str | None = None,
        audio_id: str | None = None,
    ) -> MeditationStartResponse:
        """Start a new meditation session."""
        # Validate scene
        scene = None
        if scene_id:
            result = await self.db.execute(
                select(EchoSceneLibrary).where(EchoSceneLibrary.id == scene_id)
            )
            scene = result.scalar_one_or_none()

        # Validate audio
        audio: EchoAudioLibrary | None = None
        if audio_id:
            audio_result = await self.db.execute(
                select(EchoAudioLibrary).where(EchoAudioLibrary.id == audio_id)
            )
            audio = audio_result.scalar_one_or_none()

        # Create session
        session = EchoMeditationSession(
            user_id=user_id,
            target_duration_minutes=target_duration_minutes,
            scene_id=scene_id if scene else None,
            audio_id=audio_id if audio else None,
        )
        self.db.add(session)
        await self.db.flush()

        return MeditationStartResponse(
            session_id=session.id,
            target_duration_minutes=target_duration_minutes,
            scene=self._scene_to_response(scene) if scene else None,
            audio=self._audio_to_response(audio) if audio else None,
            breathing_rhythm={
                phase.value: secs for phase, secs in BREATHING_RHYTHM.items()
            },
        )

    async def end_meditation(
        self,
        session_id: str,
        user_id: str,
        actual_duration_seconds: int,
    ) -> MeditationEndResponse:
        """End a meditation session."""
        result = await self.db.execute(
            select(EchoMeditationSession).where(
                EchoMeditationSession.id == session_id,
                EchoMeditationSession.user_id == user_id,
            )
        )
        session = result.scalar_one_or_none()

        if not session:
            raise ValueError("会话不存在")

        if session.ended_at:
            raise ValueError("会话已结束")

        # Update session
        target_seconds = session.target_duration_minutes * 60
        completed = actual_duration_seconds >= target_seconds * 0.8  # 80% completion

        session.actual_duration_seconds = actual_duration_seconds
        session.completed = completed
        session.ended_at = datetime.utcnow()

        await self.db.flush()

        return MeditationEndResponse(
            session_id=session.id,
            completed=completed,
            actual_duration_seconds=actual_duration_seconds,
            target_duration_minutes=session.target_duration_minutes,
            completion_rate=min(actual_duration_seconds / target_seconds, 1.0),
        )

    async def get_meditation_stats(self, user_id: str) -> MeditationStatsResponse:
        """Get meditation statistics for a user."""
        # Total sessions
        total_result = await self.db.execute(
            select(func.count(EchoMeditationSession.id)).where(
                EchoMeditationSession.user_id == user_id
            )
        )
        total_sessions = total_result.scalar() or 0

        # Completed sessions
        completed_result = await self.db.execute(
            select(func.count(EchoMeditationSession.id)).where(
                EchoMeditationSession.user_id == user_id,
                EchoMeditationSession.completed.is_(True),
            )
        )
        completed_sessions = completed_result.scalar() or 0

        # Total minutes
        minutes_result = await self.db.execute(
            select(func.sum(EchoMeditationSession.actual_duration_seconds)).where(
                EchoMeditationSession.user_id == user_id,
                EchoMeditationSession.completed.is_(True),
            )
        )
        total_seconds = minutes_result.scalar() or 0
        total_minutes = total_seconds // 60

        # Average duration
        avg_duration = (
            total_minutes / completed_sessions if completed_sessions > 0 else 0
        )

        # Calculate streaks
        sessions_result = await self.db.execute(
            select(EchoMeditationSession)
            .where(
                EchoMeditationSession.user_id == user_id,
                EchoMeditationSession.completed.is_(True),
            )
            .order_by(EchoMeditationSession.started_at.desc())
        )
        sessions = list(sessions_result.scalars().all())

        current_streak = 0
        longest_streak = 0
        last_session_date = None

        if sessions:
            last_session_date = sessions[0].started_at

            # Calculate streaks by unique dates
            session_dates = sorted(
                set(s.started_at.date() for s in sessions), reverse=True
            )

            if session_dates:
                today = date.today()
                # Check current streak
                streak = 0
                expected_date = today

                for session_date in session_dates:
                    if session_date == expected_date:
                        streak += 1
                        expected_date = expected_date - timedelta(days=1)
                    elif session_date == expected_date - timedelta(days=1):
                        # Allow for yesterday to count as current streak
                        streak += 1
                        expected_date = session_date - timedelta(days=1)
                    else:
                        break

                current_streak = streak

                # Calculate longest streak
                temp_streak = 1
                for i in range(1, len(session_dates)):
                    if session_dates[i] == session_dates[i - 1] - timedelta(days=1):
                        temp_streak += 1
                    else:
                        longest_streak = max(longest_streak, temp_streak)
                        temp_streak = 1
                longest_streak = max(longest_streak, temp_streak)

        return MeditationStatsResponse(
            total_sessions=total_sessions,
            completed_sessions=completed_sessions,
            total_minutes=total_minutes,
            average_duration_minutes=round(avg_duration, 1),
            current_streak=current_streak,
            longest_streak=longest_streak,
            last_session_date=last_session_date,
        )

    # ============================================================
    # Window Clarity (Partner Mode)
    # ============================================================

    async def get_window_clarity(self, user_id: str) -> WindowClarityResponse:
        """Get window clarity status for partner."""
        binding = await self._get_binding_for_user(user_id)

        if not binding:
            raise ValueError("未找到绑定关系")

        if binding.partner_id != user_id:
            raise ValueError("只有伴侣可以查看窗户清晰度")

        # Get today's tasks
        today = date.today()
        tasks_result = await self.db.execute(
            select(PartnerDailyTask).where(
                PartnerDailyTask.binding_id == binding.id,
                PartnerDailyTask.date == today,
            )
        )
        tasks = list(tasks_result.scalars().all())

        tasks_completed = sum(
            1 for t in tasks if t.status in [TaskStatus.COMPLETED, TaskStatus.CONFIRMED]
        )
        tasks_confirmed = sum(1 for t in tasks if t.status == TaskStatus.CONFIRMED)

        # Get progress for streak and level
        progress_result = await self.db.execute(
            select(PartnerProgress).where(PartnerProgress.binding_id == binding.id)
        )
        progress = progress_result.scalar_one_or_none()

        streak_days = progress.current_streak if progress else 0
        partner_level = (
            progress.current_level.value if progress else PartnerLevel.INTERN.value
        )

        # Calculate clarity
        clarity_level, breakdown = calculate_clarity(
            tasks_confirmed=tasks_confirmed,
            tasks_completed=tasks_completed,
            streak_days=streak_days,
            partner_level=partner_level,
        )

        # Update cached clarity
        await self._update_clarity_cache(binding.id, clarity_level)

        return WindowClarityResponse(
            clarity_level=clarity_level,
            tasks_completed_today=tasks_completed,
            tasks_confirmed_today=tasks_confirmed,
            streak_bonus=breakdown["streak_bonus"],
            level_bonus=breakdown["level_bonus"],
            breakdown=breakdown,
        )

    async def _update_clarity_cache(self, binding_id: str, clarity_level: int) -> None:
        """Update cached clarity level."""
        result = await self.db.execute(
            select(EchoWindowClarity).where(EchoWindowClarity.binding_id == binding_id)
        )
        clarity = result.scalar_one_or_none()

        if clarity:
            clarity.clarity_level = clarity_level
            clarity.last_calculated_at = datetime.utcnow()
        else:
            clarity = EchoWindowClarity(
                binding_id=binding_id,
                clarity_level=clarity_level,
            )
            self.db.add(clarity)

        await self.db.flush()

    # ============================================================
    # Partner Memories
    # ============================================================

    async def inject_memory(
        self,
        user_id: str,
        title: str,
        content: str,
        image_url: str | None = None,
        reveal_at_clarity: int = 50,
    ) -> PartnerMemoryResponse:
        """Partner injects a memory for mom to discover."""
        binding = await self._get_binding_for_user(user_id)

        if not binding:
            raise ValueError("未找到绑定关系")

        if binding.partner_id != user_id:
            raise ValueError("只有伴侣可以注入记忆")

        memory = EchoPartnerMemory(
            binding_id=binding.id,
            title=title,
            content=content,
            image_url=image_url,
            reveal_at_clarity=reveal_at_clarity,
        )
        self.db.add(memory)
        await self.db.flush()

        return self._memory_to_response(memory)

    async def get_revealed_memories(self, user_id: str) -> RevealedMemoriesResponse:
        """Get revealed memories for mom."""
        binding = await self._get_binding_for_user(user_id)

        if not binding:
            raise ValueError("未找到绑定关系")

        if binding.mom_id != user_id:
            raise ValueError("只有妈妈可以查看已揭示的记忆")

        # Get current clarity
        clarity_result = await self.db.execute(
            select(EchoWindowClarity).where(EchoWindowClarity.binding_id == binding.id)
        )
        clarity = clarity_result.scalar_one_or_none()
        current_clarity = clarity.clarity_level if clarity else 0

        # Get all memories
        memories_result = await self.db.execute(
            select(EchoPartnerMemory)
            .where(EchoPartnerMemory.binding_id == binding.id)
            .order_by(EchoPartnerMemory.reveal_at_clarity.asc())
        )
        all_memories = list(memories_result.scalars().all())

        # Check and reveal memories based on clarity
        revealed_memories = []
        next_memory_at = None

        for memory in all_memories:
            if memory.reveal_at_clarity <= current_clarity:
                if not memory.is_revealed:
                    memory.is_revealed = True
                    memory.revealed_at = datetime.utcnow()
                revealed_memories.append(self._memory_to_response(memory))
            elif next_memory_at is None:
                next_memory_at = memory.reveal_at_clarity

        await self.db.flush()

        return RevealedMemoriesResponse(
            memories=revealed_memories,
            current_clarity=current_clarity,
            next_memory_at=next_memory_at,
        )

    def _memory_to_response(self, memory: EchoPartnerMemory) -> PartnerMemoryResponse:
        """Convert memory model to response."""
        return PartnerMemoryResponse(
            id=memory.id,
            title=memory.title,
            content=memory.content,
            image_url=memory.image_url,
            reveal_at_clarity=memory.reveal_at_clarity,
            is_revealed=memory.is_revealed,
            revealed_at=memory.revealed_at,
            created_at=memory.created_at,
        )

    # ============================================================
    # Youth Memoirs
    # ============================================================

    async def get_memoirs(
        self, user_id: str, limit: int = 10, offset: int = 0
    ) -> MemoirListResponse:
        """Get user's youth memoirs."""
        # Count total
        count_result = await self.db.execute(
            select(func.count(EchoYouthMemoir.id)).where(
                EchoYouthMemoir.user_id == user_id
            )
        )
        total = count_result.scalar() or 0

        # Get memoirs
        result = await self.db.execute(
            select(EchoYouthMemoir)
            .where(EchoYouthMemoir.user_id == user_id)
            .order_by(EchoYouthMemoir.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        memoirs = list(result.scalars().all())

        return MemoirListResponse(
            memoirs=[self._memoir_to_response(m) for m in memoirs],
            total=total,
        )

    async def generate_memoir(
        self, user_id: str, theme: str | None = None
    ) -> MemoirResponse:
        """Generate a youth memoir based on identity tags."""
        # Get user's tags
        result = await self.db.execute(
            select(EchoIdentityTag).where(EchoIdentityTag.user_id == user_id)
        )
        tags = list(result.scalars().all())

        if not tags:
            raise ValueError("请先添加身份标签再生成回忆录")

        # Build generation prompt
        tag_contents = [f"{t.tag_type.value}: {t.content}" for t in tags]
        tag_ids = [t.id for t in tags]

        # For now, generate a simple memoir (can be enhanced with LLM later)
        title = self._generate_memoir_title(tags, theme)
        content = self._generate_memoir_content(tags, theme)

        memoir = EchoYouthMemoir(
            user_id=user_id,
            title=title,
            content=content,
            generation_prompt=f"Theme: {theme}\nTags: {', '.join(tag_contents)}",
            tags_used=json.dumps(tag_ids),
        )
        self.db.add(memoir)
        await self.db.flush()

        return self._memoir_to_response(memoir)

    def _generate_memoir_title(
        self, tags: list[EchoIdentityTag], theme: str | None
    ) -> str:
        """Generate a memoir title based on tags."""
        if theme:
            return f"关于{theme}的青春回忆"

        # Find a memory tag if available
        memory_tags = [t for t in tags if t.tag_type == TagType.MEMORY]
        if memory_tags:
            return f"那年的{memory_tags[0].content}"

        music_tags = [t for t in tags if t.tag_type == TagType.MUSIC]
        if music_tags:
            return f"在{music_tags[0].content}的旋律中"

        return "青春的回声"

    def _generate_memoir_content(
        self, tags: list[EchoIdentityTag], theme: str | None
    ) -> str:
        """Generate memoir content based on tags."""
        # Simple template-based generation
        # Can be enhanced with LLM integration later
        music_tags = [t.content for t in tags if t.tag_type == TagType.MUSIC]
        sound_tags = [t.content for t in tags if t.tag_type == TagType.SOUND]
        lit_tags = [t.content for t in tags if t.tag_type == TagType.LITERATURE]
        memory_tags = [t.content for t in tags if t.tag_type == TagType.MEMORY]

        paragraphs = []

        if memory_tags:
            paragraphs.append(
                f"回忆起那些关于{memory_tags[0]}的日子，心中涌起一阵温暖。"
                f"那时的自己，年轻而充满梦想。"
            )

        if music_tags:
            paragraphs.append(
                f"耳边似乎还回响着{music_tags[0]}的旋律，"
                f"每一个音符都承载着那个年代的情感和记忆。"
            )

        if sound_tags:
            paragraphs.append(
                f"闭上眼睛，仿佛能听到{sound_tags[0]}的声音，"
                f"那是属于青春的独特背景音。"
            )

        if lit_tags:
            paragraphs.append(
                f"那时候最爱读的是{lit_tags[0]}，" f"书中的故事仿佛就是自己的人生写照。"
            )

        paragraphs.append(
            "时光流转，那些美好的记忆依然鲜活。"
            "现在的我，虽然角色变了，但内心深处，"
            "那个热爱生活的自己从未离开。"
        )

        return "\n\n".join(paragraphs)

    async def rate_memoir(
        self, memoir_id: str, user_id: str, rating: float
    ) -> MemoirResponse:
        """Rate a memoir."""
        result = await self.db.execute(
            select(EchoYouthMemoir).where(
                EchoYouthMemoir.id == memoir_id,
                EchoYouthMemoir.user_id == user_id,
            )
        )
        memoir = result.scalar_one_or_none()

        if not memoir:
            raise ValueError("回忆录不存在")

        memoir.user_rating = rating
        await self.db.flush()

        return self._memoir_to_response(memoir)

    def _memoir_to_response(self, memoir: EchoYouthMemoir) -> MemoirResponse:
        """Convert memoir model to response."""
        return MemoirResponse(
            id=memoir.id,
            title=memoir.title,
            content=memoir.content,
            cover_image_url=memoir.cover_image_url,
            user_rating=memoir.user_rating,
            created_at=memoir.created_at,
        )

    # ============================================================
    # Helpers
    # ============================================================

    async def _get_binding_for_user(self, user_id: str) -> PartnerBinding | None:
        """Get active binding for a user."""
        result = await self.db.execute(
            select(PartnerBinding).where(
                PartnerBinding.status == BindingStatus.ACTIVE,
                (PartnerBinding.mom_id == user_id)
                | (PartnerBinding.partner_id == user_id),
            )
        )
        return result.scalar_one_or_none()
