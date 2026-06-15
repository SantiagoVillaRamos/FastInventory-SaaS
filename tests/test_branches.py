"""Tests del módulo Multi-Sucursal (F-35).

Verifica creación de sucursales, stock por sucursal, aislamiento multi-tenant
y la integración con el flujo de ventas del POS.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestBranches:
    """F-35: CRUD de sucursales."""

    async def test_create_branch_as_admin(self, client: AsyncClient, tenant_a: dict):
        """Un admin puede crear una sucursal y recibe 201."""
        resp = await client.post(
            "/branches/",
            json={"name": "Sucursal Norte", "address": "Calle 10 #20-30"},
            headers=tenant_a["headers"],
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Sucursal Norte"
        assert data["address"] == "Calle 10 #20-30"
        assert data["is_active"] is True
        assert data["tenant_id"] == tenant_a["tenant"]["id"]

    async def test_list_branches_includes_principal(self, client: AsyncClient, tenant_a: dict):
        """Al registrar un tenant se crea automáticamente la sucursal 'Principal'."""
        resp = await client.get("/branches/", headers=tenant_a["headers"])
        assert resp.status_code == 200
        names = [b["name"] for b in resp.json()]
        assert "Principal" in names

    async def test_update_branch(self, client: AsyncClient, tenant_a: dict):
        """Un admin puede actualizar nombre y dirección de una sucursal."""
        # Crear sucursal
        create_resp = await client.post(
            "/branches/",
            json={"name": "Sucursal Vieja", "address": "Carrera 1"},
            headers=tenant_a["headers"],
        )
        assert create_resp.status_code == 201
        branch_id = create_resp.json()["id"]

        # Actualizar
        patch_resp = await client.patch(
            f"/branches/{branch_id}",
            json={"name": "Sucursal Renovada", "address": "Carrera 2 #3-45"},
            headers=tenant_a["headers"],
        )
        assert patch_resp.status_code == 200
        assert patch_resp.json()["name"] == "Sucursal Renovada"

    async def test_branch_isolation_between_tenants(
        self, client: AsyncClient, tenant_a: dict, tenant_b: dict
    ):
        """Tenant B no puede ver las sucursales de Tenant A."""
        # A crea una sucursal
        await client.post(
            "/branches/",
            json={"name": "Sucursal Exclusiva A"},
            headers=tenant_a["headers"],
        )
        # B lista sus sucursales
        resp_b = await client.get("/branches/", headers=tenant_b["headers"])
        assert resp_b.status_code == 200
        names_b = [b["name"] for b in resp_b.json()]
        assert "Sucursal Exclusiva A" not in names_b, "¡BRECHA! Tenant B ve sucursal de Tenant A"


@pytest.mark.asyncio
class TestBranchStock:
    """F-35: Stock por sucursal."""

    async def _setup(self, client: AsyncClient, headers: dict) -> tuple[str, str]:
        """Helper: crea una sucursal y un producto, retorna (branch_id, product_id)."""
        branch_resp = await client.post(
            "/branches/",
            json={"name": "Bodega Test"},
            headers=headers,
        )
        assert branch_resp.status_code == 201
        branch_id = branch_resp.json()["id"]

        cat_resp = await client.post(
            "/categories/",
            json={"name": "Cat Stock Test"},
            headers=headers,
        )
        cat_id = cat_resp.json()["id"]

        prod_resp = await client.post(
            "/products/",
            json={"name": "Producto Stock Test", "price": 15.0, "stock": 100, "category_id": cat_id},
            headers=headers,
        )
        assert prod_resp.status_code == 201
        product_id = prod_resp.json()["id"]
        return branch_id, product_id

    async def test_set_branch_stock(self, client: AsyncClient, tenant_a: dict):
        """Un admin puede ajustar manualmente el stock de un producto en una sucursal."""
        branch_id, product_id = await self._setup(client, tenant_a["headers"])

        resp = await client.patch(
            f"/branches/{branch_id}/stock/{product_id}",
            json={"stock": 25},
            headers=tenant_a["headers"],
        )
        assert resp.status_code == 200
        assert resp.json()["stock"] == 25
        assert resp.json()["product_id"] == product_id

    async def test_get_branch_stock(self, client: AsyncClient, tenant_a: dict):
        """Se puede consultar el stock por sucursal."""
        branch_id, product_id = await self._setup(client, tenant_a["headers"])

        # Asignar stock
        await client.patch(
            f"/branches/{branch_id}/stock/{product_id}",
            json={"stock": 10},
            headers=tenant_a["headers"],
        )

        resp = await client.get(f"/branches/{branch_id}/stock", headers=tenant_a["headers"])
        assert resp.status_code == 200
        items = resp.json()
        assert any(i["product_id"] == product_id and i["stock"] == 10 for i in items)

    async def test_sale_with_branch_decrements_branch_stock(self, client: AsyncClient, tenant_a: dict):
        """Venta con branch_id descuenta el stock de la sucursal, no el stock global."""
        branch_id, product_id = await self._setup(client, tenant_a["headers"])

        # Asignar 10 unidades a la sucursal
        await client.patch(
            f"/branches/{branch_id}/stock/{product_id}",
            json={"stock": 10},
            headers=tenant_a["headers"],
        )

        # Realizar venta de 3 unidades usando la sucursal
        resp = await client.post(
            "/sales/",
            json={"branch_id": branch_id, "items": [{"product_id": product_id, "quantity": 3}]},
            headers=tenant_a["headers"],
        )
        assert resp.status_code == 201
        sale = resp.json()
        assert sale["branch_id"] == branch_id

        # Verificar que el stock de la sucursal bajó a 7
        stock_resp = await client.get(f"/branches/{branch_id}/stock", headers=tenant_a["headers"])
        items = stock_resp.json()
        branch_stock = next((i["stock"] for i in items if i["product_id"] == product_id), None)
        assert branch_stock == 7, f"Se esperaba 7, se obtuvo {branch_stock}"

    async def test_sale_branch_insufficient_stock(self, client: AsyncClient, tenant_a: dict):
        """Stock insuficiente en la sucursal → 400, aunque haya stock global."""
        branch_id, product_id = await self._setup(client, tenant_a["headers"])

        # Asignar SOLO 2 unidades a la sucursal (el global tiene 100)
        await client.patch(
            f"/branches/{branch_id}/stock/{product_id}",
            json={"stock": 2},
            headers=tenant_a["headers"],
        )

        resp = await client.post(
            "/sales/",
            json={"branch_id": branch_id, "items": [{"product_id": product_id, "quantity": 5}]},
            headers=tenant_a["headers"],
        )
        assert resp.status_code == 400
        assert "sucursal" in resp.json()["detail"].lower()

    async def test_sale_without_branch_uses_global_stock(self, client: AsyncClient, tenant_a: dict):
        """Venta sin branch_id usa el stock global del producto."""
        branch_id, product_id = await self._setup(client, tenant_a["headers"])

        # Venta sin branch_id: usa product.stock (100)
        resp = await client.post(
            "/sales/",
            json={"items": [{"product_id": product_id, "quantity": 5}]},
            headers=tenant_a["headers"],
        )
        assert resp.status_code == 201
        assert resp.json()["branch_id"] is None
