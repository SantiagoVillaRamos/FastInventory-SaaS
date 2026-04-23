import uuid
from datetime import datetime
from pydantic import BaseModel


class ReportItemRead(BaseModel):
    product_id: uuid.UUID
    product_name: str
    total_quantity: int
    total_revenue: float


class ReportRead(BaseModel):
    tenant_id: uuid.UUID
    tenant_name: str
    period_start: datetime
    period_end: datetime
    total_sales: int
    total_revenue: float
    items: list[ReportItemRead]
