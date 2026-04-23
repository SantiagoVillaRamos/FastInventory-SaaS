import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator
import re
from app.modules.tenants.models import PlanEnum


class TenantCreate(BaseModel):
    business_name: str = Field(..., min_length=2, max_length=150)
    slug: str = Field(..., min_length=2, max_length=100)
    plan: PlanEnum = PlanEnum.FREE
    admin_email: EmailStr
    admin_name: str = Field(..., min_length=2, max_length=100)
    admin_password: str = Field(..., min_length=8)

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, v: str) -> str:
        if not re.match(r"^[a-z0-9-]+$", v):
            raise ValueError("El slug solo puede contener letras minúsculas, números y guiones.")
        return v


class TenantRead(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    plan: PlanEnum
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TenantUpdate(BaseModel):
    name: str | None = None
    is_active: bool | None = None
