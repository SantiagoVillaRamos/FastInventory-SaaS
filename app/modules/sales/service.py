
import redis.asyncio as aioredis
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.products.repository import ProductRepository
from app.modules.sales.repository import SaleRepository
from app.modules.sales.schemas import SaleCreate, SaleRead


class SaleService:

    @staticmethod
    async def create_sale(tenant_id: str, seller_id: str | None, data: SaleCreate, session: AsyncSession, cache: aioredis.Redis) -> SaleRead:
        """
        QAS-01 / F-33 / F-34: Procesa una venta completa. Si el ítem trae variant_id,
        descuenta stock de la variante y usa su precio. Sin variant_id, opera sobre el producto base.
        Calcula dinámicamente el IVA y las retenciones del tenant.
        """
        from app.modules.tenants.repository import TenantRepository
        tenant = await TenantRepository.get_by_id(tenant_id, session)
        if not tenant:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant no encontrado")

        vat_rate = float(tenant.default_vat_rate)
        retention_rate = float(tenant.default_retention_rate)

        subtotal_sale = 0.0
        tax_sale = 0.0
        items_for_db = []

        for item_input in data.items:
            product = await ProductRepository.get_by_id(str(item_input.product_id), tenant_id, session)

            if not product:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Producto {item_input.product_id} no encontrado en inventario")

            # F-33: Determinar precio y validar stock según si hay variante o no
            if item_input.variant_id:
                # Buscar la variante específica
                from sqlalchemy import select
                from app.modules.products.models import ProductVariant
                stmt = select(ProductVariant).where(
                    ProductVariant.id == item_input.variant_id,
                    ProductVariant.product_id == item_input.product_id,
                )
                result = await session.execute(stmt)
                variant = result.scalar_one_or_none()

                if not variant:
                    raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Variante {item_input.variant_id} no encontrada para el producto.")
                if variant.stock < item_input.quantity:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Stock insuficiente para variante '{variant.name}'. Disponible: {variant.stock}, Requerido: {item_input.quantity}")

                unit_price = float(variant.price)
            else:
                # Producto simple
                if product.stock < item_input.quantity:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Stock insuficiente para '{product.name}'. Disponible: {product.stock}, Requerido: {item_input.quantity}")
                unit_price = float(product.price)

            # Descuento atómico (variante o producto simple)
            ok = await ProductRepository.decrement_stock(
                str(item_input.product_id), tenant_id, item_input.quantity, session,
                variant_id=item_input.variant_id,
            )
            if not ok:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se pudo descontar el stock.")

            item_subtotal = unit_price * item_input.quantity
            subtotal_sale += item_subtotal

            # F-34: Cálculo del IVA si el producto no está exento
            if not product.is_tax_exempt:
                tax_sale += item_subtotal * vat_rate

            items_for_db.append({
                "product_id": product.id,
                "variant_id": item_input.variant_id,
                "quantity": item_input.quantity,
                "unit_price": unit_price,
            })

        # F-34: Calcular retenciones globales sobre el subtotal y el total
        retention_sale = subtotal_sale * retention_rate
        total_sale = subtotal_sale + tax_sale - retention_sale

        sale = await SaleRepository.create_with_items(
            tenant_id=tenant_id,
            seller_id=seller_id,
            subtotal=round(subtotal_sale, 2),
            tax_amount=round(tax_sale, 2),
            retention_amount=round(retention_sale, 2),
            total=round(total_sale, 2),
            items_data=items_for_db,
            session=session
        )
        await session.commit()
        await ProductRepository.invalidate_cache(tenant_id, cache)

        return SaleRead.model_validate(sale)

    @staticmethod
    async def get_sale(sale_id: str, tenant_id: str, session: AsyncSession) -> SaleRead:
        sale = await SaleRepository.get_by_id(sale_id, tenant_id, session)
        if not sale:
            raise HTTPException(status_code=404, detail="Venta no encontrada")
        return SaleRead.model_validate(sale)

    @staticmethod
    async def list_sales(tenant_id: str, session: AsyncSession) -> list[SaleRead]:
        sales = await SaleRepository.list_by_tenant(tenant_id, session)
        return [SaleRead.model_validate(s) for s in sales]
