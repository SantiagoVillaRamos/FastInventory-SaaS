"""Dependencias de FastAPI inyectadas via Depends().

Patrón de uso en cualquier router:
    @router.get("/")
    async def mi_endpoint(
        db: AsyncSession = Depends(get_db),
        cache: Redis = Depends(get_cache),
        tenant: dict = Depends(get_current_tenant),
    ):
        ...  # tenant["id"] siempre disponible y validado
"""

from typing import AsyncGenerator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis

from app.core.database import AsyncSessionLocal
from app.core.cache import get_cache_client
from app.core.security import verify_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")


# ── Base: DB y Cache ─────────────────────────────────────────────────────────

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Provee una sesión de base de datos por request.

    Uso: db: AsyncSession = Depends(get_db)
    """
    async with AsyncSessionLocal() as session:
        yield session


async def get_cache() -> aioredis.Redis:
    """Provee el cliente Redis compartido.

    Uso: cache: Redis = Depends(get_cache)
    """
    return get_cache_client()


# ── Identidad: Usuario y Tenant ──────────────────────────────────────────────

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Extrae y valida el JWT. Retorna el payload como dict.

    En FASE 2 este método consultará la BD para devolver el objeto User.
    Por ahora retorna el payload del JWT directamente.

    Raises:
        HTTPException 401 si el token es inválido o expiró.
    """
    payload = verify_token(token)

    from app.modules.users.repository import UserRepository
    user = await UserRepository.get_by_id(payload["sub"], db)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Usuario inactivo")
    
    user_dict = {
        "sub": str(user.id),
        "role": getattr(user.role, "value", user.role),
        "tenant_id": str(user.tenant_id) if user.tenant_id else None
    }
    return user_dict


async def get_current_tenant(
    current_user: dict = Depends(get_current_user),
    cache: aioredis.Redis = Depends(get_cache),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Valida que el tenant del JWT esté activo.

    - Primero busca el estado en Redis (TTL 30s).
    - Si no está en caché, consulta PostgreSQL y cachea el resultado.

    Raises:
        HTTPException 403 si el tenant está suspendido o no existe.

    Note:
        En FASE 2 este método retornará el objeto Tenant completo.
    """
    tenant_id: str | None = current_user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sin tenant asignado a este usuario",
        )

    from app.modules.tenants.repository import TenantRepository
    
    cache_key = f"tenant:{tenant_id}:status"
    
    # 1. Caché primero
    status_cached = await cache.get(cache_key)
    if status_cached == "suspended":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tu negocio ha sido suspendido")
        
    # 2. Si no en caché, ir a Postgres
    if not status_cached:
        tenant = await TenantRepository.get_by_id(tenant_id, db)
        if not tenant or not tenant.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant inactivo o suspendido")
        # Marcar activo en caché por 30s
        await cache.set(cache_key, "active", ex=30)

    return {"id": tenant_id}


# ── Autorización por Rol ─────────────────────────────────────────────────────

def require_admin(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Permite solo admins y superadmins.

    Raises:
        HTTPException 403 para empleados.
    """
    if current_user.get("role") not in ("admin", "superadmin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol de administrador",
        )
    return current_user


def require_superadmin(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Permite solo superadmins (panel de plataforma).

    Raises:
        HTTPException 403 para admins y empleados.
    """
    if current_user.get("role") != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol de super-administrador",
        )
    return current_user
