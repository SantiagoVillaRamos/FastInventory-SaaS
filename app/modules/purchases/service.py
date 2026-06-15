from uuid import UUID

import redis.asyncio as aioredis
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.products.repository import ProductRepository
from app.modules.purchases.repository import PurchaseRepository
from app.modules.purchases.schemas import (
    PurchaseOrderCreate,
    PurchaseOrderDetailRead,
    PurchaseOrderListRead,
    PurchaseOrderRead,
)


class PurchaseService:

    @staticmethod
    async def create_purchase_order(
        tenant_id: str,
        created_by: str,
        data: PurchaseOrderCreate,
        db: AsyncSession,
        cache: aioredis.Redis,
    ) -> PurchaseOrderRead:
        """F-32/F-33 — Registra una Orden de Compra e incrementa stock (producto o variante)."""
        tenant_uuid = UUID(tenant_id)
        items_data: list[dict] = []
        total_cost = 0.0

        for item in data.items:
            ok = await ProductRepository.increment_stock(
                product_id=item.product_id,
                tenant_id=tenant_uuid,
                quantity=item.quantity,
                session=db,
                variant_id=item.variant_id,
            )
            if not ok:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Producto o variante no encontrada en este negocio.",
                )

            subtotal = item.unit_cost * item.quantity
            total_cost += subtotal
            items_data.append({
                "product_id": item.product_id,
                "variant_id": item.variant_id,
                "quantity": item.quantity,
                "unit_cost": item.unit_cost,
            })

        order = await PurchaseRepository.create(
            db,
            tenant_id=tenant_uuid,
            created_by=UUID(created_by),
            supplier_name=data.supplier_name,
            notes=data.notes,
            total_cost=round(total_cost, 2),
            items_data=items_data,
        )

        await db.commit()
        await db.refresh(order, ["items"])
        await ProductRepository.invalidate_cache(tenant_id, cache)

        return PurchaseOrderRead.model_validate(order)

    @staticmethod
    async def list_purchase_orders(
        tenant_id: str,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 20,
    ) -> list[PurchaseOrderListRead]:
        rows = await PurchaseRepository.get_all(
            db, tenant_id=UUID(tenant_id), skip=skip, limit=limit
        )
        return [PurchaseOrderListRead.model_validate(row) for row in rows]

    @staticmethod
    async def get_purchase_order(
        purchase_id: str,
        tenant_id: str,
        db: AsyncSession,
    ) -> PurchaseOrderDetailRead:
        data = await PurchaseRepository.get_by_id(
            db, purchase_id=UUID(purchase_id), tenant_id=UUID(tenant_id)
        )
        if not data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Orden de compra no encontrada.",
            )
        return PurchaseOrderDetailRead.model_validate(data)
