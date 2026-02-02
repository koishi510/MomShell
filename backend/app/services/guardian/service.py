"""Guardian Partner service layer."""

import json
import random
from datetime import date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.services.community.models import User

from .enums import (
    LEVEL_THRESHOLDS,
    TASK_POINTS,
    BindingStatus,
    HealthCondition,
    MoodLevel,
    PartnerLevel,
    TaskDifficulty,
    TaskStatus,
)
from .models import (
    Memory,
    MomDailyStatus,
    PartnerBadge,
    PartnerBinding,
    PartnerDailyTask,
    PartnerProgress,
    TaskTemplate,
)
from .schemas import (
    AlbumResponse,
    BadgeResponse,
    DailyStatusCreate,
    DailyStatusResponse,
    DailyTaskResponse,
    InviteResponse,
    MemoryCreate,
    MemoryResponse,
    MomInfo,
    PartnerInfo,
    ProgressResponse,
    StatusNotification,
)


class GuardianService:
    """Service for Guardian Partner feature."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ============================================================
    # Partner Binding
    # ============================================================

    async def create_invite(
        self, mom_id: str, expires_in_hours: int = 48
    ) -> InviteResponse:
        """Create an invitation for partner binding."""
        # Check if there's already an active binding
        existing = await self.db.execute(
            select(PartnerBinding).where(
                PartnerBinding.mom_id == mom_id,
                PartnerBinding.status == BindingStatus.ACTIVE,
            )
        )
        if existing.scalar_one_or_none():
            raise ValueError("已有绑定的伴侣")

        # Check for pending invite
        pending = await self.db.execute(
            select(PartnerBinding).where(
                PartnerBinding.mom_id == mom_id,
                PartnerBinding.status == BindingStatus.PENDING,
            )
        )
        binding = pending.scalar_one_or_none()

        if binding:
            # Update existing invite
            from .models import generate_invite_code

            binding.invite_code = generate_invite_code()
            binding.invite_expires_at = datetime.utcnow() + timedelta(
                hours=expires_in_hours
            )
        else:
            # Create new binding
            binding = PartnerBinding(
                mom_id=mom_id,
                invite_expires_at=datetime.utcnow() + timedelta(hours=expires_in_hours),
            )
            self.db.add(binding)

        await self.db.flush()

        return InviteResponse(
            invite_code=binding.invite_code,
            invite_url=f"/guardian/invite/{binding.invite_code}",
            expires_at=binding.invite_expires_at,
        )

    async def accept_invite(self, invite_code: str, partner_id: str) -> PartnerBinding:
        """Accept an invitation and bind as partner."""
        # Find the binding
        result = await self.db.execute(
            select(PartnerBinding).where(
                PartnerBinding.invite_code == invite_code,
                PartnerBinding.status == BindingStatus.PENDING,
            )
        )
        binding = result.scalar_one_or_none()

        if not binding:
            raise ValueError("邀请码无效或已过期")

        # Check expiration
        if binding.invite_expires_at and binding.invite_expires_at < datetime.utcnow():
            raise ValueError("邀请码已过期")

        # Check if partner is the same as mom
        if binding.mom_id == partner_id:
            raise ValueError("不能绑定自己")

        # Update binding
        binding.partner_id = partner_id
        binding.status = BindingStatus.ACTIVE
        binding.bound_at = datetime.utcnow()

        # Create progress record
        progress = PartnerProgress(binding_id=binding.id)
        self.db.add(progress)

        await self.db.flush()
        return binding

    async def unbind(self, binding_id: str, user_id: str) -> None:
        """Unbind partner relationship."""
        result = await self.db.execute(
            select(PartnerBinding).where(
                PartnerBinding.id == binding_id,
                PartnerBinding.status == BindingStatus.ACTIVE,
            )
        )
        binding = result.scalar_one_or_none()

        if not binding:
            raise ValueError("绑定不存在")

        # Check permission (mom or partner can unbind)
        if binding.mom_id != user_id and binding.partner_id != user_id:
            raise ValueError("无权解绑")

        binding.status = BindingStatus.UNBOUND
        binding.unbound_at = datetime.utcnow()
        await self.db.flush()

    async def get_binding_for_user(self, user_id: str) -> PartnerBinding | None:
        """Get active binding for a user (as mom or partner)."""
        result = await self.db.execute(
            select(PartnerBinding)
            .where(
                PartnerBinding.status == BindingStatus.ACTIVE,
                (PartnerBinding.mom_id == user_id)
                | (PartnerBinding.partner_id == user_id),
            )
            .options(
                selectinload(PartnerBinding.mom), selectinload(PartnerBinding.partner)
            )
        )
        return result.scalar_one_or_none()

    async def get_partner_info(self, binding: PartnerBinding) -> PartnerInfo | None:
        """Get partner info for display."""
        if not binding.partner_id:
            return None

        result = await self.db.execute(
            select(User).where(User.id == binding.partner_id)
        )
        partner = result.scalar_one_or_none()
        if not partner:
            return None

        # Get progress
        progress_result = await self.db.execute(
            select(PartnerProgress).where(PartnerProgress.binding_id == binding.id)
        )
        progress = progress_result.scalar_one_or_none()

        return PartnerInfo(
            id=partner.id,
            nickname=partner.nickname,
            avatar_url=partner.avatar_url,
            level=progress.current_level if progress else PartnerLevel.INTERN,
            total_points=progress.total_points if progress else 0,
            current_streak=progress.current_streak if progress else 0,
        )

    async def get_mom_info(self, binding: PartnerBinding) -> MomInfo:
        """Get mom info for partner view."""
        result = await self.db.execute(select(User).where(User.id == binding.mom_id))
        mom = result.scalar_one_or_none()
        if not mom:
            raise ValueError("妈妈信息不存在")

        return MomInfo(
            id=mom.id,
            nickname=mom.nickname,
            avatar_url=mom.avatar_url,
            baby_birth_date=mom.baby_birth_date,
            postpartum_weeks=mom.postpartum_weeks,
        )

    # ============================================================
    # Daily Status
    # ============================================================

    async def record_daily_status(
        self, mom_id: str, data: DailyStatusCreate
    ) -> MomDailyStatus:
        """Record or update mom's daily status."""
        today = date.today()

        # Check for existing record
        result = await self.db.execute(
            select(MomDailyStatus).where(
                MomDailyStatus.mom_id == mom_id,
                MomDailyStatus.date == today,
            )
        )
        status = result.scalar_one_or_none()

        health_conditions_json = json.dumps([c.value for c in data.health_conditions])

        if status:
            # Update existing
            status.mood = data.mood
            status.energy_level = data.energy_level
            status.health_conditions = health_conditions_json
            status.feeding_count = data.feeding_count
            status.sleep_hours = data.sleep_hours
            status.notes = data.notes
            status.notified_partner = False  # Reset notification flag
        else:
            # Create new
            status = MomDailyStatus(
                mom_id=mom_id,
                date=today,
                mood=data.mood,
                energy_level=data.energy_level,
                health_conditions=health_conditions_json,
                feeding_count=data.feeding_count,
                sleep_hours=data.sleep_hours,
                notes=data.notes,
            )
            self.db.add(status)

        await self.db.flush()
        return status

    async def get_daily_status(
        self, mom_id: str, target_date: date | None = None
    ) -> MomDailyStatus | None:
        """Get mom's daily status."""
        target_date = target_date or date.today()
        result = await self.db.execute(
            select(MomDailyStatus).where(
                MomDailyStatus.mom_id == mom_id,
                MomDailyStatus.date == target_date,
            )
        )
        return result.scalar_one_or_none()

    def generate_status_notification(
        self, status: MomDailyStatus
    ) -> StatusNotification:
        """Generate notification message for partner based on mom's status."""
        conditions = (
            json.loads(status.health_conditions) if status.health_conditions else []
        )
        suggestions = []
        messages = []

        # Analyze mood and energy
        if status.mood in [MoodLevel.VERY_LOW, MoodLevel.LOW]:
            messages.append("太太今天心情不太好")
        if status.energy_level < 30:
            messages.append(f"能量值只有{status.energy_level}%")

        # Analyze health conditions
        condition_messages = {
            HealthCondition.WOUND_PAIN.value: "伤口有些疼痛",
            HealthCondition.HAIR_LOSS.value: "处于脱发期",
            HealthCondition.INSOMNIA.value: "昨晚没睡好",
            HealthCondition.BREAST_PAIN.value: "涨奶不适",
            HealthCondition.BACK_PAIN.value: "腰背酸痛",
            HealthCondition.FATIGUE.value: "感到疲惫",
            HealthCondition.EMOTIONAL.value: "情绪有些波动",
        }
        for cond in conditions:
            if cond in condition_messages:
                messages.append(condition_messages[cond])

        # Analyze feeding
        if status.feeding_count >= 3:
            messages.append(f"深夜喂奶{status.feeding_count}次")

        # Generate suggestions
        suggestion_map = {
            HealthCondition.WOUND_PAIN.value: "帮忙分担家务，让她多休息",
            HealthCondition.HAIR_LOSS.value: "今天千万不要评论家里地板上的头发，请默默清理掉",
            HealthCondition.INSOMNIA.value: "今晚早点帮忙带娃，让她补觉",
            HealthCondition.BREAST_PAIN.value: "准备热毛巾帮她热敷",
            HealthCondition.BACK_PAIN.value: "可以学习肩颈按摩帮她放松",
            HealthCondition.FATIGUE.value: "今晚推掉社交，早点回家陪她",
            HealthCondition.EMOTIONAL.value: "多陪陪她聊天，不要讲道理，只需要倾听",
        }
        for cond in conditions:
            if cond in suggestion_map:
                suggestions.append(suggestion_map[cond])

        if status.energy_level < 30:
            suggestions.append("带一份她爱吃的低糖甜品回家")
        if status.feeding_count >= 3:
            suggestions.append("今晚试着帮忙喂一次奶（如果有存奶）")

        # Build final message
        if messages:
            message = "太太今天：" + "，".join(messages) + "。"
        else:
            message = "太太今天状态还不错~"

        status_response = DailyStatusResponse(
            id=status.id,
            date=status.date,
            mood=status.mood,
            energy_level=status.energy_level,
            health_conditions=conditions,
            feeding_count=status.feeding_count,
            sleep_hours=status.sleep_hours,
            notes=status.notes,
            created_at=status.created_at,
            updated_at=status.updated_at,
        )

        return StatusNotification(
            status=status_response,
            message=message,
            suggestions=suggestions or ["继续保持关心~"],
        )

    # ============================================================
    # Tasks
    # ============================================================

    async def get_or_generate_daily_tasks(
        self, binding_id: str
    ) -> list[DailyTaskResponse]:
        """Get today's tasks or generate new ones."""
        today = date.today()

        # Check for existing tasks
        result = await self.db.execute(
            select(PartnerDailyTask)
            .where(
                PartnerDailyTask.binding_id == binding_id,
                PartnerDailyTask.date == today,
            )
            .options(selectinload(PartnerDailyTask.template))
        )
        existing_tasks = list(result.scalars().all())

        if existing_tasks:
            return [self._task_to_response(t) for t in existing_tasks]

        # Generate new tasks (1 easy, 1 medium, 1 hard)
        tasks = []
        for difficulty in [
            TaskDifficulty.EASY,
            TaskDifficulty.MEDIUM,
            TaskDifficulty.HARD,
        ]:
            template_result = await self.db.execute(
                select(TaskTemplate).where(
                    TaskTemplate.difficulty == difficulty,
                    TaskTemplate.is_active.is_(True),
                )
            )
            templates = list(template_result.scalars().all())
            if templates:
                template = random.choice(templates)
                task = PartnerDailyTask(
                    binding_id=binding_id,
                    template_id=template.id,
                    date=today,
                )
                self.db.add(task)
                tasks.append((task, template))

        await self.db.flush()

        # Refresh to get IDs
        result_tasks = []
        for task, template in tasks:
            task.template = template
            result_tasks.append(self._task_to_response(task))

        return result_tasks

    async def complete_task(self, task_id: str, partner_id: str) -> PartnerDailyTask:
        """Mark a task as completed by partner."""
        result = await self.db.execute(
            select(PartnerDailyTask)
            .where(PartnerDailyTask.id == task_id)
            .options(
                selectinload(PartnerDailyTask.binding),
                selectinload(PartnerDailyTask.template),
            )
        )
        task = result.scalar_one_or_none()

        if not task:
            raise ValueError("任务不存在")
        if task.binding.partner_id != partner_id:
            raise ValueError("无权操作此任务")
        if task.status != TaskStatus.AVAILABLE:
            raise ValueError("任务状态不允许完成")

        task.status = TaskStatus.COMPLETED
        task.completed_at = datetime.utcnow()
        await self.db.flush()

        return task

    async def reject_task(self, task_id: str, mom_id: str) -> PartnerDailyTask:
        """Mom rejects task - reset to available status."""
        result = await self.db.execute(
            select(PartnerDailyTask)
            .where(PartnerDailyTask.id == task_id)
            .options(
                selectinload(PartnerDailyTask.binding),
                selectinload(PartnerDailyTask.template),
            )
        )
        task = result.scalar_one_or_none()

        if not task:
            raise ValueError("任务不存在")
        if task.binding.mom_id != mom_id:
            raise ValueError("无权操作此任务")
        if task.status != TaskStatus.COMPLETED:
            raise ValueError("任务状态不是已完成")

        # Reset task to available
        task.status = TaskStatus.AVAILABLE
        task.completed_at = None
        await self.db.flush()

        return task

    async def confirm_task(
        self, task_id: str, mom_id: str, feedback: str
    ) -> tuple[PartnerDailyTask, int]:
        """Mom confirms task completion and awards points."""
        result = await self.db.execute(
            select(PartnerDailyTask)
            .where(PartnerDailyTask.id == task_id)
            .options(
                selectinload(PartnerDailyTask.binding),
                selectinload(PartnerDailyTask.template),
            )
        )
        task = result.scalar_one_or_none()

        if not task:
            raise ValueError("任务不存在")
        if task.binding.mom_id != mom_id:
            raise ValueError("无权确认此任务")
        if task.status != TaskStatus.COMPLETED:
            raise ValueError("任务尚未完成")

        # Award points
        points = TASK_POINTS.get(task.template.difficulty, 10)

        task.status = TaskStatus.CONFIRMED
        task.confirmed_at = datetime.utcnow()
        task.mom_feedback = feedback
        task.points_awarded = points

        # Update progress
        progress = await self._get_or_create_progress(task.binding.id)
        progress.total_points += points
        progress.tasks_completed += 1
        progress.tasks_confirmed += 1

        # Update streak
        today = date.today()
        if progress.last_task_date:
            if progress.last_task_date == today - timedelta(days=1):
                progress.current_streak += 1
            elif progress.last_task_date != today:
                progress.current_streak = 1
        else:
            progress.current_streak = 1

        progress.last_task_date = today
        if progress.current_streak > progress.longest_streak:
            progress.longest_streak = progress.current_streak

        # Check for level up
        new_level = self._calculate_level(progress.total_points)
        if new_level != progress.current_level:
            progress.current_level = new_level
            # Could award badge for level up here

        await self.db.flush()

        return task, points

    def _task_to_response(self, task: PartnerDailyTask) -> DailyTaskResponse:
        """Convert task model to response."""
        from .schemas import TaskTemplateResponse

        return DailyTaskResponse(
            id=task.id,
            template=TaskTemplateResponse(
                id=task.template.id,
                title=task.template.title,
                description=task.template.description,
                difficulty=task.template.difficulty,
                points=task.template.points,
                category=task.template.category,
            ),
            date=task.date,
            status=task.status,
            completed_at=task.completed_at,
            confirmed_at=task.confirmed_at,
            mom_feedback=task.mom_feedback,
            points_awarded=task.points_awarded,
        )

    # ============================================================
    # Progress
    # ============================================================

    async def get_progress(self, binding_id: str) -> ProgressResponse:
        """Get partner's progress."""
        progress = await self._get_or_create_progress(binding_id)

        next_level = None
        points_to_next = None

        # Calculate next level
        levels = list(PartnerLevel)
        current_idx = levels.index(progress.current_level)
        if current_idx < len(levels) - 1:
            next_level = levels[current_idx + 1]
            points_to_next = LEVEL_THRESHOLDS[next_level] - progress.total_points

        return ProgressResponse(
            total_points=progress.total_points,
            current_level=progress.current_level,
            next_level=next_level,
            points_to_next_level=max(0, points_to_next) if points_to_next else None,
            tasks_completed=progress.tasks_completed,
            tasks_confirmed=progress.tasks_confirmed,
            current_streak=progress.current_streak,
            longest_streak=progress.longest_streak,
        )

    async def get_badges(self, binding_id: str) -> list[BadgeResponse]:
        """Get partner's badges."""
        result = await self.db.execute(
            select(PartnerBadge).where(PartnerBadge.binding_id == binding_id)
        )
        badges = result.scalars().all()
        return [
            BadgeResponse(
                id=b.id,
                badge_type=b.badge_type,
                badge_name=b.badge_name,
                badge_icon=b.badge_icon,
                description=b.description,
                awarded_at=b.awarded_at,
            )
            for b in badges
        ]

    async def _get_or_create_progress(self, binding_id: str) -> PartnerProgress:
        """Get or create progress record."""
        result = await self.db.execute(
            select(PartnerProgress).where(PartnerProgress.binding_id == binding_id)
        )
        progress = result.scalar_one_or_none()

        if not progress:
            progress = PartnerProgress(binding_id=binding_id)
            self.db.add(progress)
            await self.db.flush()

        return progress

    def _calculate_level(self, points: int) -> PartnerLevel:
        """Calculate level based on points."""
        for level in reversed(list(PartnerLevel)):
            if points >= LEVEL_THRESHOLDS[level]:
                return level
        return PartnerLevel.INTERN

    # ============================================================
    # Memories
    # ============================================================

    async def add_memory(self, binding_id: str, data: MemoryCreate) -> Memory:
        """Add a memory photo."""
        memory = Memory(
            binding_id=binding_id,
            photo_url=data.photo_url,
            caption=data.caption,
            date=data.memory_date or date.today(),
            milestone=data.milestone,
        )
        self.db.add(memory)
        await self.db.flush()
        return memory

    async def get_memories(
        self, binding_id: str, limit: int = 30, offset: int = 0
    ) -> list[MemoryResponse]:
        """Get memories for a binding."""
        result = await self.db.execute(
            select(Memory)
            .where(Memory.binding_id == binding_id)
            .order_by(Memory.date.desc())
            .limit(limit)
            .offset(offset)
        )
        memories = result.scalars().all()
        return [
            MemoryResponse(
                id=m.id,
                photo_url=m.photo_url,
                caption=m.caption,
                date=m.date,
                milestone=m.milestone,
                created_at=m.created_at,
            )
            for m in memories
        ]

    async def generate_album(
        self, binding_id: str, milestone: str | None = None
    ) -> AlbumResponse:
        """Generate an album/memory book."""
        # Get memories
        query = select(Memory).where(Memory.binding_id == binding_id)
        if milestone:
            query = query.where(Memory.milestone == milestone)
        query = query.order_by(Memory.date.asc())

        result = await self.db.execute(query)
        memories = result.scalars().all()

        memory_responses = [
            MemoryResponse(
                id=m.id,
                photo_url=m.photo_url,
                caption=m.caption,
                date=m.date,
                milestone=m.milestone,
                created_at=m.created_at,
            )
            for m in memories
        ]

        # Calculate stats
        total_days = len(set(m.date for m in memories))
        milestones = list(set(m.milestone for m in memories if m.milestone))

        # Generate title
        if milestone:
            title = f"宝宝{milestone}回忆录"
        else:
            title = "我们的时光记录"

        return AlbumResponse(
            title=title,
            subtitle="每一天，都是爱的见证",
            cover_photo_url=memory_responses[0].photo_url if memory_responses else None,
            memories=memory_responses,
            total_days=total_days,
            milestones=milestones,
        )


# Dependency injection helper
async def get_guardian_service(db: AsyncSession) -> GuardianService:
    """Get guardian service instance."""
    return GuardianService(db)
