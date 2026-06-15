"""Tests del flujo de inventario: Categorías → Productos → Ventas.

Verifica el flujo completo de operación de un tenant, incluyendo
la atomicidad transaccional de las ventas (QAS-01).
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestCategories:
    """CRUD de categorías."""

    async def test_create_category(self, client: AsyncClient, tenant_a: dict):
        resp = await client.post(
            "/categories/",
            json={"name": "Electricidad", "description": "Material eléctrico"},
            headers=tenant_a["headers"],
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Electricidad"
        assert data["tenant_id"] == tenant_a["tenant"]["id"]

    async def test_list_categories(self, client: AsyncClient, tenant_a: dict):
        # Crear una para asegurar que hay al menos una
        await client.post(
            "/categories/",
            json={"name": "Plomería"},
            headers=tenant_a["headers"],
        )
        resp = await client.get("/categories/", headers=tenant_a["headers"])
        assert resp.status_code == 200
        assert len(resp.json()) >= 1


@pytest.mark.asyncio
class TestProducts:
    """CRUD de productos."""

    async def test_create_product(self, client: AsyncClient, tenant_a: dict):
        # Primero crear categoría
        cat_resp = await client.post(
            "/categories/",
            json={"name": "Tornillería"},
            headers=tenant_a["headers"],
        )
        cat_id = cat_resp.json()["id"]

        resp = await client.post(
            "/products/",
            json={
                "name": "Tornillo 1/4",
                "price": 0.50,
                "stock": 1000,
                "category_id": cat_id,
            },
            headers=tenant_a["headers"],
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Tornillo 1/4"
        assert data["stock"] == 1000
        assert data["tenant_id"] == tenant_a["tenant"]["id"]

    async def test_list_products(self, client: AsyncClient, tenant_a: dict):
        resp = await client.get("/products/", headers=tenant_a["headers"])
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)


@pytest.mark.asyncio
class TestSales:
    """QAS-01: Transacciones atómicas de ventas."""

    async def _create_product_for_sale(self, client: AsyncClient, headers: dict, stock: int = 50) -> str:
        """Helper: crea categoría + producto y retorna el product_id."""
        cat_resp = await client.post(
            "/categories/",
            json={"name": "Cat Venta Test"},
            headers=headers,
        )
        cat_id = cat_resp.json()["id"]

        prod_resp = await client.post(
            "/products/",
            json={
                "name": "Producto Para Venta",
                "price": 10.0,
                "stock": stock,
                "category_id": cat_id,
            },
            headers=headers,
        )
        return prod_resp.json()["id"]

    async def test_sale_success_decrements_stock(self, client: AsyncClient, tenant_a: dict):
        """Una venta exitosa descuenta el stock del producto."""
        product_id = await self._create_product_for_sale(client, tenant_a["headers"], stock=50)

        resp = await client.post(
            "/sales/",
            json={"items": [{"product_id": product_id, "quantity": 3}]},
            headers=tenant_a["headers"],
        )
        assert resp.status_code == 201
        sale = resp.json()
        assert sale["subtotal"] == 30.0
        assert sale["tax_amount"] == 5.7
        assert sale["retention_amount"] == 0.0
        assert sale["total"] == 35.7
        assert len(sale["items"]) == 1

    async def test_sale_insufficient_stock_fails(self, client: AsyncClient, tenant_a: dict):
        """Intentar vender más stock del disponible falla con 400."""
        product_id = await self._create_product_for_sale(client, tenant_a["headers"], stock=5)

        resp = await client.post(
            "/sales/",
            json={"items": [{"product_id": product_id, "quantity": 999}]},
            headers=tenant_a["headers"],
        )
        assert resp.status_code == 400
        assert "stock" in resp.json()["detail"].lower()

    async def test_sale_nonexistent_product_fails(self, client: AsyncClient, tenant_a: dict):
        """Venta con un producto inexistente devuelve 422."""
        resp = await client.post(
            "/sales/",
            json={"items": [{"product_id": "00000000-0000-0000-0000-000000000000", "quantity": 1}]},
            headers=tenant_a["headers"],
        )
        assert resp.status_code == 422

    async def test_sale_empty_items_rejected(self, client: AsyncClient, tenant_a: dict):
        """Una venta sin ítems es rechazada por validación Pydantic."""
        resp = await client.post(
            "/sales/",
            json={"items": []},
            headers=tenant_a["headers"],
        )
        assert resp.status_code == 422

    async def test_list_sales(self, client: AsyncClient, tenant_a: dict):
        """Listar ventas de un tenant."""
        resp = await client.get("/sales/", headers=tenant_a["headers"])
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)


@pytest.mark.asyncio
class TestTaxEngine:
    """F-34: Motor de impuestos, exenciones e IVA y retenciones en Tenant."""

    async def test_tax_exempt_product_excludes_vat(self, client: AsyncClient, tenant_a: dict):
        """Un producto marcado como exento no debe sumar IVA al total."""
        # 1. Crear categoría
        cat_resp = await client.post(
            "/categories/",
            json={"name": "Alimentos"},
            headers=tenant_a["headers"],
        )
        cat_id = cat_resp.json()["id"]

        # 2. Crear producto exento de impuestos
        prod_resp = await client.post(
            "/products/",
            json={
                "name": "Pan Integral",
                "price": 5.0,
                "stock": 100,
                "category_id": cat_id,
                "is_tax_exempt": True,
            },
            headers=tenant_a["headers"],
        )
        prod_id = prod_resp.json()["id"]

        # 3. Realizar venta del producto exento
        resp = await client.post(
            "/sales/",
            json={"items": [{"product_id": prod_id, "quantity": 2}]},
            headers=tenant_a["headers"],
        )
        assert resp.status_code == 201
        sale = resp.json()
        assert sale["subtotal"] == 10.0
        assert sale["tax_amount"] == 0.0  # Sin IVA
        assert sale["retention_amount"] == 0.0
        assert sale["total"] == 10.0

    async def test_tenant_tax_configuration_update(self, client: AsyncClient, tenant_a: dict):
        """Actualizar tasas del tenant y verificar los cálculos de venta."""
        # 1. Cambiar IVA a 10% y Retención a 4%
        patch_resp = await client.patch(
            "/tenants/me",
            json={"default_vat_rate": 0.10, "default_retention_rate": 0.04},
            headers=tenant_a["headers"],
        )
        assert patch_resp.status_code == 200
        tenant_data = patch_resp.json()
        assert tenant_data["default_vat_rate"] == 0.10
        assert tenant_data["default_retention_rate"] == 0.04

        # 2. Crear producto normal (no exento)
        cat_resp = await client.post(
            "/categories/",
            json={"name": "Ferretería Config"},
            headers=tenant_a["headers"],
        )
        cat_id = cat_resp.json()["id"]

        prod_resp = await client.post(
            "/products/",
            json={
                "name": "Tubo PVC",
                "price": 100.0,
                "stock": 10,
                "category_id": cat_id,
                "is_tax_exempt": False,
            },
            headers=tenant_a["headers"],
        )
        prod_id = prod_resp.json()["id"]

        # 3. Realizar venta
        # Subtotal: 100.0
        # IVA (10%): +10.0
        # Retención (4%): -4.0
        # Total: 100.0 + 10.0 - 4.0 = 106.0
        resp = await client.post(
            "/sales/",
            json={"items": [{"product_id": prod_id, "quantity": 1}]},
            headers=tenant_a["headers"],
        )
        assert resp.status_code == 201
        sale = resp.json()
        assert sale["subtotal"] == 100.0
        assert sale["tax_amount"] == 10.0
        assert sale["retention_amount"] == 4.0
        assert sale["total"] == 106.0
