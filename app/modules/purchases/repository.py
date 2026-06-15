from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.products.models import Product
from app.modules.purchases.models import PurchaseOrder, PurchaseOrderItem


class PurchaseRepository:

    @staticmethod
    async def create(
        db: AsyncSession,
        *,
        tenant_id: UUID,
        created_by: UUID,
        supplier_name: str | None,
        notes: str | None,
        total_cost: float,
        items_data: list[dict],
    ) -> PurchaseOrder:
        """Crea la PurchaseOrder y sus ítems dentro de la sesión activa.
        El commit lo maneja el router mediante el context manager de la sesión.
        """
        order = PurchaseOrder(
            tenant_id=tenant_id,
            created_by=created_by,
            supplier_name=supplier_name,
            notes=notes,
            total_cost=total_cost,
        )
        db.add(order)
        await db.flush()  # Obtener el ID de la orden antes de crear los ítems

        for item in items_data:
            db.add(PurchaseOrderItem(
                purchase_order_id=order.id,
                product_id=item["product_id"],
                quantity=item["quantity"],
                unit_cost=item["unit_cost"],
            ))

        await db.flush()
        return order

    @staticmethod
    async def get_all(
        db: AsyncSession,
        tenant_id: UUID,
        skip: int = 0,
        limit: int = 20,
    ) -> list[dict]:
        """Lista órdenes de compra del tenant con conteo de ítems.
        Retorna dicts enriquecidos para el schema PurchaseOrderListRead.
        """
        stmt = (
            select(
                PurchaseOrder,
                func.count(PurchaseOrderItem.id).label("items_count"),
            )
            .join(PurchaseOrderItem, PurchaseOrderItem.purchase_order_id == PurchaseOrder.id, isouter=True)
            .where(PurchaseOrder.tenant_id == tenant_id)
            .group_by(PurchaseOrder.id)
            .order_by(PurchaseOrder.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(stmt)
        rows = result.all()

        return [
            {
                "id": row.PurchaseOrder.id,
                "supplier_name": row.PurchaseOrder.supplier_name,
                "total_cost": float(row.PurchaseOrder.total_cost),
                "items_count": row.items_count,
                "created_at": row.PurchaseOrder.created_at,
            }
            for row in rows
        ]

    @staticmethod
    async def get_by_id(
        db: AsyncSession,
        purchase_id: UUID,
        tenant_id: UUID,
    ) -> dict | None:
        """Detalle completo de una orden, incluyendo nombre del producto en cada ítem."""
        stmt = (
            select(PurchaseOrder)
            .options(selectinload(PurchaseOrder.items))
            .where(
                PurchaseOrder.id == purchase_id,
                PurchaseOrder.tenant_id == tenant_id,
            )
        )
        result = await db.execute(stmt)
        order = result.scalar_one_or_none()
        if not order:
            return None

        # Obtener nombres de productos en una sola query
        product_ids = [item.product_id for item in order.items]
        names_result = await db.execute(
            select(Product.id, Product.name).where(Product.id.in_(product_ids))
        )
        product_names: dict[UUID, str] = {row.id: row.name for row in names_result.all()}

        return {
            "id": order.id,
            "tenant_id": order.tenant_id,
            "created_by": order.created_by,
            "supplier_name": order.supplier_name,
            "notes": order.notes,
            "total_cost": float(order.total_cost),
            "created_at": order.created_at,
            "items": [
                {
                    "id": item.id,
                    "product_id": item.product_id,
                    "product_name": product_names.get(item.product_id, "—"),
                    "quantity": item.quantity,
                    "unit_cost": float(item.unit_cost),
                }
                for item in order.items
            ],
        }
