import uuid
from datetime import datetime

from pydantic import BaseModel, Field


# ── Variantes (F-33) ─────────────────────────────────────────────────────────

class VariantCreate(BaseModel):
    name: str = Field(..., max_length=100, description="Ej: 'Rojo - Talla M'")
    sku: str | None = Field(None, max_length=50)
    price: float = Field(..., gt=0)
    stock: int = Field(0, ge=0)


class VariantUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    sku: str | None = Field(None, max_length=50)
    price: float | None = Field(None, gt=0)
    stock: int | None = Field(None, ge=0)


class VariantRead(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    name: str
    sku: str | None
    price: float
    stock: int

    model_config = {"from_attributes": True}


# ── Productos ─────────────────────────────────────────────────────────────────

class ProductCreate(BaseModel):
    category_id: uuid.UUID
    name: str = Field(..., min_length=2, max_length=150)
    price: float = Field(..., gt=0)
    stock: int = Field(0, ge=0)
    unit: str = Field("unidad", max_length=20)
    has_variants: bool = False
    # F-33: Lista opcional de variantes al crear el producto
    variants: list[VariantCreate] | None = None


class ProductUpdate(BaseModel):
    category_id: uuid.UUID | None = None
    name: str | None = Field(None, min_length=2, max_length=150)
    price: float | None = Field(None, gt=0)
    stock: int | None = Field(None, ge=0)
    unit: str | None = Field(None, max_length=20)
    has_variants: bool | None = None


class ProductRead(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    category_id: uuid.UUID
    name: str
    price: float
    stock: int
    unit: str
    has_variants: bool
    created_at: datetime
    # F-33: Lista de variantes anidadas (vacía si el producto no tiene variantes)
    variants: list[VariantRead] = []

    model_config = {"from_attributes": True}
