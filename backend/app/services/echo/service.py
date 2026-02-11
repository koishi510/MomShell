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

from .enums import (
    BREATHING_RHYTHM,
    MemoryStatus,
    NotificationType,
    ShellStatus,
    ShellType,
    StickerStyle,
    TagType,
    WishStatus,
    WishType,
)
from .matching import calculate_clarity, match_audio, match_scenes
from .models import (
    EchoAudioLibrary,
    EchoIdentityTag,
    EchoMeditationSession,
    EchoMemoryShell,
    EchoNotification,
    EchoPartnerMemory,
    EchoSceneLibrary,
    EchoTaskShell,
    EchoWindowClarity,
    EchoWishBottle,
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
                f"闭上眼睛，仿佛能听到{sound_tags[0]}的声音，那是属于青春的独特背景音。"
            )

        if lit_tags:
            paragraphs.append(
                f"那时候最爱读的是{lit_tags[0]}，书中的故事仿佛就是自己的人生写照。"
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

    # ============================================================
    # Dad Mode 2.0: Task Shells
    # ============================================================

    async def get_task_shells(
        self, user_id: str, include_archived: bool = False
    ) -> dict:
        """Get all task shells for dad's beach."""
        binding = await self._get_binding_for_user(user_id)
        if not binding:
            return {"shells": [], "total": 0, "memory_pool_waiting": 0}

        if binding.partner_id != user_id:
            return {
                "shells": [],
                "total": 0,
                "memory_pool_waiting": 0,
            }  # Only partner (dad) can see shells

        from .schemas import TaskShellResponse

        # Get shells
        query = select(EchoTaskShell).where(EchoTaskShell.binding_id == binding.id)
        if not include_archived:
            query = query.where(EchoTaskShell.status != ShellStatus.ARCHIVED)

        query = query.order_by(EchoTaskShell.created_at.desc())

        result = await self.db.execute(query)
        shells = list(result.scalars().all())

        # Get memory pool status
        memory_pool_count = await self._get_memory_pool_count(binding.mom_id)

        # Enrich with template data
        response_list = []
        for shell in shells:
            shell_dict = self._shell_to_dict(shell)
            if shell.template:
                shell_dict["template_title"] = shell.template.title
                shell_dict["template_description"] = shell.template.description
                shell_dict["template_points"] = shell.template.points
                shell_dict["template_difficulty"] = shell.template.difficulty.value
            response_list.append(TaskShellResponse(**shell_dict))

        return {
            "shells": response_list,
            "total": len(response_list),
            "memory_pool_waiting": memory_pool_count,
        }

    async def start_washing_shell(self, shell_id: str, user_id: str) -> dict:
        """Start washing a shell."""
        binding = await self._get_binding_for_user(user_id)
        if not binding or binding.partner_id != user_id:
            raise ValueError("无权限")

        result = await self.db.execute(
            select(EchoTaskShell).where(
                EchoTaskShell.id == shell_id,
                EchoTaskShell.binding_id == binding.id,
            )
        )
        shell = result.scalar_one_or_none()
        if not shell:
            raise ValueError("贝壳不存在")

        if shell.status != ShellStatus.MUDDY:
            raise ValueError("贝壳状态不正确")

        shell.status = ShellStatus.WASHING
        shell.washing_started_at = datetime.utcnow()
        await self.db.flush()

        return self._shell_to_dict(shell)

    async def confirm_shell_washing(self, shell_id: str, user_id: str) -> dict:
        """Confirm shell washing completion and reveal sticker."""
        binding = await self._get_binding_for_user(user_id)
        if not binding or binding.partner_id != user_id:
            raise ValueError("无权限")

        result = await self.db.execute(
            select(EchoTaskShell).where(
                EchoTaskShell.id == shell_id,
                EchoTaskShell.binding_id == binding.id,
            )
        )
        shell = result.scalar_one_or_none()
        if not shell:
            raise ValueError("贝壳不存在")

        if shell.status not in [ShellStatus.WASHING, ShellStatus.WASHED]:
            raise ValueError("贝壳状态不正确")

        # Get bound memoir or echo fragment
        is_echo_fragment = False
        sticker_url = None
        message = "因为你的守护，她找回了这一段流光"

        if shell.bound_memoir_id:
            # Get memoir
            memoir_result = await self.db.execute(
                select(EchoYouthMemoir).where(
                    EchoYouthMemoir.id == shell.bound_memoir_id
                )
            )
            memoir = memoir_result.scalar_one_or_none()
            if memoir and memoir.cover_image_url:
                sticker_url = memoir.cover_image_url
                shell.memory_text = memoir.content
                # Mark memoir as revealed
                memoir.is_revealed = True
            else:
                is_echo_fragment = True
                sticker_url = await self._get_echo_fragment_image()
                message = (
                    "此时海面静谧，她在积蓄光芒。你的守护已化作底色，静待珠贝浮现。"
                )
        else:
            is_echo_fragment = True
            sticker_url = await self._get_echo_fragment_image()
            message = "此时海面静谧，她在积蓄光芒。你的守护已化作底色，静待珠贝浮现。"

        # Update shell
        shell.status = ShellStatus.OPENED
        shell.washed_at = datetime.utcnow()
        shell.opened_at = datetime.utcnow()
        shell.memory_sticker_url = sticker_url

        await self.db.flush()

        # Create notification for mom
        await self._create_notification(
            user_id=binding.mom_id,
            notification_type=NotificationType.SHELL_WASHED,
            title="贝壳已洗净",
            message="守护者洗净了一个贝壳，发现了一段美好回忆",
            related_entity_type="task_shell",
            related_entity_id=shell.id,
        )

        return {
            "shell_id": shell.id,
            "sticker_url": sticker_url,
            "message": message,
            "is_echo_fragment": is_echo_fragment,
            "light_string_photo": {
                "id": shell.id,
                "url": sticker_url,
                "position": 0,  # Will be determined by frontend
                "isRevealed": True,
                "revealedAt": datetime.utcnow().isoformat(),
            }
            if sticker_url
            else None,
        }

    async def create_task_shell(
        self,
        user_id: str,
        title: str | None = None,
        description: str | None = None,
        template_id: str | None = None,
        creator_role: str = "dad",
    ) -> dict:
        """Create a new task shell (manual co-building)."""
        binding = await self._get_binding_for_user(user_id)
        if not binding:
            raise ValueError("未找到绑定关系")

        # Determine role
        is_dad = binding.partner_id == user_id
        actual_creator_role = "dad" if is_dad else "mom"

        if creator_role not in ["dad", "mom", "system"]:
            raise ValueError("无效的创建者角色")

        # For mom-created tasks, need confirmation
        confirmation_status = "confirmed" if actual_creator_role == "dad" else "pending"

        shell = EchoTaskShell(
            binding_id=binding.id,
            shell_type=ShellType.NORMAL,
            status=ShellStatus.MUDDY,
            creator_role=creator_role,
            template_id=template_id,
            custom_title=title,
            custom_description=description,
            confirmation_status=confirmation_status,
        )

        # Try to bind to memory pool
        await self._bind_shell_to_memory(shell, binding.mom_id)

        self.db.add(shell)
        await self.db.flush()

        return self._shell_to_dict(shell)

    async def accept_task_shell(self, shell_id: str, user_id: str) -> dict:
        """Accept a mom-created task."""
        binding = await self._get_binding_for_user(user_id)
        if not binding or binding.partner_id != user_id:
            raise ValueError("无权限")

        result = await self.db.execute(
            select(EchoTaskShell).where(
                EchoTaskShell.id == shell_id,
                EchoTaskShell.binding_id == binding.id,
            )
        )
        shell = result.scalar_one_or_none()
        if not shell:
            raise ValueError("贝壳不存在")

        if shell.confirmation_status != "pending":
            raise ValueError("任务状态不正确")

        shell.confirmation_status = "accepted"
        await self.db.flush()

        return self._shell_to_dict(shell)

    async def reject_task_shell(self, shell_id: str, user_id: str) -> dict:
        """Reject a mom-created task."""
        binding = await self._get_binding_for_user(user_id)
        if not binding or binding.partner_id != user_id:
            raise ValueError("无权限")

        result = await self.db.execute(
            select(EchoTaskShell).where(
                EchoTaskShell.id == shell_id,
                EchoTaskShell.binding_id == binding.id,
            )
        )
        shell = result.scalar_one_or_none()
        if not shell:
            raise ValueError("贝壳不存在")

        if shell.confirmation_status != "pending":
            raise ValueError("任务状态不正确")

        # Notify mom
        await self._create_notification(
            user_id=binding.mom_id,
            notification_type=NotificationType.TASK_REMINDER,
            title="任务已拒绝",
            message="守护者拒绝了您的任务建议",
            related_entity_type="task_shell",
            related_entity_id=shell.id,
        )

        # Delete shell
        await self.db.delete(shell)
        await self.db.flush()

        return {"message": "任务已拒绝"}

    async def _bind_shell_to_memory(self, shell: EchoTaskShell, mom_id: str) -> None:
        """Bind shell to earliest unrevealed memory from pool."""
        result = await self.db.execute(
            select(EchoYouthMemoir)
            .where(
                EchoYouthMemoir.user_id == mom_id,
                EchoYouthMemoir.is_revealed.is_(False),
            )
            .order_by(EchoYouthMemoir.created_at.asc())
            .limit(1)
        )
        memoir = result.scalar_one_or_none()

        if memoir:
            shell.bound_memoir_id = memoir.id

    async def _get_memory_pool_count(self, mom_id: str) -> int:
        """Get count of unrevealed memories in pool."""
        result = await self.db.execute(
            select(func.count(EchoYouthMemoir.id)).where(
                EchoYouthMemoir.user_id == mom_id,
                EchoYouthMemoir.is_revealed.is_(False),
            )
        )
        return result.scalar() or 0

    async def _get_echo_fragment_image(self) -> str:
        """Get echo fragment image URL."""
        # For now, return a placeholder
        # TODO: Implement AI generation or preset images
        return "https://via.placeholder.com/200x200/FFD700/FFFFFF?text=✨"

    def _shell_to_dict(self, shell: EchoTaskShell) -> dict:
        """Convert shell to dict."""
        return {
            "id": shell.id,
            "binding_id": shell.binding_id,
            "shell_type": shell.shell_type.value,
            "status": shell.status.value,
            "creator_role": shell.creator_role,
            "template_id": shell.template_id,
            "custom_title": shell.custom_title,
            "custom_description": shell.custom_description,
            "wish_bottle_id": shell.wish_bottle_id,
            "bound_memoir_id": shell.bound_memoir_id,
            "memory_sticker_url": shell.memory_sticker_url,
            "memory_text": shell.memory_text,
            "confirmation_status": shell.confirmation_status,
            "washing_started_at": shell.washing_started_at.isoformat()
            if shell.washing_started_at
            else None,
            "washed_at": shell.washed_at.isoformat() if shell.washed_at else None,
            "opened_at": shell.opened_at.isoformat() if shell.opened_at else None,
            "created_at": shell.created_at.isoformat(),
            "template_title": None,
            "template_description": None,
            "template_points": None,
            "template_difficulty": None,
        }

    # ============================================================
    # Dad Mode 2.0: Wish Bottles
    # ============================================================

    async def get_wish_bottles(self, user_id: str) -> dict:
        """Get all wish bottles."""
        binding = await self._get_binding_for_user(user_id)
        if not binding:
            return {"bottles": [], "total": 0}

        # Mom sees all, dad sees drifting and caught
        is_dad = binding.partner_id == user_id

        query = select(EchoWishBottle).where(EchoWishBottle.binding_id == binding.id)
        if is_dad:
            # Dad only sees bottles he needs to catch
            query = query.where(
                EchoWishBottle.status.in_(
                    [
                        WishStatus.DRIFTING,
                        WishStatus.CAUGHT,
                    ]
                )
            )

        query = query.order_by(EchoWishBottle.created_at.desc())

        result = await self.db.execute(query)
        bottles = list(result.scalars().all())

        return {
            "bottles": [self._wish_to_dict(b) for b in bottles],
            "total": len(bottles),
        }

    async def create_wish_bottle(
        self,
        user_id: str,
        wish_type: WishType,
        content: str,
        emoji_hint: str | None = None,
    ) -> dict:
        """Mom creates a wish bottle."""
        binding = await self._get_binding_for_user(user_id)
        if not binding or binding.mom_id != user_id:
            raise ValueError("只有妈妈可以发送心愿")
        if not binding.partner_id:
            raise ValueError("尚未绑定守护者")

        wish = EchoWishBottle(
            binding_id=binding.id,
            wish_type=wish_type,
            content=content,
            emoji_hint=emoji_hint,
            status=WishStatus.DRIFTING,
        )
        self.db.add(wish)
        await self.db.flush()

        # Notify dad
        await self._create_notification(
            user_id=binding.partner_id,  # type: ignore[arg-type]
            notification_type=NotificationType.WISH_NEW,
            title="收到新心愿",
            message="她发送了一个心愿，快去看看吧",
            related_entity_type="wish_bottle",
            related_entity_id=wish.id,
        )

        return self._wish_to_dict(wish)

    async def catch_wish_bottle(self, wish_id: str, user_id: str) -> dict:
        """Dad catches a wish bottle and creates golden shell."""
        binding = await self._get_binding_for_user(user_id)
        if not binding or binding.partner_id != user_id:
            raise ValueError("无权限")

        result = await self.db.execute(
            select(EchoWishBottle).where(
                EchoWishBottle.id == wish_id,
                EchoWishBottle.binding_id == binding.id,
            )
        )
        wish = result.scalar_one_or_none()
        if not wish:
            raise ValueError("心愿不存在")

        if wish.status != WishStatus.DRIFTING:
            raise ValueError("心愿已被接住")

        # Create golden shell
        shell = EchoTaskShell(
            binding_id=binding.id,
            shell_type=ShellType.GOLDEN_CONCH,
            status=ShellStatus.MUDDY,
            creator_role="wish",
            custom_title=f"💝 {wish.content}",
            custom_description="来自她的心愿",
            wish_bottle_id=wish.id,
            confirmation_status="confirmed",
        )

        # Bind to memory pool
        await self._bind_shell_to_memory(shell, binding.mom_id)

        self.db.add(shell)
        await self.db.flush()

        # Update wish
        wish.status = WishStatus.CAUGHT
        wish.caught_at = datetime.utcnow()
        wish.resulting_shell_id = shell.id

        await self.db.flush()

        return {
            "wish": self._wish_to_dict(wish),
            "shell": self._shell_to_dict(shell),
        }

    async def confirm_wish_granted(
        self, wish_id: str, user_id: str, reaction: str
    ) -> dict:
        """Mom confirms wish is granted with emoji reaction."""
        binding = await self._get_binding_for_user(user_id)
        if not binding or binding.mom_id != user_id:
            raise ValueError("无权限")
        if not binding.partner_id:
            raise ValueError("尚未绑定守护者")

        result = await self.db.execute(
            select(EchoWishBottle).where(
                EchoWishBottle.id == wish_id,
                EchoWishBottle.binding_id == binding.id,
            )
        )
        wish = result.scalar_one_or_none()
        if not wish:
            raise ValueError("心愿不存在")

        if wish.status != WishStatus.IN_PROGRESS:
            raise ValueError("心愿状态不正确")

        wish.status = WishStatus.GRANTED
        wish.completed_at = datetime.utcnow()
        wish.mom_reaction = reaction

        await self.db.flush()

        # Notify dad
        await self._create_notification(
            user_id=binding.partner_id,  # type: ignore[arg-type]
            notification_type=NotificationType.WISH_GRANTED,
            title="心愿已达成",
            message=f"她确认了您的心愿完成 {reaction}",
            related_entity_type="wish_bottle",
            related_entity_id=wish.id,
        )

        return self._wish_to_dict(wish)

    def _wish_to_dict(self, wish: EchoWishBottle) -> dict:
        """Convert wish to dict."""
        return {
            "id": wish.id,
            "binding_id": wish.binding_id,
            "wish_type": wish.wish_type.value,
            "content": wish.content,
            "emoji_hint": wish.emoji_hint,
            "status": wish.status.value,
            "caught_at": wish.caught_at.isoformat() if wish.caught_at else None,
            "resulting_shell_id": wish.resulting_shell_id,
            "completed_at": wish.completed_at.isoformat()
            if wish.completed_at
            else None,
            "mom_reaction": wish.mom_reaction,
            "created_at": wish.created_at.isoformat(),
        }

    # ============================================================
    # Dad Mode 2.0: Memory Shells
    # ============================================================

    async def create_memory_shell(
        self,
        user_id: str,
        title: str,
        content: str,
        photo_url: str | None = None,
        sticker_style: StickerStyle = StickerStyle.WATERCOLOR,
    ) -> dict:
        """Dad creates a memory shell for mom."""
        binding = await self._get_binding_for_user(user_id)
        if not binding or binding.partner_id != user_id:
            raise ValueError("只有守护者可以创建记忆")

        memory = EchoMemoryShell(
            binding_id=binding.id,
            creator_id=user_id,
            title=title,
            content=content,
            photo_url=photo_url,
            sticker_style=sticker_style,
            status=MemoryStatus.GENERATING,
        )
        self.db.add(memory)
        await self.db.flush()

        # Start async AI generation (don't wait)
        # TODO: Implement background task for sticker generation
        # For now, just mark as ready with placeholder
        memory.status = MemoryStatus.READY
        memory.sticker_url = "https://via.placeholder.com/200x200/FFD700/FFFFFF?text=🐚"
        await self.db.flush()

        # Notify mom
        await self._create_notification(
            user_id=binding.mom_id,
            notification_type=NotificationType.MEMORY_READY,
            title="收到新的回忆贝壳",
            message="守护者为您创建了一段回忆",
            related_entity_type="memory_shell",
            related_entity_id=memory.id,
        )

        return self._memory_to_dict(memory)

    async def open_memory_shell(self, memory_id: str, user_id: str) -> dict:
        """Mom opens a memory shell."""
        binding = await self._get_binding_for_user(user_id)
        if not binding or binding.mom_id != user_id:
            raise ValueError("无权限")
        if not binding.partner_id:
            raise ValueError("尚未绑定守护者")

        result = await self.db.execute(
            select(EchoMemoryShell).where(
                EchoMemoryShell.id == memory_id,
                EchoMemoryShell.binding_id == binding.id,
            )
        )
        memory = result.scalar_one_or_none()
        if not memory:
            raise ValueError("记忆不存在")

        if memory.status != MemoryStatus.READY:
            raise ValueError("记忆状态不正确")

        memory.status = MemoryStatus.OPENED
        memory.opened_at = datetime.utcnow()

        await self.db.flush()

        # Notify dad
        await self._create_notification(
            user_id=binding.partner_id,  # type: ignore[arg-type]
            notification_type=NotificationType.MEMORY_OPENED,
            title="她打开了您的回忆",
            message="她已经收到了您的心意",
            related_entity_type="memory_shell",
            related_entity_id=memory.id,
        )

        return self._memory_to_dict(memory)

    async def react_to_memory(
        self, memory_id: str, user_id: str, reaction: str
    ) -> dict:
        """Mom reacts to a memory."""
        binding = await self._get_binding_for_user(user_id)
        if not binding or binding.mom_id != user_id:
            raise ValueError("无权限")

        result = await self.db.execute(
            select(EchoMemoryShell).where(
                EchoMemoryShell.id == memory_id,
                EchoMemoryShell.binding_id == binding.id,
            )
        )
        memory = result.scalar_one_or_none()
        if not memory:
            raise ValueError("记忆不存在")

        memory.mom_reaction = reaction
        await self.db.flush()

        return self._memory_to_dict(memory)

    def _memory_to_dict(self, memory: EchoMemoryShell) -> dict:
        """Convert memory to dict."""
        return {
            "id": memory.id,
            "binding_id": memory.binding_id,
            "creator_id": memory.creator_id,
            "title": memory.title,
            "content": memory.content,
            "photo_url": memory.photo_url,
            "sticker_style": memory.sticker_style.value,
            "sticker_url": memory.sticker_url,
            "status": memory.status.value,
            "opened_at": memory.opened_at.isoformat() if memory.opened_at else None,
            "mom_reaction": memory.mom_reaction,
            "error_message": memory.error_message,
            "created_at": memory.created_at.isoformat(),
        }

    # ============================================================
    # Dad Mode 2.0: Notifications
    # ============================================================

    async def get_notifications(self, user_id: str, unread_only: bool = False) -> dict:
        """Get notifications for user."""
        query = select(EchoNotification).where(EchoNotification.user_id == user_id)
        if unread_only:
            query = query.where(EchoNotification.is_read.is_(False))

        query = query.order_by(EchoNotification.created_at.desc())

        result = await self.db.execute(query)
        notifications = list(result.scalars().all())

        # Count unread
        unread_result = await self.db.execute(
            select(func.count(EchoNotification.id)).where(
                EchoNotification.user_id == user_id,
                EchoNotification.is_read.is_(False),
            )
        )
        unread_count = unread_result.scalar() or 0

        return {
            "notifications": [self._notification_to_dict(n) for n in notifications],
            "total": len(notifications),
            "unread_count": unread_count,
        }

    async def mark_notification_read(self, notification_id: str, user_id: str) -> dict:
        """Mark notification as read."""
        result = await self.db.execute(
            select(EchoNotification).where(
                EchoNotification.id == notification_id,
                EchoNotification.user_id == user_id,
            )
        )
        notification = result.scalar_one_or_none()
        if not notification:
            raise ValueError("通知不存在")

        notification.is_read = True
        notification.read_at = datetime.utcnow()
        await self.db.flush()

        return self._notification_to_dict(notification)

    async def mark_all_notifications_read(self, user_id: str) -> dict:
        """Mark all notifications as read."""
        result = await self.db.execute(
            select(EchoNotification).where(
                EchoNotification.user_id == user_id,
                EchoNotification.is_read.is_(False),
            )
        )
        notifications = list(result.scalars().all())

        for notification in notifications:
            notification.is_read = True
            notification.read_at = datetime.utcnow()

        await self.db.flush()

        return {"marked_count": len(notifications)}

    async def _create_notification(
        self,
        user_id: str,
        notification_type: NotificationType,
        title: str,
        message: str,
        related_entity_type: str | None = None,
        related_entity_id: str | None = None,
    ) -> EchoNotification:
        """Create a notification."""
        notification = EchoNotification(
            user_id=user_id,
            notification_type=notification_type,
            title=title,
            message=message,
            related_entity_type=related_entity_type,
            related_entity_id=related_entity_id,
        )
        self.db.add(notification)
        await self.db.flush()
        return notification

    def _notification_to_dict(self, notification: EchoNotification) -> dict:
        """Convert notification to dict."""
        return {
            "id": notification.id,
            "user_id": notification.user_id,
            "notification_type": notification.notification_type.value,
            "title": notification.title,
            "message": notification.message,
            "related_entity_type": notification.related_entity_type,
            "related_entity_id": notification.related_entity_id,
            "is_read": notification.is_read,
            "read_at": notification.read_at.isoformat()
            if notification.read_at
            else None,
            "created_at": notification.created_at.isoformat(),
        }

    # ============================================================
    # Dad Mode 2.0: Archive & Pool Status
    # ============================================================

    async def get_archive(self, user_id: str) -> dict:
        """Get archive data for "记" section."""
        binding = await self._get_binding_for_user(user_id)
        if not binding:
            return {
                "completed_shells": [],
                "granted_wishes": [],
                "sent_memories": [],
                "received_memories": [],
                "echo_fragment_count": 0,
            }

        is_dad = binding.partner_id == user_id

        # Get completed shells
        shells_result = await self.db.execute(
            select(EchoTaskShell)
            .where(
                EchoTaskShell.binding_id == binding.id,
                EchoTaskShell.status == ShellStatus.OPENED,
            )
            .order_by(EchoTaskShell.opened_at.desc())
        )
        completed_shells = [
            self._shell_to_dict(s) for s in shells_result.scalars().all()
        ]

        # Get granted wishes
        wishes_result = await self.db.execute(
            select(EchoWishBottle)
            .where(
                EchoWishBottle.binding_id == binding.id,
                EchoWishBottle.status == WishStatus.GRANTED,
            )
            .order_by(EchoWishBottle.completed_at.desc())
        )
        granted_wishes = [self._wish_to_dict(w) for w in wishes_result.scalars().all()]

        # Get memories
        if is_dad:
            # Dad sees memories he sent
            memories_result = await self.db.execute(
                select(EchoMemoryShell)
                .where(
                    EchoMemoryShell.binding_id == binding.id,
                    EchoMemoryShell.creator_id == user_id,
                )
                .order_by(EchoMemoryShell.created_at.desc())
            )
            sent_memories = [
                self._memory_to_dict(m) for m in memories_result.scalars().all()
            ]
            received_memories = []
        else:
            # Mom sees memories she received
            memories_result = await self.db.execute(
                select(EchoMemoryShell)
                .where(
                    EchoMemoryShell.binding_id == binding.id,
                )
                .order_by(EchoMemoryShell.created_at.desc())
            )
            received_memories = [
                self._memory_to_dict(m) for m in memories_result.scalars().all()
            ]
            sent_memories = []

        # Count echo fragments (shells without bound memoir)
        echo_fragment_count = sum(
            1 for s in completed_shells if s["bound_memoir_id"] is None
        )

        return {
            "completed_shells": completed_shells,
            "granted_wishes": granted_wishes,
            "sent_memories": sent_memories,
            "received_memories": received_memories,
            "echo_fragment_count": echo_fragment_count,
        }

    async def get_pool_status(self, user_id: str) -> dict:
        """Get Memory Pool and Task Pool status."""
        binding = await self._get_binding_for_user(user_id)
        if not binding:
            return {
                "memory_pool_count": 0,
                "memory_pool_over_limit": False,
                "task_pool_count": 0,
                "task_pool_by_status": {},
            }

        # Memory pool
        memory_pool_count = await self._get_memory_pool_count(binding.mom_id)
        memory_pool_over_limit = memory_pool_count > 20

        # Task pool
        task_result = await self.db.execute(
            select(func.count(EchoTaskShell.id)).where(
                EchoTaskShell.binding_id == binding.id,
                EchoTaskShell.status.in_(
                    [
                        ShellStatus.MUDDY,
                        ShellStatus.WASHING,
                        ShellStatus.WASHED,
                    ]
                ),
            )
        )
        task_pool_count = task_result.scalar() or 0

        # By status
        task_by_status_result = await self.db.execute(
            select(EchoTaskShell.status, func.count(EchoTaskShell.id))
            .where(
                EchoTaskShell.binding_id == binding.id,
                EchoTaskShell.status.in_(
                    [
                        ShellStatus.MUDDY,
                        ShellStatus.WASHING,
                        ShellStatus.WASHED,
                    ]
                ),
            )
            .group_by(EchoTaskShell.status)
        )
        task_pool_by_status = {
            status.value: count for status, count in task_by_status_result.all()
        }

        return {
            "memory_pool_count": memory_pool_count,
            "memory_pool_over_limit": memory_pool_over_limit,
            "task_pool_count": task_pool_count,
            "task_pool_by_status": task_pool_by_status,
        }
