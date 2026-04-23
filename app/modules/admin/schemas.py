import uuid
from datetime import datetime
from pydantic import BaseModel
from app.modules.tenants.models import PlanEnum


class TenantAdminRead(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    plan: PlanEnum
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class PlanChangeRequest(BaseModel):
    new_plan: PlanEnum

class MetricsRead(BaseModel):
    active_tenants: int
    suspended_tenants: int
    total_tenants: int
    daily_sales_volume: float  # Suma de total de ventas HOY en toda la plataforma
