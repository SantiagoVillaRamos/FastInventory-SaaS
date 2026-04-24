from pydantic_settings import BaseSettings
from pydantic import field_validator
import json


class Settings(BaseSettings):
    # Entorno
    environment: str = "dev"
    debug: bool = True

    # Seguridad — SECRET_KEY es obligatoria (sin valor por defecto)
    secret_key: str
    access_token_expire_minutes: int = 60

    # Base de datos
    database_url: str

    @field_validator("database_url", mode="before")
    @classmethod
    def fix_database_url(cls, v):
        if isinstance(v, str):
            if v.startswith("postgres://"):
                return v.replace("postgres://", "postgresql+asyncpg://", 1)
            elif v.startswith("postgresql://") and not v.startswith("postgresql+asyncpg://"):
                return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    # Redis
    redis_url: str

    # CORS: acepta string JSON o lista directa desde el .env
    cors_origins: list[str] = ["*"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return [v]
        return v

    model_config = {"env_file": ".env", "extra": "ignore"}


# Instancia global — importar desde aquí en todos los módulos
settings = Settings()
