import json
from uuid import UUID
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis
from typing import List

from app.modules.products.models import Product
from app.modules.products.schemas import ProductRead

class ProductRepository:
    
    @staticmethod
    def _cache_key(tenant_id: str, search: str | None, category_id: str | None) -> str:
        s = search or "all"
        c = category_id or "all"
        return f"tenant:{tenant_id}:products:s:{s}:c:{c}"

    @staticmethod
    async def create(tenant_id: str, data: dict, session: AsyncSession) -> Product:
        product = Product(tenant_id=UUID(tenant_id), **data)
        session.add(product)
        await session.flush()
        return product

    @staticmethod
    async def get_by_id(product_id: str, tenant_id: str, session: AsyncSession) -> Product | None:
        stmt = select(Product).where(
            Product.id == UUID(product_id),
            Product.tenant_id == UUID(tenant_id)
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def list_cached(tenant_id: str, session: AsyncSession, cache: aioredis.Redis, search: str | None = None, category_id: str | None = None) -> List[ProductRead]:
        key = ProductRepository._cache_key(tenant_id, search, category_id)
        
        try:
            cached_data = await cache.get(key)
            if cached_data:
                return [ProductRead(**p) for p in json.loads(cached_data)]
        except aioredis.RedisError:
            pass
        
        stmt = select(Product).where(Product.tenant_id == UUID(tenant_id))
        
        if category_id:
            stmt = stmt.where(Product.category_id == UUID(category_id))
            
        if search:
            stmt = stmt.where(Product.name.ilike(f"%{search}%"))
            
        stmt = stmt.order_by(Product.name)
        result = await session.execute(stmt)
        products = result.scalars().all()
        
        products_read = [ProductRead.model_validate(p) for p in products]
        
        try:
            data_to_cache = [p.model_dump(mode="json") for p in products_read]
            await cache.set(key, json.dumps(data_to_cache), ex=60)
        except aioredis.RedisError:
            pass
            
        return products_read

    @staticmethod
    async def update(product_id: str, tenant_id: str, update_data: dict, session: AsyncSession) -> Product | None:
        product = await ProductRepository.get_by_id(product_id, tenant_id, session)
        if product:
            for k, v in update_data.items():
                setattr(product, k, v)
            await session.flush()
        return product

    @staticmethod
    async def delete(product_id: str, tenant_id: str, session: AsyncSession) -> bool:
        product = await ProductRepository.get_by_id(product_id, tenant_id, session)
        if product:
            await session.delete(product)
            await session.flush()
            return True
        return False
        
    @staticmethod
    async def count_by_tenant(tenant_id: str, session: AsyncSession) -> int:
        stmt = select(func.count(Product.id)).where(Product.tenant_id == UUID(tenant_id))
        result = await session.execute(stmt)
        return result.scalar_one()

    @staticmethod
    async def decrement_stock(product_id: str, tenant_id: str, quantity: int, session: AsyncSession) -> bool:
        """QAS-01: Decremento atómico en PostgreSQL para ventas seguras"""
        product = await ProductRepository.get_by_id(product_id, tenant_id, session)
        if product and product.stock >= quantity:
            product.stock -= quantity
            await session.flush()
            return True
        return False

    @staticmethod
    async def invalidate_cache(tenant_id: str, cache: aioredis.Redis) -> None:
        """Invalida TODA la caché de productos de un tenant (incluyendo búsquedas), eliminando la sub-jerarquía en Redis."""
        try:
            cursor = 0
            match_pattern = f"tenant:{tenant_id}:products:*"
            keys_to_delete = []
            
            while True:
                cursor, keys = await cache.scan(cursor=cursor, match=match_pattern, count=100)
                if keys:
                    keys_to_delete.extend(keys)
                if cursor == 0:
                    break
                    
            if keys_to_delete:
                await cache.delete(*keys_to_delete)
        except aioredis.RedisError:
            pass
