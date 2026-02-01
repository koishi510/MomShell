"""Create or promote a user to admin."""

import asyncio
import sys

from sqlalchemy import select

from app.core.database import async_session_maker, init_db
from app.services.auth.security import get_password_hash
from app.services.community.enums import UserRole
from app.services.community.models import User


async def create_admin(
    username: str,
    email: str,
    password: str,
    nickname: str = "管理员",
) -> None:
    """Create a new admin user or promote existing user to admin."""
    await init_db()

    async with async_session_maker() as db:
        # Check if user exists
        result = await db.execute(
            select(User).where((User.username == username) | (User.email == email))
        )
        existing_user = result.scalar_one_or_none()

        if existing_user:
            # Promote to admin
            existing_user.role = UserRole.ADMIN
            if password:
                existing_user.password_hash = get_password_hash(password)
            await db.commit()
            print(f"用户 '{existing_user.username}' 已升级为管理员")
        else:
            # Create new admin user
            admin = User(
                username=username,
                email=email,
                password_hash=get_password_hash(password),
                nickname=nickname,
                role=UserRole.ADMIN,
                is_active=True,
                is_banned=False,
            )
            db.add(admin)
            await db.commit()
            print(f"管理员账号 '{username}' 创建成功")


def main():
    if len(sys.argv) < 4:
        print("用法: python -m scripts.create_admin <用户名> <邮箱> <密码> [昵称]")
        print(
            "示例: python -m scripts.create_admin admin admin@example.com 123456 管理员"
        )
        sys.exit(1)

    username = sys.argv[1]
    email = sys.argv[2]
    password = sys.argv[3]
    nickname = sys.argv[4] if len(sys.argv) > 4 else "管理员"

    asyncio.run(create_admin(username, email, password, nickname))


if __name__ == "__main__":
    main()
