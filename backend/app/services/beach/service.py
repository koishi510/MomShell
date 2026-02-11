"""Beach service - business logic for Shell Beach system."""

import logging
import random
from datetime import datetime

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.community.models import User
from app.services.guardian.models import PartnerBinding

from .enums import BottleStatus, MemoryInjectionStatus, ShellStatus, ShellType, UserIdentity
from .models import DriftBottle, MemoryInjection, Shell, Sticker, UserShellCode

logger = logging.getLogger(__name__)


class BeachService:
    """Service for Shell Beach system operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ============================================================
    # Identity Operations
    # ============================================================

    async def get_user_identity(self, user_id: str) -> dict:
        """Get user's identity information."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user:
            return {"identity": None, "identity_locked": False, "shell_code": None}

        # Get shell code
        shell_code_result = await self.db.execute(
            select(UserShellCode).where(UserShellCode.user_id == user_id)
        )
        shell_code_record = shell_code_result.scalar_one_or_none()

        return {
            "identity": user.identity,
            "identity_locked": user.identity_locked,
            "shell_code": shell_code_record.shell_code if shell_code_record else None,
        }

    async def select_identity(self, user_id: str, identity: UserIdentity) -> dict:
        """Select user identity (one-time, permanent)."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user:
            raise ValueError("User not found")

        if user.identity_locked:
            raise ValueError("Identity already locked, cannot change")

        # Set identity and lock it
        user.identity = identity
        user.identity_locked = True

        # Create shell code if not exists
        shell_code_result = await self.db.execute(
            select(UserShellCode).where(UserShellCode.user_id == user_id)
        )
        shell_code_record = shell_code_result.scalar_one_or_none()

        if not shell_code_record:
            shell_code_record = UserShellCode(user_id=user_id)
            self.db.add(shell_code_record)

        await self.db.flush()

        return {
            "identity": user.identity,
            "identity_locked": user.identity_locked,
            "shell_code": shell_code_record.shell_code,
        }

    async def get_shell_code(self, user_id: str) -> str | None:
        """Get user's shell code."""
        result = await self.db.execute(
            select(UserShellCode).where(UserShellCode.user_id == user_id)
        )
        shell_code_record = result.scalar_one_or_none()
        return shell_code_record.shell_code if shell_code_record else None

    async def pair_with_partner(self, user_id: str, partner_shell_code: str) -> dict:
        """Pair with partner using shell code."""
        # Find partner by shell code
        result = await self.db.execute(
            select(UserShellCode).where(UserShellCode.shell_code == partner_shell_code)
        )
        partner_shell_code_record = result.scalar_one_or_none()

        if not partner_shell_code_record:
            return {"success": False, "message": "Invalid shell code"}

        partner_id = partner_shell_code_record.user_id

        if partner_id == user_id:
            return {"success": False, "message": "Cannot pair with yourself"}

        # Get both users
        user_result = await self.db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()

        partner_result = await self.db.execute(select(User).where(User.id == partner_id))
        partner = partner_result.scalar_one_or_none()

        if not user or not partner:
            return {"success": False, "message": "User not found"}

        # Check that one is origin_seeker and one is guardian
        if user.identity == partner.identity:
            return {
                "success": False,
                "message": "Both users have the same identity. Need one origin_seeker and one guardian.",
            }

        # Determine who is mom and who is partner
        if user.identity == UserIdentity.ORIGIN_SEEKER:
            mom_id = user_id
            partner_user_id = partner_id
        else:
            mom_id = partner_id
            partner_user_id = user_id

        # Check if binding already exists
        existing_binding = await self.db.execute(
            select(PartnerBinding).where(
                and_(
                    PartnerBinding.mom_id == mom_id,
                    PartnerBinding.partner_id == partner_user_id,
                )
            )
        )
        if existing_binding.scalar_one_or_none():
            return {"success": False, "message": "Already paired with this partner"}

        # Create or update binding
        binding = PartnerBinding(
            mom_id=mom_id,
            partner_id=partner_user_id,
            status="bound",
            bound_at=datetime.utcnow(),
        )
        self.db.add(binding)

        return {
            "success": True,
            "partner_nickname": partner.nickname,
            "partner_avatar_url": partner.avatar_url,
            "message": "Successfully paired!",
        }

    # ============================================================
    # Shell Operations
    # ============================================================

    async def get_shells(self, user_id: str, shell_type: ShellType | None = None) -> list[Shell]:
        """Get user's shells."""
        query = select(Shell).where(Shell.owner_id == user_id)
        if shell_type:
            query = query.where(Shell.shell_type == shell_type)
        query = query.order_by(Shell.created_at.desc())

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def create_shell(
        self,
        user_id: str,
        title: str,
        content: str | None = None,
        memory_tag: str | None = None,
        shell_type: ShellType = ShellType.MEMORY,
    ) -> Shell:
        """Create a new shell."""
        # Random position on beach
        position_x = random.randint(10, 90)
        position_y = random.randint(30, 70)

        shell = Shell(
            owner_id=user_id,
            shell_type=shell_type,
            status=ShellStatus.DUSTY,
            title=title,
            content=content,
            memory_tag=memory_tag,
            position_x=position_x,
            position_y=position_y,
        )
        self.db.add(shell)
        await self.db.flush()
        return shell

    async def get_shell(self, shell_id: str, user_id: str) -> Shell | None:
        """Get a specific shell."""
        result = await self.db.execute(
            select(Shell).where(and_(Shell.id == shell_id, Shell.owner_id == user_id))
        )
        return result.scalar_one_or_none()

    async def open_shell(self, shell_id: str, user_id: str, content: str) -> Shell | None:
        """Open a dusty shell and record memory."""
        shell = await self.get_shell(shell_id, user_id)
        if not shell:
            return None

        if shell.status != ShellStatus.DUSTY:
            raise ValueError("Shell is not dusty")

        shell.content = content
        shell.status = ShellStatus.OPENED
        shell.opened_at = datetime.utcnow()

        await self.db.flush()
        return shell

    async def complete_shell(self, shell_id: str, user_id: str, sticker_id: str | None = None) -> Shell | None:
        """Mark shell as completed (sticker generated)."""
        shell = await self.get_shell(shell_id, user_id)
        if not shell:
            return None

        shell.status = ShellStatus.COMPLETED
        shell.completed_at = datetime.utcnow()
        if sticker_id:
            shell.sticker_id = sticker_id

        await self.db.flush()
        return shell

    # ============================================================
    # Sticker Operations
    # ============================================================

    async def get_stickers(self, user_id: str) -> list[Sticker]:
        """Get user's stickers (gallery)."""
        result = await self.db.execute(
            select(Sticker)
            .where(Sticker.owner_id == user_id)
            .order_by(Sticker.created_at.desc())
        )
        return list(result.scalars().all())

    async def create_sticker(
        self,
        user_id: str,
        memory_text: str,
        prompt: str,
        image_url: str,
        style: str = "sticker",
        thumbnail_url: str | None = None,
        generation_model: str | None = None,
    ) -> Sticker:
        """Create a sticker record."""
        sticker = Sticker(
            owner_id=user_id,
            memory_text=memory_text,
            prompt=prompt,
            image_url=image_url,
            style=style,
            thumbnail_url=thumbnail_url,
            generation_model=generation_model,
            generation_status="completed",
        )
        self.db.add(sticker)
        await self.db.flush()
        return sticker

    async def get_sticker(self, sticker_id: str) -> Sticker | None:
        """Get a specific sticker."""
        result = await self.db.execute(select(Sticker).where(Sticker.id == sticker_id))
        return result.scalar_one_or_none()

    # ============================================================
    # Drift Bottle Operations
    # ============================================================

    async def get_bottles(self, user_id: str, as_sender: bool = True) -> list[DriftBottle]:
        """Get drift bottles (as sender for mom, as receiver for dad)."""
        if as_sender:
            query = select(DriftBottle).where(DriftBottle.sender_id == user_id)
        else:
            query = select(DriftBottle).where(DriftBottle.receiver_id == user_id)

        query = query.order_by(DriftBottle.created_at.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_drifting_bottles(self, binding_id: str) -> list[DriftBottle]:
        """Get bottles that are still drifting (for dad to catch)."""
        result = await self.db.execute(
            select(DriftBottle).where(
                and_(
                    DriftBottle.binding_id == binding_id,
                    DriftBottle.status == BottleStatus.DRIFTING,
                )
            )
        )
        return list(result.scalars().all())

    async def create_bottle(
        self, sender_id: str, wish_content: str, binding_id: str
    ) -> DriftBottle:
        """Create a drift bottle (mom sends wish)."""
        # Get partner id from binding
        binding_result = await self.db.execute(
            select(PartnerBinding).where(PartnerBinding.id == binding_id)
        )
        binding = binding_result.scalar_one_or_none()
        receiver_id = binding.partner_id if binding else None

        bottle = DriftBottle(
            sender_id=sender_id,
            receiver_id=receiver_id,
            binding_id=binding_id,
            wish_content=wish_content,
            status=BottleStatus.DRIFTING,
        )
        self.db.add(bottle)
        await self.db.flush()
        return bottle

    async def catch_bottle(self, bottle_id: str, catcher_id: str) -> DriftBottle | None:
        """Catch a drifting bottle (dad catches)."""
        result = await self.db.execute(
            select(DriftBottle).where(
                and_(
                    DriftBottle.id == bottle_id,
                    DriftBottle.receiver_id == catcher_id,
                    DriftBottle.status == BottleStatus.DRIFTING,
                )
            )
        )
        bottle = result.scalar_one_or_none()

        if not bottle:
            return None

        bottle.status = BottleStatus.CAUGHT
        bottle.caught_at = datetime.utcnow()

        await self.db.flush()
        return bottle

    async def complete_bottle(self, bottle_id: str, completer_id: str) -> DriftBottle | None:
        """Mark a wish as completed (dad completes)."""
        result = await self.db.execute(
            select(DriftBottle).where(
                and_(
                    DriftBottle.id == bottle_id,
                    DriftBottle.receiver_id == completer_id,
                    DriftBottle.status == BottleStatus.CAUGHT,
                )
            )
        )
        bottle = result.scalar_one_or_none()

        if not bottle:
            return None

        bottle.status = BottleStatus.COMPLETED
        bottle.completed_at = datetime.utcnow()

        await self.db.flush()
        return bottle

    async def confirm_bottle_completion(self, bottle_id: str, mom_id: str) -> DriftBottle | None:
        """Mom confirms that wish was completed."""
        result = await self.db.execute(
            select(DriftBottle).where(
                and_(
                    DriftBottle.id == bottle_id,
                    DriftBottle.sender_id == mom_id,
                    DriftBottle.status == BottleStatus.COMPLETED,
                )
            )
        )
        bottle = result.scalar_one_or_none()

        if not bottle:
            return None

        bottle.mom_confirmed = True
        bottle.confirmed_at = datetime.utcnow()

        await self.db.flush()
        return bottle

    # ============================================================
    # Memory Injection Operations
    # ============================================================

    async def get_memory_injections(
        self, user_id: str, as_sender: bool = True
    ) -> list[MemoryInjection]:
        """Get memory injections (as sender for dad, as receiver for mom)."""
        if as_sender:
            query = select(MemoryInjection).where(MemoryInjection.sender_id == user_id)
        else:
            query = select(MemoryInjection).where(MemoryInjection.receiver_id == user_id)

        query = query.order_by(MemoryInjection.created_at.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_pending_injections(self, receiver_id: str) -> list[MemoryInjection]:
        """Get unseen memory injections for mom."""
        result = await self.db.execute(
            select(MemoryInjection).where(
                and_(
                    MemoryInjection.receiver_id == receiver_id,
                    MemoryInjection.status == MemoryInjectionStatus.PENDING,
                )
            )
        )
        return list(result.scalars().all())

    async def create_memory_injection(
        self,
        sender_id: str,
        receiver_id: str,
        binding_id: str,
        content_type: str,
        content: str,
        title: str | None = None,
        sticker_id: str | None = None,
    ) -> MemoryInjection:
        """Create a memory injection (dad sends to mom)."""
        injection = MemoryInjection(
            sender_id=sender_id,
            receiver_id=receiver_id,
            binding_id=binding_id,
            content_type=content_type,
            content=content,
            title=title,
            sticker_id=sticker_id,
            status=MemoryInjectionStatus.PENDING,
        )
        self.db.add(injection)
        await self.db.flush()
        return injection

    async def mark_injection_seen(self, injection_id: str, receiver_id: str) -> MemoryInjection | None:
        """Mark a memory injection as seen by mom."""
        result = await self.db.execute(
            select(MemoryInjection).where(
                and_(
                    MemoryInjection.id == injection_id,
                    MemoryInjection.receiver_id == receiver_id,
                )
            )
        )
        injection = result.scalar_one_or_none()

        if not injection:
            return None

        injection.status = MemoryInjectionStatus.SEEN
        injection.seen_at = datetime.utcnow()

        await self.db.flush()
        return injection

    # ============================================================
    # Beach View (Combined)
    # ============================================================

    async def get_beach_view(self, user_id: str, identity: UserIdentity) -> dict:
        """Get combined beach view for mom or dad."""
        shells = await self.get_shells(user_id)

        # Get binding to count pending items
        if identity == UserIdentity.ORIGIN_SEEKER:
            # Mom: count pending wishes and unseen injections
            binding_result = await self.db.execute(
                select(PartnerBinding).where(PartnerBinding.mom_id == user_id)
            )
        else:
            # Dad: count drifting bottles
            binding_result = await self.db.execute(
                select(PartnerBinding).where(PartnerBinding.partner_id == user_id)
            )

        binding = binding_result.scalar_one_or_none()

        pending_bottles = 0
        pending_injections = 0
        partner_nickname = None
        partner_avatar_url = None

        if binding:
            if identity == UserIdentity.ORIGIN_SEEKER:
                # Mom
                bottles = await self.get_bottles(user_id, as_sender=True)
                pending_bottles = len(
                    [b for b in bottles if b.status == BottleStatus.COMPLETED and not b.mom_confirmed]
                )
                injections = await self.get_pending_injections(user_id)
                pending_injections = len(injections)

                # Get partner info
                if binding.partner_id:
                    partner_result = await self.db.execute(
                        select(User).where(User.id == binding.partner_id)
                    )
                    partner = partner_result.scalar_one_or_none()
                    if partner:
                        partner_nickname = partner.nickname
                        partner_avatar_url = partner.avatar_url
            else:
                # Dad
                drifting = await self.get_drifting_bottles(binding.id)
                pending_bottles = len(drifting)

                # Get mom info
                if binding.mom_id:
                    mom_result = await self.db.execute(
                        select(User).where(User.id == binding.mom_id)
                    )
                    mom = mom_result.scalar_one_or_none()
                    if mom:
                        partner_nickname = mom.nickname
                        partner_avatar_url = mom.avatar_url

        return {
            "shells": shells,
            "pending_bottles": pending_bottles,
            "pending_injections": pending_injections,
            "partner_nickname": partner_nickname,
            "partner_avatar_url": partner_avatar_url,
        }
