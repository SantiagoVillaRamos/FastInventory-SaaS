"""Script de entorno Alembic — conecta con AsyncEngine de SQLAlchemy 2.0."""

from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context
import asyncio
import sys
import os

# Agregar la raíz del proyecto al path de Python para que pueda encontrar el módulo 'app'
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Importar los modelos aquí a medida que se crean (necesario para autogenerate)
from app.core.database import Base
from app.modules.tenants.models import Tenant
from app.modules.users.models import User
from app.modules.categories.models import Category
from app.modules.products.models import Product
from app.modules.sales.models import Sale, SaleItem
from app.modules.admin.models import PlanAuditLog
from app.core.config import settings

config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# target_metadata se usará cuando se importen los modelos
target_metadata = Base.metadata


def do_run_migrations(connection):
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations():
    """Crea el engine async y ejecuta las migraciones."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online():
    asyncio.run(run_async_migrations())


def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
