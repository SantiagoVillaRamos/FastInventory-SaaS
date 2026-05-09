import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.modules.tenants.models import PlanEnum


class PlanAuditLog(Base):
    """Registro histórico de cambios de plan. No se puede filtrar por tenant (es del super-admin)."""
    __tablename__ = "plan_audit_log"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    old_plan: Mapped[PlanEnum] = mapped_column(Enum(PlanEnum), nullable=False)
    new_plan: Mapped[PlanEnum] = mapped_column(Enum(PlanEnum), nullable=False)
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
