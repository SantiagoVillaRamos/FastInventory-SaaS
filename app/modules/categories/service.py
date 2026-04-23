from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis
from typing import List

from app.modules.categories.schemas import CategoryCreate, CategoryRead, CategoryUpdate
from app.modules.categories.repository import CategoryRepository

class CategoryService:
    @staticmethod
    async def create_category(tenant_id: str, data: CategoryCreate, session: AsyncSession, cache: aioredis.Redis) -> CategoryRead:
        category = await CategoryRepository.create(tenant_id, data.model_dump(), session)
        await session.commit()
        await CategoryRepository.invalidate_cache(tenant_id, cache)
        return CategoryRead.model_validate(category)

    @staticmethod
    async def list_categories(tenant_id: str, session: AsyncSession, cache: aioredis.Redis) -> List[CategoryRead]:
        return await CategoryRepository.list_cached(tenant_id, session, cache)

    @staticmethod
    async def update_category(category_id: str, tenant_id: str, data: CategoryUpdate, session: AsyncSession, cache: aioredis.Redis) -> CategoryRead:
        category = await CategoryRepository.update(category_id, tenant_id, data.model_dump(exclude_unset=True), session)
        if not category:
            raise HTTPException(status_code=404, detail="Categoría no encontrada")
        await session.commit()
        await CategoryRepository.invalidate_cache(tenant_id, cache)
        return CategoryRead.model_validate(category)

    @staticmethod
    async def delete_category(category_id: str, tenant_id: str, session: AsyncSession, cache: aioredis.Redis) -> None:
        # TODO (FASE 5): Validar `has_products` antes de borrar. Por RF las categorías con productos no se borran.
        
        deleted = await CategoryRepository.delete(category_id, tenant_id, session)
        if not deleted:
            raise HTTPException(status_code=404, detail="Categoría no encontrada")
            
        await session.commit()
        await CategoryRepository.invalidate_cache(tenant_id, cache)
