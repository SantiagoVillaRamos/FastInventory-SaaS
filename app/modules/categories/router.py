from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis
from typing import List

from app.core.dependencies import get_db, get_cache, get_current_tenant, require_admin
from app.modules.categories.schemas import CategoryCreate, CategoryRead, CategoryUpdate
from app.modules.categories.service import CategoryService

# Empleados pueden VER categorías, Admins pueden CREAR/EDITAR/BORRAR.
router = APIRouter()

@router.get("/", response_model=List[CategoryRead], tags=["Categories"])
async def list_categories(
    db: AsyncSession = Depends(get_db),
    cache: aioredis.Redis = Depends(get_cache),
    current_user: dict = Depends(get_current_tenant)
):
    """(Caché) Retorna todas las categorías del negocio actual."""
    return await CategoryService.list_categories(current_user["id"], db, cache)


@router.post("/", response_model=CategoryRead, status_code=status.HTTP_201_CREATED, tags=["Categories"])
async def create_category(
    data: CategoryCreate, 
    db: AsyncSession = Depends(get_db),
    cache: aioredis.Redis = Depends(get_cache),
    current_user: dict = Depends(require_admin)
):
    """Crea una categoría (Solo Admins)."""
    return await CategoryService.create_category(current_user["tenant_id"], data, db, cache)


@router.patch("/{category_id}", response_model=CategoryRead, tags=["Categories"])
async def update_category(
    category_id: str,
    data: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    cache: aioredis.Redis = Depends(get_cache),
    current_user: dict = Depends(require_admin)
):
    """Actualiza una categoría (Solo Admins)."""
    return await CategoryService.update_category(category_id, current_user["tenant_id"], data, db, cache)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Categories"])
async def delete_category(
    category_id: str,
    db: AsyncSession = Depends(get_db),
    cache: aioredis.Redis = Depends(get_cache),
    current_user: dict = Depends(require_admin)
):
    """Elimina una categoría si no tiene productos (Solo Admins)."""
    await CategoryService.delete_category(category_id, current_user["tenant_id"], db, cache)
