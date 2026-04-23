import json
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis
from typing import List

from app.modules.categories.models import Category
from app.modules.categories.schemas import CategoryRead

class CategoryRepository:
    
    @staticmethod
    def _cache_key(tenant_id: str) -> str:
        return f"tenant:{tenant_id}:categories"

    @staticmethod
    async def create(tenant_id: str, data: dict, session: AsyncSession) -> Category:
        category = Category(tenant_id=UUID(tenant_id), **data)
        session.add(category)
        await session.flush()
        return category

    @staticmethod
    async def get_by_id(category_id: str, tenant_id: str, session: AsyncSession) -> Category | None:
        stmt = select(Category).where(
            Category.id == UUID(category_id),
            Category.tenant_id == UUID(tenant_id)
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def list_cached(tenant_id: str, session: AsyncSession, cache: aioredis.Redis) -> List[CategoryRead]:
        """QAS-04 y CA-08: Lista categorías desde Caché. Si falla Redis, va a DB."""
        key = CategoryRepository._cache_key(tenant_id)
        
        # 1. Intentar leer de Redis
        try:
            cached_data = await cache.get(key)
            if cached_data:
                categories_list = json.loads(cached_data)
                return [CategoryRead(**cat) for cat in categories_list]
        except aioredis.RedisError as e:
            # CA-08: Redis no disponible. Ignoramos error y vamos a DB.
            print(f"Advertencia: Redis no disponible para lectura ({e})")
        
        # 2. Si no hay caché o Redis falló, ir a PostgreSQL (Aislamiento QAS-03)
        stmt = select(Category).where(Category.tenant_id == UUID(tenant_id)).order_by(Category.name)
        result = await session.execute(stmt)
        categories = result.scalars().all()
        
        categories_read = [CategoryRead.model_validate(c) for c in categories]
        
        # 3. Intentar guardar en caché (TTL 60s)
        try:
            # Serializamos usando model_dump con soporte json
            data_to_cache = [c.model_dump(mode="json") for c in categories_read]
            await cache.set(key, json.dumps(data_to_cache), ex=60)
        except aioredis.RedisError as e:
            print(f"Advertencia: Redis no disponible para escritura ({e})")
            
        return categories_read

    @staticmethod
    async def update(category_id: str, tenant_id: str, update_data: dict, session: AsyncSession) -> Category | None:
        category = await CategoryRepository.get_by_id(category_id, tenant_id, session)
        if category:
            for k, v in update_data.items():
                setattr(category, k, v)
            await session.flush()
        return category

    @staticmethod
    async def delete(category_id: str, tenant_id: str, session: AsyncSession) -> bool:
        category = await CategoryRepository.get_by_id(category_id, tenant_id, session)
        if category:
            await session.delete(category)
            await session.flush()
            return True
        return False

    @staticmethod
    async def invalidate_cache(tenant_id: str, cache: aioredis.Redis) -> None:
        """Invalida la caché de categorías al escribir (QAS-04)"""
        try:
            await cache.delete(CategoryRepository._cache_key(tenant_id))
        except aioredis.RedisError:
            pass
