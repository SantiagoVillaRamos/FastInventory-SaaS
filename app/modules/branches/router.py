from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_tenant, get_db, require_admin
from app.modules.branches.schemas import (
    BranchCreate,
    BranchRead,
    BranchStockRead,
    BranchStockUpdate,
    BranchUpdate,
)
from app.modules.branches.service import BranchService

router = APIRouter(dependencies=[Depends(get_current_tenant)])


@router.get("/", response_model=list[BranchRead], tags=["Branches"])
async def list_branches(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_tenant),
):
    """Lista todas las sucursales del negocio actual."""
    return await BranchService.list_branches(current_user["id"], db)


@router.post("/", response_model=BranchRead, status_code=status.HTTP_201_CREATED, tags=["Branches"])
async def create_branch(
    data: BranchCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """Crea una nueva sucursal (Solo Admins)."""
    return await BranchService.create_branch(current_user["tenant_id"], data, db)


@router.get("/{branch_id}", response_model=BranchRead, tags=["Branches"])
async def get_branch(
    branch_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_tenant),
):
    """Obtiene el detalle de una sucursal."""
    return await BranchService.get_branch(branch_id, current_user["id"], db)


@router.patch("/{branch_id}", response_model=BranchRead, tags=["Branches"])
async def update_branch(
    branch_id: str,
    data: BranchUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """Actualiza nombre, dirección o estado de la sucursal (Solo Admins)."""
    return await BranchService.update_branch(branch_id, current_user["tenant_id"], data, db)


@router.get("/{branch_id}/stock", response_model=list[BranchStockRead], tags=["Branches"])
async def get_branch_stock(
    branch_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_tenant),
):
    """Retorna el stock de todos los productos registrados en una sucursal."""
    return await BranchService.get_branch_stock(branch_id, current_user["id"], db)


@router.patch(
    "/{branch_id}/stock/{product_id}",
    response_model=BranchStockRead,
    tags=["Branches"],
)
async def set_branch_stock(
    branch_id: str,
    product_id: str,
    data: BranchStockUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """Ajusta manualmente el stock de un producto en una sucursal (Solo Admins)."""
    return await BranchService.set_branch_stock(
        branch_id, product_id, current_user["tenant_id"], data, db
    )
