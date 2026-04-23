from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_current_tenant
from app.modules.reports.schemas import ReportRead
from app.modules.reports.service import ReportService

router = APIRouter(dependencies=[Depends(get_current_tenant)])


@router.get("/daily", response_model=ReportRead, tags=["Reports"])
async def daily_report(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_tenant)
):
    """Reporte del día actual. Disponible en todos los planes."""
    return await ReportService.get_daily_report(current_user["id"], db)


@router.get("/biweekly", response_model=ReportRead, tags=["Reports"])
async def biweekly_report(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_tenant)
):
    """Reporte de los últimos 15 días. Requiere plan Basic o Pro."""
    return await ReportService.get_biweekly_report(current_user["id"], db)


@router.get("/monthly", response_model=ReportRead, tags=["Reports"])
async def monthly_report(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_tenant)
):
    """Reporte de los últimos 30 días. Requiere plan Basic o Pro."""
    return await ReportService.get_monthly_report(current_user["id"], db)


@router.get("/daily/pdf", tags=["Reports"])
async def daily_pdf(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_tenant)
):
    """
    Genera y descarga el PDF del reporte diario. 
    Solo plan Pro. El PDF se genera en memoria (CA-06), sin escribir en disco.
    """
    pdf_bytes = await ReportService.generate_daily_pdf(current_user["id"], db)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=reporte-diario.pdf"}
    )
