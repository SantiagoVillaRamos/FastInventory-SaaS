import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class BranchCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    address: str | None = Field(None, max_length=255)


class BranchUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=150)
    address: str | None = Field(None, max_length=255)
    is_active: bool | None = None


class BranchRead(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    address: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class BranchStockRead(BaseModel):
    """Stock de un producto en una sucursal específica."""
    product_id: uuid.UUID
    product_name: str
    stock: int

    model_config = {"from_attributes": True}


class BranchStockUpdate(BaseModel):
    """Ajuste manual de stock en una sucursal."""
    stock: int = Field(..., ge=0)
