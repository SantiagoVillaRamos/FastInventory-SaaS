from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.users.schemas import UserCreate, UserRead, UserUpdate
from app.modules.users.repository import UserRepository
from app.modules.tenants.repository import TenantRepository
from app.core.security import hash_password
from app.modules.tenants.models import PlanEnum

class UserService:
    # Límites de usuarios permitidos (incluyendo al administrador)
    PLAN_LIMITS = {
        PlanEnum.FREE: 2,
        PlanEnum.BASIC: 10,
        PlanEnum.PRO: float("inf")
    }

    @staticmethod
    async def create_user(tenant_id: str, data: UserCreate, session: AsyncSession) -> UserRead:
        # 1. Verificar si el email ya existe
        existing = await UserRepository.get_by_email(data.email, session)
        if existing:
            raise HTTPException(status_code=400, detail="El email ya está registrado")

        # 2. Obtener tenant para verificar su límite de plan
        tenant = await TenantRepository.get_by_id(tenant_id, session)
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant no encontrado")
            
        current_users_count = await UserRepository.count_by_tenant(tenant_id, session)
        max_users = UserService.PLAN_LIMITS.get(tenant.plan, 0)
        
        if current_users_count >= max_users:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail=f"Límite alcanzado. El plan {tenant.plan.value} permite máximo {max_users} usuarios."
            )

        # 3. Crear el usuario
        user_data = {
            "tenant_id": tenant.id,
            "email": data.email,
            "name": data.name,
            "role": getattr(data.role, "value", data.role),
            "hashed_password": hash_password(data.password)
        }
        user = await UserRepository.create(user_data, session)
        await session.commit()
        return UserRead.model_validate(user)

    @staticmethod
    async def list_users(tenant_id: str, session: AsyncSession) -> list[UserRead]:
        users = await UserRepository.list_by_tenant(tenant_id, session)
        return [UserRead.model_validate(u) for u in users]

    @staticmethod
    async def update_user(user_id: str, tenant_id: str, data: UserUpdate, session: AsyncSession) -> UserRead:
        user = await UserRepository.update(user_id, tenant_id, data.model_dump(exclude_unset=True), session)
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado en tu organización")
        await session.commit()
        return UserRead.model_validate(user)
