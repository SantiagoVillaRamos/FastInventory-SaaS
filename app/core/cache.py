import redis.asyncio as aioredis
from app.core.config import settings

# Cliente global inicializado en el lifespan de main.py
_redis_client: aioredis.Redis | None = None


async def init_cache() -> None:
    """Crea el pool de conexiones a Redis. Llamar en startup."""
    global _redis_client
    _redis_client = aioredis.from_url(
        settings.redis_url,
        decode_responses=True,   # Devuelve strings, no bytes
        encoding="utf-8",
        socket_connect_timeout=5,
    )
    # Verificar que la conexión funciona
    await _redis_client.ping()


async def close_cache() -> None:
    """Cierra el pool de conexiones. Llamar en shutdown."""
    global _redis_client
    if _redis_client:
        await _redis_client.aclose()
        _redis_client = None


def get_cache_client() -> aioredis.Redis:
    """Retorna el cliente Redis. Usado por las dependencias de FastAPI."""
    if _redis_client is None:
        raise RuntimeError("Cache no inicializado. ¿Falta llamar a init_cache()?")
    return _redis_client
