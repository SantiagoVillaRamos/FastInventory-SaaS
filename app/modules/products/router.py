from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis
from typing import List

from app.core.dependencies import get_db, get_cache, get_current_tenant
from app.modules.products.schemas import ProductCreate, ProductRead, ProductUpdate
from app.modules.products.service import ProductService

# Cualquier usuario autenticado (empleado o admin) asociado al tenant puede acceder a productos.
router = APIRouter(dependencies=[Depends(get_current_tenant)])

@router.get("/", response_model=List[ProductRead], tags=["Products"])
async def list_products(
    search: str | None = Query(None, description="Búsqueda por nombre ILIKE"),
    category_id: str | None = Query(None, description="Filtrar por categoría"),
    db: AsyncSession = Depends(get_db),
    cache: aioredis.Redis = Depends(get_cache),
    current_user: dict = Depends(get_current_tenant)
):
    """Busca y lista productos del inventario, con memoria caché (TTL 60s). (QAS-05)"""
    return await ProductService.list_products(current_user["id"], db, cache, search, category_id)


@router.post("/", response_model=ProductRead, status_code=status.HTTP_201_CREATED, tags=["Products"])
async def create_product(
    data: ProductCreate, 
    db: AsyncSession = Depends(get_db),
    cache: aioredis.Redis = Depends(get_cache),
    current_user: dict = Depends(get_current_tenant)
):
    """Agrega un nuevo producto comprobando la existencia de la categoría y los límites (QAS-01 / Plan Free = max 50)."""
    return await ProductService.create_product(current_user["id"], data, db, cache)


@router.patch("/{product_id}", response_model=ProductRead, tags=["Products"])
async def update_product(
    product_id: str,
    data: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    cache: aioredis.Redis = Depends(get_cache),
    current_user: dict = Depends(get_current_tenant)
):
    return await ProductService.update_product(product_id, current_user["id"], data, db, cache)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Products"])
async def delete_product(
    product_id: str,
    db: AsyncSession = Depends(get_db),
    cache: aioredis.Redis = Depends(get_cache),
    current_user: dict = Depends(get_current_tenant)
):
    await ProductService.delete_product(product_id, current_user["id"], db, cache)
