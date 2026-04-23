from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker,
)
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

# Motor async — pool_pre_ping verifica la conexión antes de usarla
engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,       # Imprime SQL en consola (solo en dev)
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

# Fábrica de sesiones async
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,    # Permite acceder a atributos después del commit
    autoflush=False,
)


class Base(DeclarativeBase):
    """Clase base para todos los modelos SQLAlchemy del proyecto.

    Todos los modelos (Tenant, User, Product, etc.) heredan de aquí.
    Alembic usa esta clase para generar migraciones automáticas.
    """
    pass
