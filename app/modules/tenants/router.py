from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_current_tenant, require_admin
from app.modules.tenants.schemas import TenantCreate, TenantRead, TenantUpdate
from app.modules.tenants.service import TenantService

router = APIRouter()


@router.post("/auth/register", response_model=TenantRead, status_code=201, tags=["Auth"])
async def register_tenant(data: TenantCreate, db: AsyncSession = Depends(get_db)):
    """(QAS-06) Onboarding Autónomo: Crea el negocio y el administrador."""
    return await TenantService.register_tenant(data, db)


@router.get("/tenants/me", response_model=TenantRead, tags=["Tenants"])
async def get_my_tenant(
    db: AsyncSession = Depends(get_db),
    tenant_info: dict = Depends(get_current_tenant),
):
    """(Seguridad) Obtiene los datos del tenant del usuario autenticado."""
    return await TenantService.get_my_tenant(tenant_info["id"], db)


@router.patch("/tenants/me", response_model=TenantRead, tags=["Tenants"])
async def update_my_tenant(
    data: TenantUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
    tenant_info: dict = Depends(get_current_tenant),
):
    """Actualiza configuración (ej. nombre) — Solo administradores."""
    return await TenantService.update_tenant(tenant_info["id"], data, db)
