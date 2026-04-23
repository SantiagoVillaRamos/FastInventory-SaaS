import uuid
from datetime import datetime
from pydantic import BaseModel, Field

class SaleItemInput(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(..., gt=0)

class SaleCreate(BaseModel):
    items: list[SaleItemInput] = Field(..., min_length=1)

class SaleItemRead(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    quantity: int
    unit_price: float

    model_config = {"from_attributes": True}

class SaleRead(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    seller_id: uuid.UUID | None
    total: float
    created_at: datetime
    items: list[SaleItemRead] = []

    model_config = {"from_attributes": True}
