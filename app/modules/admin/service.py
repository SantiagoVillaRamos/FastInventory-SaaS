from datetime import datetime, timedelta, timezone
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis
from typing import List

from app.modules.tenants.models import Tenant, PlanEnum
from app.modules.sales.models import Sale
from app.modules.admin.models import PlanAuditLog
from app.modules.admin.schemas import TenantAdminRead, MetricsRead, PlanChangeRequest


class AdminService:

    @staticmethod
    async def list_tenants(session: AsyncSession) -> List[TenantAdminRead]:
        """RF-07: Lista TODOS los tenants sin filtro (excepción documentada para super-admins)."""
        stmt = select(Tenant).order_by(Tenant.created_at.desc())
        result = await session.execute(stmt)
        return [TenantAdminRead.model_validate(t) for t in result.scalars().all()]

    @staticmethod
    async def suspend_tenant(tenant_id: str, session: AsyncSession, cache: aioredis.Redis) -> TenantAdminRead:
        """HU-16: Suspende el tenant y propaga el estado a Redis (TTL 30s) para propagación ultra-rápida."""
        tenant = await session.get(Tenant, UUID(tenant_id))
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant no encontrado")
        if not tenant.is_active:
            raise HTTPException(status_code=400, detail="El tenant ya está suspendido")

        tenant.is_active = False
        await session.commit()

        # Redis con TTL 30s para que el cambio se propague rapidamente a todos los pods (QAS)
        try:
            await cache.set(f"tenant:{tenant_id}:status", "suspended", ex=30)
        except aioredis.RedisError:
            pass

        return TenantAdminRead.model_validate(tenant)

    @staticmethod
    async def activate_tenant(tenant_id: str, session: AsyncSession, cache: aioredis.Redis) -> TenantAdminRead:
        """Reactiva un tenant suspendido y elimina su bandera en Redis."""
        tenant = await session.get(Tenant, UUID(tenant_id))
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant no encontrado")
        if tenant.is_active:
            raise HTTPException(status_code=400, detail="El tenant ya está activo")

        tenant.is_active = True
        await session.commit()

        try:
            await cache.set(f"tenant:{tenant_id}:status", "active", ex=30)
        except aioredis.RedisError:
            pass

        return TenantAdminRead.model_validate(tenant)

    @staticmethod
    async def change_plan(tenant_id: str, data: PlanChangeRequest, session: AsyncSession) -> TenantAdminRead:
        """Cambia el plan del tenant e inserta un registro inmutable en plan_audit_log."""
        tenant = await session.get(Tenant, UUID(tenant_id))
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant no encontrado")

        if tenant.plan == data.new_plan:
            raise HTTPException(status_code=400, detail=f"El tenant ya está en el plan {data.new_plan.value}")

        old_plan = tenant.plan
        tenant.plan = data.new_plan

        audit = PlanAuditLog(
            tenant_id=UUID(tenant_id),
            old_plan=old_plan,
            new_plan=data.new_plan,
        )
        session.add(audit)
        await session.commit()

        return TenantAdminRead.model_validate(tenant)

    @staticmethod
    async def get_metrics(session: AsyncSession) -> MetricsRead:
        """Métricas globales de la plataforma: total de tenants y volumen de ventas del día."""
        # Contadores de tenants
        stmt_active = select(func.count(Tenant.id)).where(Tenant.is_active == True)
        stmt_suspended = select(func.count(Tenant.id)).where(Tenant.is_active == False)

        active_count = (await session.execute(stmt_active)).scalar_one()
        suspended_count = (await session.execute(stmt_suspended)).scalar_one()

        # Volumen diario (ventas de HOY en TODA la plataforma)
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        stmt_vol = select(func.coalesce(func.sum(Sale.total), 0)).where(Sale.created_at >= today_start)
        daily_volume = float((await session.execute(stmt_vol)).scalar_one())

        return MetricsRead(
            active_tenants=active_count,
            suspended_tenants=suspended_count,
            total_tenants=active_count + suspended_count,
            daily_sales_volume=daily_volume,
        )
