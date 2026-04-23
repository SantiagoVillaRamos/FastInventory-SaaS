import asyncio
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal
from app.modules.users.models import User, RoleEnum
from app.modules.tenants.models import Tenant
from app.core.security import hash_password
from sqlalchemy import select

async def create_superadmin():
    email = "superadmin@fastinventory.com"
    password = "SuperPassword123!"
    
    async with AsyncSessionLocal() as session:
        # Verificar si ya existe
        stmt = select(User).where(User.email == email)
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()
        
        if existing:
            print(f"El Super-Admin {email} ya existe.")
            return

        # Crear Super-Admin (tenant_id es None porque es global)
        new_admin = User(
            id=uuid.uuid4(),
            email=email,
            name="Super Administrator",
            role=RoleEnum.SUPERADMIN,
            hashed_password=hash_password(password),
            is_active=True,
            tenant_id=None  # Global
        )
        
        session.add(new_admin)
        await session.commit()
        print(f"✅ Super-Admin creado exitosamente.")
        print(f"📧 Email: {email}")
        print(f"🔑 Password: {password}")

if __name__ == "__main__":
    asyncio.run(create_superadmin())
