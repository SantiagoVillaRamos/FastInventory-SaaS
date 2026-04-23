from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, status
from jose import JWTError, jwt
import bcrypt

from app.core.config import settings

# Algoritmo de firma del JWT
_ALGORITHM = "HS256"


# ── JWT ─────────────────────────────────────────────────────────────────────

def create_access_token(
    sub: str,
    role: str,
    tenant_id: str | None,
) -> str:
    """Genera un JWT firmado con HS256.

    Args:
        sub:       UUID del usuario (como string).
        role:      'employee' | 'admin' | 'superadmin'.
        tenant_id: UUID del tenant (None para superadmin).

    Returns:
        JWT en formato string.
    """
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    payload = {
        "sub": sub,
        "role": role,
        "tenant_id": str(tenant_id) if tenant_id else None,
        "exp": expire,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=_ALGORITHM)


def verify_token(token: str) -> dict:
    """Decodifica y valida un JWT.

    Returns:
        El payload decodificado como dict.

    Raises:
        HTTPException 401 si el token es inválido o expiró.
    """
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[_ALGORITHM],
        )
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido: sin 'sub'",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se pudo validar las credenciales",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ── Contraseñas ──────────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    """Hashea una contraseña en texto plano con bcrypt."""
    pwd_bytes = plain.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(pwd_bytes, salt)
    return hashed_password.decode('utf-8')


def verify_password(plain: str, hashed: str) -> bool:
    """Compara una contraseña en texto plano con su hash bcrypt."""
    password_byte_enc = plain.encode('utf-8')
    hashed_password_byte_enc = hashed.encode('utf-8')
    return bcrypt.checkpw(password_byte_enc, hashed_password_byte_enc)
