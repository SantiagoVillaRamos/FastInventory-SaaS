from uuid import UUID
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.users.models import User

class UserRepository:
    @staticmethod
    async def get_by_id(user_id: UUID | str, session: AsyncSession) -> User | None:
        if isinstance(user_id, str):
            user_id = UUID(user_id)
        stmt = select(User).where(User.id == user_id)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_email(email: str, session: AsyncSession) -> User | None:
        stmt = select(User).where(User.email == email)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def create(data: dict, session: AsyncSession) -> User:
        user = User(**data)
        session.add(user)
        await session.flush()
        return user

    @staticmethod
    async def list_by_tenant(tenant_id: str, session: AsyncSession) -> list[User]:
        # QAS-03 Aislamiento: El WHERE es obligatorio en cada select()
        stmt = select(User).where(User.tenant_id == UUID(tenant_id)).order_by(User.created_at.desc())
        result = await session.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def count_by_tenant(tenant_id: str, session: AsyncSession) -> int:
        stmt = select(func.count(User.id)).where(User.tenant_id == UUID(tenant_id))
        result = await session.execute(stmt)
        return result.scalar_one()

    @staticmethod
    async def update(user_id: str, tenant_id: str, update_data: dict, session: AsyncSession) -> User | None:
        # Aislamiento: Se fuerza incluir tenant_id en el filtro para que nadie modifique un user_id de otro tenant
        stmt = select(User).where(User.id == UUID(user_id), User.tenant_id == UUID(tenant_id))
        result = await session.execute(stmt)
        user = result.scalar_one_or_none()
        
        if user:
            for key, value in update_data.items():
                setattr(user, key, value)
            await session.flush()
        return user
