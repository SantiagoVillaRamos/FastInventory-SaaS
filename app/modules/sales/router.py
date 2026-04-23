from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis
from typing import List

from app.core.dependencies import get_db, get_cache, get_current_tenant
from app.modules.sales.schemas import SaleCreate, SaleRead
from app.modules.sales.service import SaleService

router = APIRouter(dependencies=[Depends(get_current_tenant)])

@router.post("/", response_model=SaleRead, status_code=status.HTTP_201_CREATED, tags=["Sales"])
async def create_sale(
    data: SaleCreate, 
    db: AsyncSession = Depends(get_db),
    cache: aioredis.Redis = Depends(get_cache),
    current_user: dict = Depends(get_current_tenant)
):
    """(QAS-01 Atomicity) Procesa una Venta descontando el stock atómicamente."""
    # Recuperamos el rol sub del JWT si existe, dependemos del payload interceptado
    seller_id = current_user.get("sub") 
    return await SaleService.create_sale(current_user["id"], seller_id, data, db, cache)


@router.get("/", response_model=List[SaleRead], tags=["Sales"])
async def list_sales(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_tenant)
):
    """Lista las facturas/ventas realizadas en el tenant (QAS-03)."""
    return await SaleService.list_sales(current_user["id"], db)


@router.get("/{sale_id}", response_model=SaleRead, tags=["Sales"])
async def get_sale(
    sale_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_tenant)
):
    """Visualiza el detalle de una venta en específico."""
    return await SaleService.get_sale(sale_id, current_user["id"], db)
