import uuid
from datetime import datetime

from pydantic import BaseModel, Field


# ── Create ───────────────────────────────────────────────────────────────────

class PurchaseItemCreate(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(..., gt=0, description="Unidades a ingresar al stock (>0)")
    unit_cost: float = Field(..., gt=0, description="Costo unitario de compra (>0)")


class PurchaseOrderCreate(BaseModel):
    supplier_name: str | None = Field(None, max_length=200)
    notes: str | None = None
    items: list[PurchaseItemCreate] = Field(..., min_length=1)


# ── Read ─────────────────────────────────────────────────────────────────────

class PurchaseItemRead(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    quantity: int
    unit_cost: float

    model_config = {"from_attributes": True}


class PurchaseItemDetailRead(PurchaseItemRead):
    """Ítem con nombre del producto para el endpoint de detalle."""
    product_name: str


class PurchaseOrderRead(BaseModel):
    """Respuesta completa al crear una orden de compra."""
    id: uuid.UUID
    tenant_id: uuid.UUID
    created_by: uuid.UUID
    supplier_name: str | None
    notes: str | None
    total_cost: float
    created_at: datetime
    items: list[PurchaseItemRead]

    model_config = {"from_attributes": True}


class PurchaseOrderListRead(BaseModel):
    """Respuesta resumida para el listado de órdenes."""
    id: uuid.UUID
    supplier_name: str | None
    total_cost: float
    items_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PurchaseOrderDetailRead(BaseModel):
    """Respuesta detallada con nombre de productos."""
    id: uuid.UUID
    tenant_id: uuid.UUID
    created_by: uuid.UUID
    supplier_name: str | None
    notes: str | None
    total_cost: float
    created_at: datetime
    items: list[PurchaseItemDetailRead]

    model_config = {"from_attributes": True}
