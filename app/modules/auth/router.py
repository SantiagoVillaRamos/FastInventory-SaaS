from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.core.security import verify_password, create_access_token
from app.modules.users.models import User
from app.modules.auth.schemas import Token

router = APIRouter()

@router.post("/token", response_model=Token, tags=["Auth"])
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """Login con OAuth2. Valida credenciales e inyecta explícitamente el tenant en el JWT (QAS-03)."""
    stmt = select(User).where(User.email == form_data.username)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El usuario está inactivo"
        )
        
    access_token = create_access_token(
        sub=str(user.id),
        role=user.role,
        tenant_id=str(user.tenant_id) if user.tenant_id else None
    )
    
    return {"access_token": access_token, "token_type": "bearer"}
