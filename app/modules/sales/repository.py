from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.sales.models import Sale, SaleItem

class SaleRepository:
    
    @staticmethod
    async def create_with_items(tenant_id: str, seller_id: str | None, total: float, items_data: list[dict], session: AsyncSession) -> Sale:
        sale = Sale(tenant_id=UUID(tenant_id), seller_id=UUID(seller_id) if seller_id else None, total=total)
        
        items = []
        for item in items_data:
            items.append(SaleItem(
                tenant_id=UUID(tenant_id),
                product_id=item["product_id"],
                quantity=item["quantity"],
                unit_price=item["unit_price"]
            ))
            
        sale.items = items
        session.add(sale)
        await session.flush()
        return sale

    @staticmethod
    async def get_by_id(sale_id: str, tenant_id: str, session: AsyncSession) -> Sale | None:
        stmt = (
            select(Sale)
            .where(Sale.id == UUID(sale_id), Sale.tenant_id == UUID(tenant_id))
            .options(selectinload(Sale.items))
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def list_by_tenant(tenant_id: str, session: AsyncSession) -> list[Sale]:
        stmt = (
            select(Sale)
            .where(Sale.tenant_id == UUID(tenant_id))
            .order_by(Sale.created_at.desc())
            .options(selectinload(Sale.items))
        )
        result = await session.execute(stmt)
        return list(result.scalars().all())
