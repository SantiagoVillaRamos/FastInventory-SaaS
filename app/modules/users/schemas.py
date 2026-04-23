import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from app.modules.users.models import RoleEnum


class UserCreate(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=2, max_length=100)
    role: RoleEnum = RoleEnum.EMPLOYEE
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    name: str | None = None
    role: RoleEnum | None = None
    is_active: bool | None = None


class UserRead(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    email: str
    name: str
    role: RoleEnum
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
