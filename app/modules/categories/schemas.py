import uuid
from datetime import datetime
from pydantic import BaseModel, Field

class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: str | None = Field(default=None, max_length=500)

class CategoryUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=100)
    description: str | None = Field(None, max_length=500)

class CategoryRead(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    description: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
