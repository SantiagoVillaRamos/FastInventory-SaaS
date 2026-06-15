from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.branches.models import Branch, BranchProductStock
from app.modules.products.models import Product


class BranchRepository:

    @staticmethod
    async def create(tenant_id: UUID, data: dict, session: AsyncSession) -> Branch:
        branch = Branch(tenant_id=tenant_id, **data)
        session.add(branch)
        await session.flush()
        return branch

    @staticmethod
    async def get_by_id(branch_id: UUID | str, tenant_id: UUID | str, session: AsyncSession) -> Branch | None:
        if isinstance(branch_id, str):
            branch_id = UUID(branch_id)
        if isinstance(tenant_id, str):
            tenant_id = UUID(tenant_id)
        stmt = select(Branch).where(
            Branch.id == branch_id,
            Branch.tenant_id == tenant_id,
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def list_by_tenant(tenant_id: UUID | str, session: AsyncSession) -> list[Branch]:
        if isinstance(tenant_id, str):
            tenant_id = UUID(tenant_id)
        stmt = select(Branch).where(Branch.tenant_id == tenant_id).order_by(Branch.created_at)
        result = await session.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def update(branch_id: UUID | str, tenant_id: UUID | str, update_data: dict, session: AsyncSession) -> Branch | None:
        branch = await BranchRepository.get_by_id(branch_id, tenant_id, session)
        if branch:
            for key, value in update_data.items():
                setattr(branch, key, value)
            await session.flush()
        return branch

    # ── Stock por Sucursal ─────────────────────────────────────────────────

    @staticmethod
    async def get_or_create_stock(
        branch_id: UUID, product_id: UUID, tenant_id: UUID, session: AsyncSession
    ) -> BranchProductStock:
        """Obtiene o crea el registro de stock para (branch, product)."""
        stmt = select(BranchProductStock).where(
            BranchProductStock.branch_id == branch_id,
            BranchProductStock.product_id == product_id,
        )
        result = await session.execute(stmt)
        entry = result.scalar_one_or_none()
        if not entry:
            entry = BranchProductStock(
                tenant_id=tenant_id,
                branch_id=branch_id,
                product_id=product_id,
                stock=0,
            )
            session.add(entry)
            await session.flush()
        return entry

    @staticmethod
    async def decrement_branch_stock(
        branch_id: UUID, product_id: UUID, tenant_id: UUID, quantity: int, session: AsyncSession
    ) -> bool:
        """Decrementa stock en la sucursal. Retorna False si no hay suficiente stock."""
        entry = await BranchRepository.get_or_create_stock(branch_id, product_id, tenant_id, session)
        if entry.stock < quantity:
            return False
        entry.stock -= quantity
        await session.flush()
        return True

    @staticmethod
    async def increment_branch_stock(
        branch_id: UUID, product_id: UUID, tenant_id: UUID, quantity: int, session: AsyncSession
    ) -> BranchProductStock:
        """Incrementa stock en la sucursal (para reposición / compras)."""
        entry = await BranchRepository.get_or_create_stock(branch_id, product_id, tenant_id, session)
        entry.stock += quantity
        await session.flush()
        return entry

    @staticmethod
    async def list_stock_by_branch(
        branch_id: UUID | str, tenant_id: UUID | str, session: AsyncSession
    ) -> list[tuple[BranchProductStock, str]]:
        """Retorna lista de (BranchProductStock, product_name) para una sucursal."""
        if isinstance(branch_id, str):
            branch_id = UUID(branch_id)
        if isinstance(tenant_id, str):
            tenant_id = UUID(tenant_id)
        stmt = (
            select(BranchProductStock, Product.name)
            .join(Product, BranchProductStock.product_id == Product.id)
            .where(
                BranchProductStock.branch_id == branch_id,
                BranchProductStock.tenant_id == tenant_id,
            )
            .order_by(Product.name)
        )
        result = await session.execute(stmt)
        return list(result.all())

    @staticmethod
    async def get_branch_product_stock(
        branch_id: UUID | str, product_id: UUID | str, session: AsyncSession
    ) -> BranchProductStock | None:
        if isinstance(branch_id, str):
            branch_id = UUID(branch_id)
        if isinstance(product_id, str):
            product_id = UUID(product_id)
        stmt = select(BranchProductStock).where(
            BranchProductStock.branch_id == branch_id,
            BranchProductStock.product_id == product_id,
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()
