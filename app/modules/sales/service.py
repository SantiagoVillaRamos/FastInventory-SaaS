from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis
from typing import List

from app.modules.sales.schemas import SaleCreate, SaleRead
from app.modules.sales.repository import SaleRepository
from app.modules.products.repository import ProductRepository


class SaleService:

    @staticmethod
    async def create_sale(tenant_id: str, seller_id: str | None, data: SaleCreate, session: AsyncSession, cache: aioredis.Redis) -> SaleRead:
        """
        QAS-01: Procesa una venta completa. Modifica N items en PostgreSQL y hace COMMIT.
        Si cualquier validación falla, lanza excepción y la DB aborta (ROLLBACK) implícitamente
        al cerrarse la solicitud.
        """
        total_sale = 0.0
        items_for_db = []
        
        for item_input in data.items:
            product = await ProductRepository.get_by_id(str(item_input.product_id), tenant_id, session)
            
            # QAS-03: Producto debe existir y pertenecer al tenant (422)
            if not product:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Producto {item_input.product_id} no encontrado en inventario")
                
            # Validar stock disponible
            if product.stock < item_input.quantity:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Stock insuficiente para el producto '{product.name}'. Disponible: {product.stock}, Requerido: {item_input.quantity}")
                
            # Descuento en la memoria de la sesión (se persiste con commit al final)
            product.stock -= item_input.quantity
            
            subtotal = float(product.price) * item_input.quantity
            total_sale += subtotal
            
            items_for_db.append({
                "product_id": product.id,
                "quantity": item_input.quantity,
                "unit_price": float(product.price)
            })
            
        # Generar cabecera e items
        sale = await SaleRepository.create_with_items(tenant_id, seller_id, total_sale, items_for_db, session)
        
        # Commit de la transacción completa (Headers + Items + Stock Updates)
        await session.commit()
        
        # Una vez segura la transacción, limpiamos caché de productos del inquilino
        await ProductRepository.invalidate_cache(tenant_id, cache)
        
        return SaleRead.model_validate(sale)

    @staticmethod
    async def get_sale(sale_id: str, tenant_id: str, session: AsyncSession) -> SaleRead:
        sale = await SaleRepository.get_by_id(sale_id, tenant_id, session)
        if not sale:
            raise HTTPException(status_code=404, detail="Venta no encontrada")
        return SaleRead.model_validate(sale)

    @staticmethod
    async def list_sales(tenant_id: str, session: AsyncSession) -> List[SaleRead]:
        sales = await SaleRepository.list_by_tenant(tenant_id, session)
        return [SaleRead.model_validate(s) for s in sales]
