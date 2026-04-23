from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.dependencies import get_db, require_admin
from app.modules.users.schemas import UserCreate, UserRead, UserUpdate
from app.modules.users.service import UserService

# Todo el router de users requiere permisos de administrador
router = APIRouter(dependencies=[Depends(require_admin)])

@router.post("/", response_model=UserRead, status_code=201, tags=["Users"])
async def create_user(
    data: UserCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """
    Crea un nuevo usuario validadando el límite de usuarios permitidos
    según el plan del Tenant. Requiere rol admin o superadmin.
    """
    return await UserService.create_user(current_user["tenant_id"], data, db)


@router.get("/", response_model=List[UserRead], tags=["Users"])
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Lista todos los empleados/administradores del Tenant actual."""
    return await UserService.list_users(current_user["tenant_id"], db)


@router.patch("/{user_id}", response_model=UserRead, tags=["Users"])
async def update_user(
    user_id: str,
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Actualiza datos, rol o suspende a un empleado de la organización."""
    return await UserService.update_user(user_id, current_user["tenant_id"], data, db)
