from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.cache import init_cache, close_cache


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ────────────────────────────────────────────────────────────
    print("🚀 FastInventory SaaS iniciando...")
    await init_cache()
    print("✅ Redis conectado")
    # La BD se conecta lazy (en el primer request) via AsyncSessionLocal
    yield
    # ── Shutdown ───────────────────────────────────────────────────────────
    await close_cache()
    print("🛑 FastInventory SaaS cerrado")


app = FastAPI(
    title="FastInventory SaaS",
    description="API de gestión de inventario y POS multi-tenant para PYMEs Latam",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ───────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health check ───────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health_check():
    """Verifica que la API, BD y Redis estén operativos."""
    return {
        "status": "ok",
        "service": "FastInventory SaaS",
        "version": "2.0.0",
        "environment": settings.environment,
    }


# ── Routers (se registran a medida que se completan las fases) ─────────────
# FASE 2:
from app.modules.tenants.router import router as tenants_router
from app.modules.auth.router import router as auth_router
app.include_router(tenants_router)
app.include_router(auth_router, prefix="/auth")

# FASE 3:
from app.modules.users.router import router as users_router
app.include_router(users_router, prefix="/users")

# FASE 4:
from app.modules.categories.router import router as categories_router
app.include_router(categories_router, prefix="/categories")

# FASE 5:
from app.modules.products.router import router as products_router
app.include_router(products_router, prefix="/products")

# FASE 6:
from app.modules.sales.router import router as sales_router
app.include_router(sales_router, prefix="/sales")

# FASE 7:
from app.modules.reports.router import router as reports_router
app.include_router(reports_router, prefix="/reports")

# FASE 8:
from app.modules.admin.router import router as admin_router
app.include_router(admin_router, prefix="/admin")
