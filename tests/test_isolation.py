"""Tests de Aislamiento Multi-Tenant (QAS-03).

CRÍTICO: Verifica que un tenant NUNCA pueda acceder a datos de otro tenant.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestMultiTenantIsolation:
    """QAS-03: Aislamiento estricto de datos entre tenants."""

    async def test_tenant_a_cannot_see_categories_of_tenant_b(
        self, client: AsyncClient, tenant_a: dict, tenant_b: dict
    ):
        """Las categorías creadas por el Tenant A no aparecen para el Tenant B."""
        # Tenant A crea una categoría
        resp_create = await client.post(
            "/categories/",
            json={"name": "Pinturas Exclusivas", "description": "Solo para Alpha"},
            headers=tenant_a["headers"],
        )
        assert resp_create.status_code == 200
        cat_a_id = resp_create.json()["id"]

        # Tenant B lista sus categorías → NO debe ver "Pinturas Exclusivas"
        resp_list = await client.get("/categories/", headers=tenant_b["headers"])
        assert resp_list.status_code == 200
        categories_b = resp_list.json()
        ids_b = [c["id"] for c in categories_b]
        assert cat_a_id not in ids_b, "¡BRECHA DE SEGURIDAD! Tenant B ve datos de Tenant A"

    async def test_tenant_b_cannot_see_products_of_tenant_a(
        self, client: AsyncClient, tenant_a: dict, tenant_b: dict
    ):
        """Los productos del Tenant A son invisibles para el Tenant B."""
        # Tenant A crea categoría + producto
        cat_resp = await client.post(
            "/categories/",
            json={"name": "Herramientas Aislamiento"},
            headers=tenant_a["headers"],
        )
        cat_id = cat_resp.json()["id"]

        prod_resp = await client.post(
            "/products/",
            json={"name": "Martillo Secreto", "price": 25.0, "stock": 10, "category_id": cat_id},
            headers=tenant_a["headers"],
        )
        assert prod_resp.status_code == 200
        prod_a_id = prod_resp.json()["id"]

        # Tenant B lista productos → NO debe ver "Martillo Secreto"
        resp_list = await client.get("/products/", headers=tenant_b["headers"])
        assert resp_list.status_code == 200
        ids_b = [p["id"] for p in resp_list.json()]
        assert prod_a_id not in ids_b, "¡BRECHA DE SEGURIDAD! Tenant B ve productos de Tenant A"

    async def test_tenant_b_cannot_access_sales_of_tenant_a(
        self, client: AsyncClient, tenant_a: dict, tenant_b: dict
    ):
        """Las ventas del Tenant A no aparecen para el Tenant B."""
        resp_sales = await client.get("/sales/", headers=tenant_b["headers"])
        assert resp_sales.status_code == 200
        # Todas las ventas que ve B deben pertenecer al tenant B
        sales_b = resp_sales.json()
        tenant_b_id = tenant_b["tenant"]["id"]
        for sale in sales_b:
            assert sale["tenant_id"] == tenant_b_id, "¡BRECHA! Venta de otro tenant visible"

    async def test_tenant_a_cannot_see_tenant_b_profile(
        self, client: AsyncClient, tenant_a: dict, tenant_b: dict
    ):
        """Un tenant solo puede ver su propio perfil, no el de otro."""
        resp = await client.get("/tenants/me", headers=tenant_a["headers"])
        assert resp.status_code == 200
        my_tenant = resp.json()
        assert my_tenant["id"] != tenant_b["tenant"]["id"], "Tenant A ve el perfil de Tenant B"
