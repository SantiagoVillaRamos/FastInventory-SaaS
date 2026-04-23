from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis
from typing import List

from app.modules.products.schemas import ProductCreate, ProductRead, ProductUpdate
from app.modules.products.repository import ProductRepository
from app.modules.categories.repository import CategoryRepository
from app.modules.tenants.repository import TenantRepository
from app.modules.tenants.models import PlanEnum

class ProductService:
    PLAN_LIMITS = {
        PlanEnum.FREE: 50,
        PlanEnum.BASIC: 500,
        PlanEnum.PRO: float("inf")
    }

    @staticmethod
    async def create_product(tenant_id: str, data: ProductCreate, session: AsyncSession, cache: aioredis.Redis) -> ProductRead:
        tenant = await TenantRepository.get_by_id(tenant_id, session)
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant no encontrado")
            
        current_count = await ProductRepository.count_by_tenant(tenant_id, session)
        max_products = ProductService.PLAN_LIMITS.get(tenant.plan, 0)
        
        if current_count >= max_products:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail=f"Límite de inventario alcanzado. El plan {tenant.plan.value} permite máximo {max_products} productos."
            )
            
        # Verificar que la categoría sí exista y pertenezca al usuario    
        category = await CategoryRepository.get_by_id(str(data.category_id), tenant_id, session)
        if not category:
            raise HTTPException(status_code=400, detail="La categoría enviada no existe o no te pertenece")

        product = await ProductRepository.create(tenant_id, data.model_dump(), session)
        await session.commit()
        await ProductRepository.invalidate_cache(tenant_id, cache)
        return ProductRead.model_validate(product)

    @staticmethod
    async def list_products(tenant_id: str, session: AsyncSession, cache: aioredis.Redis, search: str | None = None, category_id: str | None = None) -> List[ProductRead]:
        return await ProductRepository.list_cached(tenant_id, session, cache, search, category_id)

    @staticmethod
    async def update_product(product_id: str, tenant_id: str, data: ProductUpdate, session: AsyncSession, cache: aioredis.Redis) -> ProductRead:
        # Pre-validar si se envía category_id
        if data.category_id:
            category = await CategoryRepository.get_by_id(str(data.category_id), tenant_id, session)
            if not category:
                raise HTTPException(status_code=400, detail="La categoría destino no existe o no te pertenece")
                
        product = await ProductRepository.update(product_id, tenant_id, data.model_dump(exclude_unset=True), session)
        if not product:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        await session.commit()
        await ProductRepository.invalidate_cache(tenant_id, cache)
        return ProductRead.model_validate(product)

    @staticmethod
    async def delete_product(product_id: str, tenant_id: str, session: AsyncSession, cache: aioredis.Redis) -> None:
        deleted = await ProductRepository.delete(product_id, tenant_id, session)
        if not deleted:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        await session.commit()
        await ProductRepository.invalidate_cache(tenant_id, cache)
