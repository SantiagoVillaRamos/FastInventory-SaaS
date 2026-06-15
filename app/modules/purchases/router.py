import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_cache, get_db, require_admin
from app.modules.purchases.schemas import (
    PurchaseOrderCreate,
    PurchaseOrderDetailRead,
    PurchaseOrderListRead,
    PurchaseOrderRead,
)
from app.modules.purchases.service import PurchaseService

router = APIRouter(tags=["Purchases"])


@router.post(
    "/",
    response_model=PurchaseOrderRead,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar Orden de Compra",
)
async def create_purchase(
    data: PurchaseOrderCreate,
    db: AsyncSession = Depends(get_db),
    cache: aioredis.Redis = Depends(get_cache),
    current_user: dict = Depends(require_admin),
) -> PurchaseOrderRead:
    return await PurchaseService.create_purchase_order(
        tenant_id=current_user["tenant_id"],
        created_by=current_user["sub"],
        data=data,
        db=db,
        cache=cache,
    )


@router.get(
    "/",
    response_model=list[PurchaseOrderListRead],
    summary="Listar Órdenes de Compra",
)
async def list_purchases(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
) -> list[PurchaseOrderListRead]:
    return await PurchaseService.list_purchase_orders(
        tenant_id=current_user["tenant_id"],
        db=db,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/{purchase_id}",
    response_model=PurchaseOrderDetailRead,
    summary="Detalle de Orden de Compra",
)
async def get_purchase(
    purchase_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
) -> PurchaseOrderDetailRead:
    return await PurchaseService.get_purchase_order(
        purchase_id=purchase_id,
        tenant_id=current_user["tenant_id"],
        db=db,
    )
