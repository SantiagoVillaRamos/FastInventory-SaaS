from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.branches.repository import BranchRepository
from app.modules.branches.schemas import (
    BranchCreate,
    BranchRead,
    BranchStockRead,
    BranchStockUpdate,
    BranchUpdate,
)


class BranchService:

    @staticmethod
    async def create_branch(tenant_id: str, data: BranchCreate, session: AsyncSession) -> BranchRead:
        """Crea una nueva sucursal para el tenant."""
        branch = await BranchRepository.create(UUID(tenant_id), data.model_dump(), session)
        await session.commit()
        return BranchRead.model_validate(branch)

    @staticmethod
    async def list_branches(tenant_id: str, session: AsyncSession) -> list[BranchRead]:
        branches = await BranchRepository.list_by_tenant(tenant_id, session)
        return [BranchRead.model_validate(b) for b in branches]

    @staticmethod
    async def get_branch(branch_id: str, tenant_id: str, session: AsyncSession) -> BranchRead:
        branch = await BranchRepository.get_by_id(branch_id, tenant_id, session)
        if not branch:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sucursal no encontrada")
        return BranchRead.model_validate(branch)

    @staticmethod
    async def update_branch(branch_id: str, tenant_id: str, data: BranchUpdate, session: AsyncSession) -> BranchRead:
        branch = await BranchRepository.update(
            branch_id, tenant_id, data.model_dump(exclude_unset=True), session
        )
        if not branch:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sucursal no encontrada")
        await session.commit()
        return BranchRead.model_validate(branch)

    @staticmethod
    async def get_branch_stock(branch_id: str, tenant_id: str, session: AsyncSession) -> list[BranchStockRead]:
        """Retorna el stock de todos los productos en una sucursal."""
        branch = await BranchRepository.get_by_id(branch_id, tenant_id, session)
        if not branch:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sucursal no encontrada")
        rows = await BranchRepository.list_stock_by_branch(branch_id, tenant_id, session)
        return [
            BranchStockRead(
                product_id=entry.product_id,
                product_name=product_name,
                stock=entry.stock,
            )
            for entry, product_name in rows
        ]

    @staticmethod
    async def set_branch_stock(
        branch_id: str, product_id: str, tenant_id: str, data: BranchStockUpdate, session: AsyncSession
    ) -> BranchStockRead:
        """Ajuste manual de stock de un producto en una sucursal (admin)."""
        from app.modules.products.repository import ProductRepository
        branch = await BranchRepository.get_by_id(branch_id, tenant_id, session)
        if not branch:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sucursal no encontrada")
        product = await ProductRepository.get_by_id(product_id, tenant_id, session)
        if not product:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")

        entry = await BranchRepository.get_or_create_stock(
            UUID(branch_id), UUID(product_id), UUID(tenant_id), session
        )
        entry.stock = data.stock
        await session.commit()
        return BranchStockRead(
            product_id=entry.product_id,
            product_name=product.name,
            stock=entry.stock,
        )
