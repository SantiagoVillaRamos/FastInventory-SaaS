import csv
import io
from uuid import UUID
from openpyxl import Workbook
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.sales.models import Sale, SaleItem
from app.modules.products.models import Product, ProductVariant
from app.modules.categories.models import Category
from app.modules.branches.models import Branch

class ExportService:

    @staticmethod
    async def get_sales_data(tenant_id: str, session: AsyncSession) -> list[dict]:
        """Obtiene el historial de ventas completo con ítems y relaciones para exportación."""
        stmt = (
            select(Sale)
            .where(Sale.tenant_id == UUID(tenant_id))
            .order_by(Sale.created_at.desc())
            .options(
                selectinload(Sale.items)
            )
        )
        result = await session.execute(stmt)
        sales = result.scalars().all()

        # Cargar productos, variantes y sucursales en memoria para armar el reporte rápido
        # Evitamos N+1 haciendo queries de mapeo
        product_ids = set()
        variant_ids = set()
        branch_ids = set()
        for s in sales:
            if s.branch_id:
                branch_ids.add(s.branch_id)
            for item in s.items:
                product_ids.add(item.product_id)
                if item.variant_id:
                    variant_ids.add(item.variant_id)

        products_map = {}
        if product_ids:
            prod_stmt = select(Product.id, Product.name).where(Product.id.in_(product_ids))
            prod_res = await session.execute(prod_stmt)
            products_map = {row[0]: row[1] for row in prod_res.all()}

        variants_map = {}
        if variant_ids:
            var_stmt = select(ProductVariant.id, ProductVariant.name).where(ProductVariant.id.in_(variant_ids))
            var_res = await session.execute(var_stmt)
            variants_map = {row[0]: row[1] for row in var_res.all()}

        branches_map = {}
        if branch_ids:
            branch_stmt = select(Branch.id, Branch.name).where(Branch.id.in_(branch_ids))
            branch_res = await session.execute(branch_stmt)
            branches_map = {row[0]: row[1] for row in branch_res.all()}

        rows = []
        for s in sales:
            branch_name = branches_map.get(s.branch_id, "Stock Global") if s.branch_id else "Stock Global"
            for item in s.items:
                prod_name = products_map.get(item.product_id, "Desconocido")
                var_name = variants_map.get(item.variant_id, "N/A") if item.variant_id else "N/A"
                qty = item.quantity
                u_price = float(item.unit_price)
                item_total = qty * u_price

                rows.append({
                    "sale_id": str(s.id),
                    "created_at": s.created_at.strftime("%Y-%m-%d %H:%M:%S") if s.created_at else "",
                    "branch": branch_name,
                    "subtotal": float(s.subtotal),
                    "tax_amount": float(s.tax_amount),
                    "retention_amount": float(s.retention_amount),
                    "total": float(s.total),
                    "product": prod_name,
                    "variant": var_name,
                    "quantity": qty,
                    "unit_price": u_price,
                    "item_total": item_total
                })
        return rows

    @staticmethod
    async def get_products_data(tenant_id: str, session: AsyncSession) -> list[dict]:
        """Obtiene el catálogo de productos con variantes y categorías para exportación."""
        stmt = (
            select(Product)
            .where(Product.tenant_id == UUID(tenant_id))
            .order_by(Product.name.asc())
            .options(
                selectinload(Product.variants)
            )
        )
        result = await session.execute(stmt)
        products = result.scalars().all()

        # Obtener categorías
        category_ids = {p.category_id for p in products}
        categories_map = {}
        if category_ids:
            cat_stmt = select(Category.id, Category.name).where(Category.id.in_(category_ids))
            cat_res = await session.execute(cat_stmt)
            categories_map = {row[0]: row[1] for row in cat_res.all()}

        rows = []
        for p in products:
            cat_name = categories_map.get(p.category_id, "Sin categoría")
            if p.has_variants and p.variants:
                for v in p.variants:
                    rows.append({
                        "product_id": str(p.id),
                        "name": p.name,
                        "category": cat_name,
                        "unit": p.unit,
                        "tax_exempt": "Sí" if p.is_tax_exempt else "No",
                        "has_variants": "Sí",
                        "variant_id": str(v.id),
                        "variant_name": v.name,
                        "sku": v.sku or "",
                        "price": float(v.price),
                        "stock": v.stock,
                    })
            else:
                rows.append({
                    "product_id": str(p.id),
                    "name": p.name,
                    "category": cat_name,
                    "unit": p.unit,
                    "tax_exempt": "Sí" if p.is_tax_exempt else "No",
                    "has_variants": "No",
                    "variant_id": "N/A",
                    "variant_name": "N/A",
                    "sku": "N/A",
                    "price": float(p.price),
                    "stock": p.stock,
                })
        return rows

    @staticmethod
    async def export_sales_csv(tenant_id: str, session: AsyncSession) -> str:
        """Exporta ventas en formato CSV."""
        data = await ExportService.get_sales_data(tenant_id, session)
        output = io.StringIO()
        writer = csv.writer(output, delimiter=",")
        
        # Headers
        writer.writerow([
            "ID Venta", "Fecha", "Sucursal", "Subtotal Venta", "IVA Venta", 
            "Retencion Venta", "Total Venta", "Producto", "Variante", 
            "Cantidad", "Precio Unitario", "Total Item"
        ])
        
        for r in data:
            writer.writerow([
                r["sale_id"], r["created_at"], r["branch"], r["subtotal"], 
                r["tax_amount"], r["retention_amount"], r["total"], 
                r["product"], r["variant"], r["quantity"], r["unit_price"], 
                r["item_total"]
            ])
        return output.getvalue()

    @staticmethod
    async def export_sales_xlsx(tenant_id: str, session: AsyncSession) -> bytes:
        """Exporta ventas en formato XLSX en memoria."""
        data = await ExportService.get_sales_data(tenant_id, session)
        wb = Workbook()
        ws = wb.active
        ws.title = "Historial de Ventas"

        # Headers
        headers = [
            "ID Venta", "Fecha", "Sucursal", "Subtotal Venta", "IVA Venta", 
            "Retención Venta", "Total Venta", "Producto", "Variante", 
            "Cantidad", "Precio Unitario", "Total Ítem"
        ]
        ws.append(headers)

        for r in data:
            ws.append([
                r["sale_id"], r["created_at"], r["branch"], r["subtotal"], 
                r["tax_amount"], r["retention_amount"], r["total"], 
                r["product"], r["variant"], r["quantity"], r["unit_price"], 
                r["item_total"]
            ])

        output = io.BytesIO()
        wb.save(output)
        return output.getvalue()

    @staticmethod
    async def export_products_csv(tenant_id: str, session: AsyncSession) -> str:
        """Exporta catálogo de productos/inventario en formato CSV."""
        data = await ExportService.get_products_data(tenant_id, session)
        output = io.StringIO()
        writer = csv.writer(output, delimiter=",")

        # Headers
        writer.writerow([
            "ID Producto", "Nombre", "Categoria", "Unidad Medida", 
            "Exento IVA", "Tiene Variantes", "ID Variante", "Nombre Variante", 
            "SKU", "Precio", "Stock"
        ])

        for r in data:
            writer.writerow([
                r["product_id"], r["name"], r["category"], r["unit"], 
                r["tax_exempt"], r["has_variants"], r["variant_id"], 
                r["variant_name"], r["sku"], r["price"], r["stock"]
            ])
        return output.getvalue()

    @staticmethod
    async def export_products_xlsx(tenant_id: str, session: AsyncSession) -> bytes:
        """Exporta catálogo de productos/inventario en formato XLSX en memoria."""
        data = await ExportService.get_products_data(tenant_id, session)
        wb = Workbook()
        ws = wb.active
        ws.title = "Catalogo de Productos"

        # Headers
        headers = [
            "ID Producto", "Nombre", "Categoría", "Unidad Medida", 
            "Exento IVA", "Tiene Variantes", "ID Variante", "Nombre Variante", 
            "SKU", "Precio", "Stock"
        ]
        ws.append(headers)

        for r in data:
            ws.append([
                r["product_id"], r["name"], r["category"], r["unit"], 
                r["tax_exempt"], r["has_variants"], r["variant_id"], 
                r["variant_name"], r["sku"], r["price"], r["stock"]
            ])

        output = io.BytesIO()
        wb.save(output)
        return output.getvalue()
