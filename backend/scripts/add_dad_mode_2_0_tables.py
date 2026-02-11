"""
Manual migration script for Dad Mode 2.0 tables.

This script adds new database tables and columns required for Dad Mode 2.0.
Run this after updating the models.

Usage:
    cd /home/rachelily/MomShell/backend
    python scripts/add_dad_mode_2_0_tables.py
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text

from app.core.database import engine


async def run_migration():
    """Run the migration to add Dad Mode 2.0 tables."""

    async with engine.begin() as conn:
        # ============================================================
        # Add new columns to echo_youth_memoirs table
        # ============================================================
        # SQLite doesn't support IF NOT EXISTS in ALTER TABLE,
        # so we need to check if columns exist first

        print("Checking echo_youth_memoirs table structure...")

        # Get existing columns
        result = await conn.execute(text("PRAGMA table_info(echo_youth_memoirs)"))
        existing_columns = {row[1] for row in result.fetchall()}

        # Add status column if not exists
        if "status" not in existing_columns:
            print("  Adding status column...")
            await conn.execute(
                text(
                    "ALTER TABLE echo_youth_memoirs ADD COLUMN status VARCHAR(20) DEFAULT 'completed'"
                )
            )
        else:
            print("  status column already exists")

        # Add error_message column if not exists
        if "error_message" not in existing_columns:
            print("  Adding error_message column...")
            await conn.execute(
                text(
                    "ALTER TABLE echo_youth_memoirs ADD COLUMN error_message VARCHAR(500)"
                )
            )
        else:
            print("  error_message column already exists")

        # Add is_revealed column if not exists
        if "is_revealed" not in existing_columns:
            print("  Adding is_revealed column...")
            await conn.execute(
                text(
                    "ALTER TABLE echo_youth_memoirs ADD COLUMN is_revealed BOOLEAN DEFAULT FALSE"
                )
            )
        else:
            print("  is_revealed column already exists")

        # ============================================================
        # Create echo_task_shells table
        # ============================================================

        print("\nCreating echo_task_shells table...")

        # Check if table exists
        result = await conn.execute(
            text(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='echo_task_shells'"
            )
        )
        if not result.fetchone():
            await conn.execute(
                text("""
                CREATE TABLE echo_task_shells (
                    id VARCHAR(36) PRIMARY KEY,
                    binding_id VARCHAR(36) NOT NULL REFERENCES partner_bindings(id) ON DELETE CASCADE,
                    shell_type VARCHAR(20) NOT NULL DEFAULT 'normal',
                    status VARCHAR(20) NOT NULL DEFAULT 'muddy',
                    creator_role VARCHAR(20) NOT NULL DEFAULT 'system',
                    template_id VARCHAR(36) REFERENCES task_templates(id) ON DELETE SET NULL,
                    custom_title VARCHAR(200),
                    custom_description TEXT,
                    wish_bottle_id VARCHAR(36) REFERENCES echo_wish_bottles(id) ON DELETE SET NULL,
                    bound_memoir_id VARCHAR(36) REFERENCES echo_youth_memoirs(id) ON DELETE SET NULL,
                    memory_sticker_url VARCHAR(500),
                    memory_text TEXT,
                    confirmation_status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
                    washing_started_at TIMESTAMP,
                    washed_at TIMESTAMP,
                    opened_at TIMESTAMP,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """)
            )
            # Create indexes separately
            await conn.execute(
                text(
                    "CREATE INDEX ix_echo_task_shells_binding_id ON echo_task_shells(binding_id)"
                )
            )
            await conn.execute(
                text(
                    "CREATE INDEX ix_echo_task_shells_status ON echo_task_shells(status)"
                )
            )
            print("  echo_task_shells table created")
        else:
            print("  echo_task_shells table already exists")

        # ============================================================
        # Create echo_wish_bottles table
        # ============================================================

        print("\nCreating echo_wish_bottles table...")

        result = await conn.execute(
            text(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='echo_wish_bottles'"
            )
        )
        if not result.fetchone():
            await conn.execute(
                text("""
                CREATE TABLE echo_wish_bottles (
                    id VARCHAR(36) PRIMARY KEY,
                    binding_id VARCHAR(36) NOT NULL REFERENCES partner_bindings(id) ON DELETE CASCADE,
                    wish_type VARCHAR(20) NOT NULL,
                    content TEXT NOT NULL,
                    emoji_hint VARCHAR(50),
                    status VARCHAR(20) NOT NULL DEFAULT 'drifting',
                    caught_at TIMESTAMP,
                    resulting_shell_id VARCHAR(36) REFERENCES echo_task_shells(id) ON DELETE SET NULL,
                    completed_at TIMESTAMP,
                    mom_reaction VARCHAR(20),
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """)
            )
            await conn.execute(
                text(
                    "CREATE INDEX ix_echo_wish_bottles_binding_id ON echo_wish_bottles(binding_id)"
                )
            )
            await conn.execute(
                text(
                    "CREATE INDEX ix_echo_wish_bottles_status ON echo_wish_bottles(status)"
                )
            )
            print("  echo_wish_bottles table created")
        else:
            print("  echo_wish_bottles table already exists")

        # ============================================================
        # Create echo_memory_shells table
        # ============================================================

        print("\nCreating echo_memory_shells table...")

        result = await conn.execute(
            text(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='echo_memory_shells'"
            )
        )
        if not result.fetchone():
            await conn.execute(
                text("""
                CREATE TABLE echo_memory_shells (
                    id VARCHAR(36) PRIMARY KEY,
                    binding_id VARCHAR(36) NOT NULL REFERENCES partner_bindings(id) ON DELETE CASCADE,
                    creator_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    title VARCHAR(200) NOT NULL,
                    content TEXT NOT NULL,
                    photo_url VARCHAR(500),
                    sticker_style VARCHAR(20) NOT NULL,
                    sticker_url VARCHAR(500),
                    status VARCHAR(20) NOT NULL DEFAULT 'generating',
                    opened_at TIMESTAMP,
                    mom_reaction VARCHAR(20),
                    error_message VARCHAR(500),
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """)
            )
            await conn.execute(
                text(
                    "CREATE INDEX ix_echo_memory_shells_binding_id ON echo_memory_shells(binding_id)"
                )
            )
            await conn.execute(
                text(
                    "CREATE INDEX ix_echo_memory_shells_creator_id ON echo_memory_shells(creator_id)"
                )
            )
            await conn.execute(
                text(
                    "CREATE INDEX ix_echo_memory_shells_status ON echo_memory_shells(status)"
                )
            )
            print("  echo_memory_shells table created")
        else:
            print("  echo_memory_shells table already exists")

        # ============================================================
        # Create echo_notifications table
        # ============================================================

        print("\nCreating echo_notifications table...")

        result = await conn.execute(
            text(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='echo_notifications'"
            )
        )
        if not result.fetchone():
            await conn.execute(
                text("""
                CREATE TABLE echo_notifications (
                    id VARCHAR(36) PRIMARY KEY,
                    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    notification_type VARCHAR(30) NOT NULL,
                    title VARCHAR(200) NOT NULL,
                    message TEXT NOT NULL,
                    related_entity_type VARCHAR(50),
                    related_entity_id VARCHAR(36),
                    is_read BOOLEAN NOT NULL DEFAULT FALSE,
                    read_at TIMESTAMP,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """)
            )
            await conn.execute(
                text(
                    "CREATE INDEX ix_echo_notifications_user_id ON echo_notifications(user_id)"
                )
            )
            await conn.execute(
                text(
                    "CREATE INDEX ix_echo_notifications_notification_type ON echo_notifications(notification_type)"
                )
            )
            await conn.execute(
                text(
                    "CREATE INDEX ix_echo_notifications_is_read ON echo_notifications(is_read)"
                )
            )
            print("  echo_notifications table created")
        else:
            print("  echo_notifications table already exists")

        print("\n✅ Dad Mode 2.0 migration completed successfully!")
        print("\nNew tables created:")
        print("  - echo_task_shells")
        print("  - echo_wish_bottles")
        print("  - echo_memory_shells")
        print("  - echo_notifications")
        print("\nUpdated tables:")
        print(
            "  - echo_youth_memoirs (added status, error_message, is_revealed columns)"
        )


if __name__ == "__main__":
    print("Starting Dad Mode 2.0 migration...")
    asyncio.run(run_migration())
