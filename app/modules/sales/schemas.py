import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class SaleItemInput(BaseModel):
    product_id: uuid.UUID
    # F-33: Si el producto tiene variantes, se especifica la variante exacta
    variant_id: uuid.UUID | None = None
    quantity: int = Field(..., gt=0)

class SaleCreate(BaseModel):
    # F-35: Sucursal donde se realiza la venta (opcional, usa stock global si no se provee)
    branch_id: uuid.UUID | None = None
    items: list[SaleItemInput] = Field(..., min_length=1)

class SaleItemRead(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    variant_id: uuid.UUID | None = None
    quantity: int
    unit_price: float

    model_config = {"from_attributes": True}

class SaleRead(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    seller_id: uuid.UUID | None
    branch_id: uuid.UUID | None = None
    subtotal: float
    tax_amount: float
    retention_amount: float
    total: float
    created_at: datetime
    items: list[SaleItemRead] = []

    model_config = {"from_attributes": True}
