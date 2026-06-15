import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestExport:
    """F-36: Exportación Avanzada."""

    async def _setup(self, client: AsyncClient, headers: dict) -> tuple[str, str]:
        """Helper: crea una categoría, un producto y una venta."""
        # 1. Crear categoría
        cat_resp = await client.post(
            "/categories/",
            json={"name": "Cat Export Test"},
            headers=headers,
        )
        assert cat_resp.status_code == 201
        cat_id = cat_resp.json()["id"]

        # 2. Crear producto
        prod_resp = await client.post(
            "/products/",
            json={"name": "Prod Export Test", "price": 50000.0, "stock": 10, "category_id": cat_id},
            headers=headers,
        )
        assert prod_resp.status_code == 201
        product_id = prod_resp.json()["id"]

        # 3. Crear venta
        sale_resp = await client.post(
            "/sales/",
            json={"items": [{"product_id": product_id, "quantity": 2}]},
            headers=headers,
        )
        assert sale_resp.status_code == 201
        return product_id, sale_resp.json()["id"]

    async def test_export_sales_csv(self, client: AsyncClient, tenant_a: dict):
        """Exportar ventas a CSV retorna bytes y content-type correcto."""
        await self._setup(client, tenant_a["headers"])

        resp = await client.get("/reports/export/sales/csv", headers=tenant_a["headers"])
        assert resp.status_code == 200
        assert resp.headers["content-type"].startswith("text/csv")
        assert "attachment; filename=" in resp.headers["content-disposition"]
        csv_content = resp.text
        assert "ID Venta" in csv_content
        assert "Prod Export Test" in csv_content

    async def test_export_sales_xlsx(self, client: AsyncClient, tenant_a: dict):
        """Exportar ventas a Excel retorna bytes XLSX y content-type correcto."""
        await self._setup(client, tenant_a["headers"])

        resp = await client.get("/reports/export/sales/xlsx", headers=tenant_a["headers"])
        assert resp.status_code == 200
        assert "spreadsheetml.sheet" in resp.headers["content-type"]
        assert len(resp.content) > 1000  # un archivo xlsx mínimo tiene cierto tamaño

    async def test_export_products_csv(self, client: AsyncClient, tenant_a: dict):
        """Exportar catálogo a CSV retorna bytes y content-type correcto."""
        await self._setup(client, tenant_a["headers"])

        resp = await client.get("/reports/export/products/csv", headers=tenant_a["headers"])
        assert resp.status_code == 200
        assert resp.headers["content-type"].startswith("text/csv")
        csv_content = resp.text
        assert "ID Producto" in csv_content
        assert "Prod Export Test" in csv_content

    async def test_export_products_xlsx(self, client: AsyncClient, tenant_a: dict):
        """Exportar catálogo a Excel retorna bytes XLSX y content-type correcto."""
        await self._setup(client, tenant_a["headers"])

        resp = await client.get("/reports/export/products/xlsx", headers=tenant_a["headers"])
        assert resp.status_code == 200
        assert "spreadsheetml.sheet" in resp.headers["content-type"]
        assert len(resp.content) > 1000
