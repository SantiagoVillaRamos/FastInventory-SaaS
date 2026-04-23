from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis
from typing import List

from app.core.dependencies import get_db, get_cache, require_superadmin
from app.modules.admin.schemas import TenantAdminRead, MetricsRead, PlanChangeRequest
from app.modules.admin.service import AdminService

# Todos los endpoints requieren el rol superadmin
router = APIRouter(dependencies=[Depends(require_superadmin)])


@router.get("/tenants", response_model=List[TenantAdminRead], tags=["Admin"])
async def list_all_tenants(db: AsyncSession = Depends(get_db)):
    """RF-07: Lista absolutamente todos los tenants de la plataforma (sin filtro de tenant)."""
    return await AdminService.list_tenants(db)


@router.post("/tenants/{tenant_id}/suspend", response_model=TenantAdminRead, tags=["Admin"])
async def suspend_tenant(
    tenant_id: str,
    db: AsyncSession = Depends(get_db),
    cache: aioredis.Redis = Depends(get_cache),
):
    """HU-16: Suspende el acceso. El efecto se propaga en ≤30s via Redis."""
    return await AdminService.suspend_tenant(tenant_id, db, cache)


@router.post("/tenants/{tenant_id}/activate", response_model=TenantAdminRead, tags=["Admin"])
async def activate_tenant(
    tenant_id: str,
    db: AsyncSession = Depends(get_db),
    cache: aioredis.Redis = Depends(get_cache),
):
    """Reactiva un tenant previamente suspendido."""
    return await AdminService.activate_tenant(tenant_id, db, cache)


@router.patch("/tenants/{tenant_id}/plan", response_model=TenantAdminRead, tags=["Admin"])
async def change_plan(
    tenant_id: str,
    data: PlanChangeRequest,
    db: AsyncSession = Depends(get_db),
):
    """Cambia el plan de suscripción y registra el cambio en la tabla de auditoría."""
    return await AdminService.change_plan(tenant_id, data, db)


@router.get("/metrics", response_model=MetricsRead, tags=["Admin"])
async def platform_metrics(db: AsyncSession = Depends(get_db)):
    """Métricas globales: tenants activos/suspendidos y volumen total de ventas del día."""
    return await AdminService.get_metrics(db)
