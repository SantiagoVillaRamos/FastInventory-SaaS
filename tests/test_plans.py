"""Tests del módulo de reportes y restricciones de plan."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestReports:
    """Reportes con restricciones según plan de suscripción."""

    async def test_daily_report_available_for_free_plan(
        self, client: AsyncClient, tenant_a: dict
    ):
        """El reporte diario debe estar disponible para TODOS los planes (incluso Free)."""
        resp = await client.get("/reports/daily", headers=tenant_a["headers"])
        assert resp.status_code == 200
        data = resp.json()
        assert "total_sales" in data
        assert "total_revenue" in data

    async def test_biweekly_report_forbidden_for_free_plan(
        self, client: AsyncClient, tenant_a: dict
    ):
        """El reporte quincenal NO está disponible para el plan Free (403)."""
        resp = await client.get("/reports/biweekly", headers=tenant_a["headers"])
        # Free plan → 403 Forbidden
        assert resp.status_code == 403

    async def test_monthly_report_forbidden_for_free_plan(
        self, client: AsyncClient, tenant_a: dict
    ):
        """El reporte mensual NO está disponible para el plan Free (403)."""
        resp = await client.get("/reports/monthly", headers=tenant_a["headers"])
        assert resp.status_code == 403

    async def test_pdf_report_forbidden_for_free_plan(
        self, client: AsyncClient, tenant_a: dict
    ):
        """La exportación a PDF NO está disponible para el plan Free (403)."""
        resp = await client.get("/reports/daily/pdf", headers=tenant_a["headers"])
        assert resp.status_code == 403


@pytest.mark.asyncio
class TestPlanLimits:
    """Restricciones de plan: límites de usuarios y productos."""

    async def test_free_plan_user_limit(self, client: AsyncClient, tenant_a: dict):
        """El plan Free permite un máximo de 2 usuarios. El admin ya cuenta como 1."""
        # Crear primer usuario adicional (usuario #2) → OK
        resp1 = await client.post(
            "/users/",
            json={
                "email": "empleado1-limit@alpha.com",
                "name": "Empleado Uno",
                "role": "employee",
                "password": "Password123!",
            },
            headers=tenant_a["headers"],
        )
        assert resp1.status_code == 201

        # Crear segundo usuario adicional (usuario #3) → debería fallar
        resp2 = await client.post(
            "/users/",
            json={
                "email": "empleado2-limit@alpha.com",
                "name": "Empleado Dos",
                "role": "employee",
                "password": "Password456!",
            },
            headers=tenant_a["headers"],
        )
        assert resp2.status_code == 403, f"Se esperaba 403 por límite de plan, recibido {resp2.status_code}"
