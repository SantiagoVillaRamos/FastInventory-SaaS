from datetime import datetime, timedelta, timezone
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.sales.models import Sale, SaleItem
from app.modules.products.models import Product
from app.modules.tenants.repository import TenantRepository
from app.modules.tenants.models import PlanEnum
from app.modules.reports.schemas import ReportRead, ReportItemRead


class ReportService:

    @staticmethod
    async def _build_report(tenant_id: str, since: datetime, until: datetime, session: AsyncSession) -> ReportRead:
        """Compila las ventas en el rango [since, until) para el tenant."""
        tenant = await TenantRepository.get_by_id(tenant_id, session)
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant no encontrado")

        # Agregar ventas del período
        stmt_sales = select(func.count(Sale.id), func.coalesce(func.sum(Sale.total), 0)).where(
            Sale.tenant_id == UUID(tenant_id),
            Sale.created_at >= since,
            Sale.created_at < until,
        )
        result_sales = await session.execute(stmt_sales)
        total_sales, total_revenue = result_sales.one()

        # Detalle de ítem: cantidad y facturación por producto
        stmt_items = (
            select(
                SaleItem.product_id,
                Product.name,
                func.sum(SaleItem.quantity).label("total_qty"),
                func.sum(SaleItem.quantity * SaleItem.unit_price).label("total_rev"),
            )
            .join(Product, Product.id == SaleItem.product_id)
            .join(Sale, and_(Sale.id == SaleItem.sale_id, Sale.tenant_id == UUID(tenant_id)))
            .where(
                SaleItem.tenant_id == UUID(tenant_id),
                Sale.created_at >= since,
                Sale.created_at < until,
            )
            .group_by(SaleItem.product_id, Product.name)
            .order_by(func.sum(SaleItem.quantity * SaleItem.unit_price).desc())
        )
        result_items = await session.execute(stmt_items)
        items = [
            ReportItemRead(
                product_id=row.product_id,
                product_name=row.name,
                total_quantity=row.total_qty,
                total_revenue=float(row.total_rev),
            )
            for row in result_items
        ]

        return ReportRead(
            tenant_id=tenant.id,
            tenant_name=tenant.name,
            period_start=since,
            period_end=until,
            total_sales=total_sales,
            total_revenue=float(total_revenue),
            items=items,
        )

    @staticmethod
    async def get_daily_report(tenant_id: str, session: AsyncSession) -> ReportRead:
        """Reporte del día de hoy. Disponible para todos los planes."""
        now = datetime.now(timezone.utc)
        since = now.replace(hour=0, minute=0, second=0, microsecond=0)
        until = since + timedelta(days=1)
        return await ReportService._build_report(tenant_id, since, until, session)

    @staticmethod
    async def get_biweekly_report(tenant_id: str, session: AsyncSession) -> ReportRead:
        """Últimos 15 días. Solo plan Basic y Pro."""
        await ReportService._require_plan(tenant_id, [PlanEnum.BASIC, PlanEnum.PRO], session)
        now = datetime.now(timezone.utc)
        since = now - timedelta(days=15)
        until = now
        return await ReportService._build_report(tenant_id, since, until, session)

    @staticmethod
    async def get_monthly_report(tenant_id: str, session: AsyncSession) -> ReportRead:
        """Últimos 30 días. Solo plan Basic y Pro."""
        await ReportService._require_plan(tenant_id, [PlanEnum.BASIC, PlanEnum.PRO], session)
        now = datetime.now(timezone.utc)
        since = now - timedelta(days=30)
        until = now
        return await ReportService._build_report(tenant_id, since, until, session)

    @staticmethod
    async def generate_daily_pdf(tenant_id: str, session: AsyncSession) -> bytes:
        """
        Genera un PDF del reporte diario en MEMORIA (no escribe en disco — CA-06).
        El nombre del negocio viene de tenant.name (ADR-05). Solo plan Pro.
        """
        await ReportService._require_plan(tenant_id, [PlanEnum.PRO], session)
        report = await ReportService.get_daily_report(tenant_id, session)
        return ReportService._render_pdf(report)

    @staticmethod
    async def _require_plan(tenant_id: str, allowed_plans: list[PlanEnum], session: AsyncSession) -> None:
        tenant = await TenantRepository.get_by_id(tenant_id, session)
        if not tenant or tenant.plan not in allowed_plans:
            allowed_names = ", ".join(p.value for p in allowed_plans)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Esta función requiere plan: {allowed_names}. Tu plan actual: {tenant.plan.value if tenant else 'desconocido'}"
            )

    @staticmethod
    def _render_pdf(report: ReportRead) -> bytes:
        """Genera el PDF con FPDF2 y retorna bytes. No usa disco."""
        from fpdf import FPDF

        pdf = FPDF()
        pdf.add_page()
        pdf.set_auto_page_break(auto=True, margin=15)

        # ── Header ─────────────────────────────────────────────────────────
        pdf.set_font("Helvetica", "B", 18)
        pdf.set_fill_color(30, 80, 160)
        pdf.set_text_color(255, 255, 255)
        pdf.cell(0, 12, f"FastInventory — {report.tenant_name}", new_x="LMARGIN", new_y="NEXT", align="C", fill=True)

        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(80, 80, 80)
        pdf.cell(0, 6, f"Reporte Diario: {report.period_start.strftime('%d/%m/%Y')}", new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.ln(4)

        # ── Resumen ─────────────────────────────────────────────────────────
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_text_color(0, 0, 0)
        pdf.cell(0, 8, "Resumen del Día", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(95, 7, f"Total de Ventas realizadas: {report.total_sales}", border=1)
        pdf.cell(95, 7, f"Ingresos del período: ${report.total_revenue:,.2f}", border=1, new_x="LMARGIN", new_y="NEXT")
        pdf.ln(6)

        # ── Tabla de detalle ────────────────────────────────────────────────
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(0, 8, "Detalle por Producto", new_x="LMARGIN", new_y="NEXT")

        # Encabezados de tabla
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_fill_color(220, 230, 245)
        pdf.cell(80, 7, "Producto", border=1, fill=True)
        pdf.cell(40, 7, "Unidades Vendidas", border=1, fill=True, align="C")
        pdf.cell(70, 7, "Ingreso Total", border=1, fill=True, align="R", new_x="LMARGIN", new_y="NEXT")

        pdf.set_font("Helvetica", "", 10)
        for item in report.items:
            pdf.cell(80, 6, item.product_name[:42], border=1)
            pdf.cell(40, 6, str(item.total_quantity), border=1, align="C")
            pdf.cell(70, 6, f"${item.total_revenue:,.2f}", border=1, align="R", new_x="LMARGIN", new_y="NEXT")

        if not report.items:
            pdf.set_text_color(120, 120, 120)
            pdf.cell(0, 8, "No se realizaron ventas en este período.", align="C", new_x="LMARGIN", new_y="NEXT")

        # CA-06: output("S") retorna bytes, NO escribe en disco
        return bytes(pdf.output())
