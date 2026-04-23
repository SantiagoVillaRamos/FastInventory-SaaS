import uuid
from datetime import datetime
from pydantic import BaseModel, Field

class ProductCreate(BaseModel):
    category_id: uuid.UUID
    name: str = Field(..., min_length=2, max_length=150)
    price: float = Field(..., gt=0)
    stock: int = Field(0, ge=0)
    unit: str = Field("unidad", max_length=20)

class ProductUpdate(BaseModel):
    category_id: uuid.UUID | None = None
    name: str | None = Field(None, min_length=2, max_length=150)
    price: float | None = Field(None, gt=0)
    stock: int | None = Field(None, ge=0)
    unit: str | None = Field(None, max_length=20)

class ProductRead(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    category_id: uuid.UUID
    name: str
    price: float
    stock: int
    unit: str
    created_at: datetime

    model_config = {"from_attributes": True}
