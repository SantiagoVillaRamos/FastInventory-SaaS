from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.tenants.models import Tenant

class TenantRepository:
    
    @staticmethod
    async def create(data: dict, session: AsyncSession) -> Tenant:
        tenant = Tenant(**data)
        session.add(tenant)
        await session.flush()  # Obtiene el ID del tenant sin hacer commit aún
        return tenant

    @staticmethod
    async def get_by_id(tenant_id: UUID | str, session: AsyncSession) -> Tenant | None:
        if isinstance(tenant_id, str):
            tenant_id = UUID(tenant_id)
        stmt = select(Tenant).where(Tenant.id == tenant_id)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_slug(slug: str, session: AsyncSession) -> Tenant | None:
        stmt = select(Tenant).where(Tenant.slug == slug)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()
        
    @staticmethod
    async def update(tenant_id: UUID | str, update_data: dict, session: AsyncSession) -> Tenant | None:
        tenant = await TenantRepository.get_by_id(tenant_id, session)
        if tenant:
            for key, value in update_data.items():
                setattr(tenant, key, value)
            await session.flush()
        return tenant
