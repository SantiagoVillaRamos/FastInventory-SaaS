from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.modules.tenants.schemas import TenantCreate, TenantRead, TenantUpdate
from app.modules.tenants.repository import TenantRepository
from app.modules.users.models import User, RoleEnum
from app.core.security import hash_password

class TenantService:
    @staticmethod
    async def register_tenant(data: TenantCreate, session: AsyncSession) -> TenantRead:
        """QAS-06: Onboarding Atómico. Crea Tenant y User Admin en una sola transacción."""
        
        # 1. Validar slug
        existing = await TenantRepository.get_by_slug(data.slug, session)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="El slug ya está en uso"
            )
            
        # 2. Validar email
        stmt_email = select(User).where(User.email == data.admin_email)
        result_email = await session.execute(stmt_email)
        if result_email.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="El correo ya está registrado"
            )
            
        # 3. Crear Tenant
        tenant_data = {
            "name": data.business_name,
            "slug": data.slug,
            "plan": data.plan
        }
        tenant = await TenantRepository.create(tenant_data, session)
        
        # 4. Crear Admin (con ref a tenant.id)
        admin_user = User(
            tenant_id=tenant.id,
            email=data.admin_email,
            name=data.admin_name,
            role=RoleEnum.ADMIN,
            hashed_password=hash_password(data.admin_password)
        )
        session.add(admin_user)
        # 5. Todo el commit exitoso al final
        await session.commit()
            
        return TenantRead.model_validate(tenant)

    @staticmethod
    async def get_my_tenant(tenant_id: str, session: AsyncSession) -> TenantRead:
        tenant = await TenantRepository.get_by_id(tenant_id, session)
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant no encontrado")
        return TenantRead.model_validate(tenant)
        
    @staticmethod
    async def update_tenant(tenant_id: str, data: TenantUpdate, session: AsyncSession) -> TenantRead:
        tenant = await TenantRepository.update(tenant_id, data.model_dump(exclude_unset=True), session)
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant no encontrado")
        await session.commit()
        return TenantRead.model_validate(tenant)
