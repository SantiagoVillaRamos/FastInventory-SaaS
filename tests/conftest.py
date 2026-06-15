"""conftest.py — Fixtures globales para la suite de tests de FastInventory SaaS.

Crea una base de datos de test aislada con SQLite async (en memoria),
un cliente Redis fake, y provee helpers para registrar tenants y obtener tokens.
"""

import asyncio
import uuid
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base
from app.core.dependencies import get_cache, get_db

# ── Importar TODOS los modelos para que Base.metadata los conozca ────────────
from app.modules.admin.models import PlanAuditLog  # noqa: F401
from app.modules.categories.models import Category  # noqa: F401
from app.modules.products.models import Product  # noqa: F401
from app.modules.sales.models import Sale, SaleItem  # noqa: F401
from app.modules.tenants.models import Tenant  # noqa: F401
from app.modules.users.models import User  # noqa: F401


# ── Motor de BD de test (SQLite async en memoria) ────────────────────────────
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


# ── Fake Redis (dict en memoria) ────────────────────────────────────────────
class FakeRedis:
    """Simula redis.asyncio.Redis con un dict en memoria."""

    def __init__(self):
        self._store: dict[str, str] = {}

    async def get(self, key: str) -> str | None:
        return self._store.get(key)

    async def set(self, key: str, value: str, ex: int | None = None) -> None:
        self._store[key] = value

    async def delete(self, *keys: str) -> None:
        for k in keys:
            self._store.pop(k, None)

    async def scan(self, cursor: int = 0, match: str | None = None, count: int = 10) -> tuple[int, list[str]]:
        import fnmatch
        keys = list(self._store.keys())
        if match:
            keys = fnmatch.filter(keys, match)
        return 0, keys

    async def ping(self) -> bool:
        return True

    async def aclose(self) -> None:
        self._store.clear()


# ── Event loop ───────────────────────────────────────────────────────────────
@pytest.fixture(scope="session")
def event_loop():
    """Usa un solo event loop para toda la sesión de tests."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


# ── Crear y destruir tablas ──────────────────────────────────────────────────
@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_database():
    """Crea todas las tablas al inicio de la sesión y las destruye al final."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


# ── Sesión de BD por test ────────────────────────────────────────────────────
@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provee una sesión de BD limpia por cada test."""
    async with TestSessionLocal() as session:
        yield session


# ── Fake Redis por test ──────────────────────────────────────────────────────
@pytest.fixture
def fake_redis() -> FakeRedis:
    return FakeRedis()


# ── Cliente HTTP de test ─────────────────────────────────────────────────────
@pytest_asyncio.fixture
async def client(db_session: AsyncSession, fake_redis: FakeRedis) -> AsyncGenerator[AsyncClient, None]:
    """Cliente httpx que apunta a la app FastAPI con dependencias de test."""
    from app.main import app

    # Override de dependencias: BD de test y Redis fake
    async def override_get_db():
        yield db_session

    async def override_get_cache():
        return fake_redis

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_cache] = override_get_cache

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


# ── Helpers ──────────────────────────────────────────────────────────────────
@pytest_asyncio.fixture
async def tenant_a(client: AsyncClient) -> dict:
    """Registra el Tenant A y retorna sus datos + token JWT."""
    unique = uuid.uuid4().hex[:8]
    payload = {
        "business_name": f"Ferretería Alpha {unique}",
        "slug": f"alpha-{unique}",
        "plan": "free",
        "admin_email": f"admin-{unique}@alpha.com",
        "admin_name": "Admin Alpha",
        "admin_password": "Password123!",
    }
    resp = await client.post("/auth/register", json=payload)
    assert resp.status_code == 201, f"Error al registrar Tenant A: {resp.text}"
    tenant_data = resp.json()

    # Login para obtener JWT
    login_resp = await client.post(
        "/auth/token",
        data={"username": payload["admin_email"], "password": payload["admin_password"]},
    )
    assert login_resp.status_code == 200, f"Error al loguearse: {login_resp.text}"
    token = login_resp.json()["access_token"]

    return {
        "tenant": tenant_data,
        "token": token,
        "email": payload["admin_email"],
        "headers": {"Authorization": f"Bearer {token}"},
    }


@pytest_asyncio.fixture
async def tenant_b(client: AsyncClient) -> dict:
    """Registra el Tenant B (distinto al A) para tests de aislamiento."""
    unique = uuid.uuid4().hex[:8]
    payload = {
        "business_name": f"Ferretería Beta {unique}",
        "slug": f"beta-{unique}",
        "plan": "free",
        "admin_email": f"admin-{unique}@beta.com",
        "admin_name": "Admin Beta",
        "admin_password": "Password456!",
    }
    resp = await client.post("/auth/register", json=payload)
    assert resp.status_code == 201, f"Error al registrar Tenant B: {resp.text}"
    tenant_data = resp.json()

    login_resp = await client.post(
        "/auth/token",
        data={"username": payload["admin_email"], "password": payload["admin_password"]},
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]

    return {
        "tenant": tenant_data,
        "token": token,
        "email": payload["admin_email"],
        "headers": {"Authorization": f"Bearer {token}"},
    }
