# Guía de Contribución — FastInventory SaaS

## Estrategia de Ramas (Git Flow Simplificado)

```
main ────────●────────●────────●────────●──── (producción estable)
              \      /          \      /
develop ───────●────●────────────●────●────── (integración de features)
                \  /              \  /
feature/xxx ─────●                 ●
                                   │
hotfix/xxx ────────────────────────● ──────── (correcciones urgentes)
```

### Ramas principales

| Rama | Propósito | ¿Quién hace merge? |
|---|---|---|
| `main` | Código **estable en producción**. Solo recibe merges desde `develop` o `hotfix/` | Líder del proyecto |
| `develop` | Rama de **integración**. Aquí se unen todas las features terminadas | Cualquier desarrollador |

### Ramas de trabajo

| Tipo | Formato | Ejemplo | Sale de → Vuelve a |
|---|---|---|---|
| Feature | `feature/nombre-corto` | `feature/export-csv` | `develop` → `develop` |
| Bugfix | `bugfix/nombre-corto` | `bugfix/stock-negativo` | `develop` → `develop` |
| Hotfix | `hotfix/nombre-corto` | `hotfix/jwt-expired` | `main` → `main` + `develop` |
| Release | `release/vX.Y.Z` | `release/v2.1.0` | `develop` → `main` + `develop` |

---

## Flujo de Trabajo Diario

### 1. Crear una nueva feature
```bash
# Siempre partir desde develop actualizado
git checkout develop
git pull origin develop

# Crear tu rama de trabajo
git checkout -b feature/nombre-de-la-feature
```

### 2. Trabajar en la feature
```bash
# Hacer commits pequeños y descriptivos
git add -A
git commit -m "feat: descripción corta del cambio"

# Subir tu rama a GitHub
git push origin feature/nombre-de-la-feature
```

### 3. Integrar la feature
```bash
# Actualizar develop por si alguien más hizo cambios
git checkout develop
git pull origin develop

# Mergear tu feature
git merge feature/nombre-de-la-feature

# Subir develop actualizado
git push origin develop

# Eliminar la rama (ya no se necesita)
git branch -d feature/nombre-de-la-feature
git push origin --delete feature/nombre-de-la-feature
```

### 4. Enviar a producción (release)
```bash
# Cuando develop esté estable, crear rama de release
git checkout develop
git checkout -b release/v2.1.0

# Hacer últimos ajustes (versión, changelog, etc.)
git commit -m "chore: preparar release v2.1.0"

# Mergear a main (producción)
git checkout main
git merge release/v2.1.0
git tag -a v2.1.0 -m "Release v2.1.0"
git push origin main --tags

# También mergear de vuelta a develop
git checkout develop
git merge release/v2.1.0
git push origin develop

# Limpiar
git branch -d release/v2.1.0
```

### 5. Hotfix (corrección urgente en producción)
```bash
# Sale directamente de main
git checkout main
git checkout -b hotfix/nombre-del-bug

# Corregir y commitear
git commit -m "fix: descripción del bug corregido"

# Mergear a main Y a develop
git checkout main
git merge hotfix/nombre-del-bug
git tag -a v2.0.1 -m "Hotfix v2.0.1"
git push origin main --tags

git checkout develop
git merge hotfix/nombre-del-bug
git push origin develop
```

---

## Convención de Commits (Conventional Commits)

Todos los mensajes de commit deben seguir este formato:

```
tipo: descripción corta en imperativo
```

| Tipo | Cuándo usarlo | Ejemplo |
|---|---|---|
| `feat` | Nueva funcionalidad | `feat: agregar endpoint de exportar CSV` |
| `fix` | Corrección de un bug | `fix: corregir cálculo de stock negativo` |
| `refactor` | Reestructurar código sin cambiar funcionalidad | `refactor: separar lógica de validación en servicio` |
| `docs` | Cambios en documentación (README, CONTRIBUTING) | `docs: actualizar instrucciones de despliegue` |
| `chore` | Tareas de mantenimiento (deps, CI, configs) | `chore: actualizar dependencias de seguridad` |
| `test` | Agregar o modificar tests | `test: añadir test de aislamiento multi-tenant` |
| `style` | Formateo de código (sin cambios lógicos) | `style: aplicar formato Ruff a módulo sales` |
| `ci` | Cambios en GitHub Actions o CI/CD | `ci: añadir job de deploy automático a Render` |

---

## Reglas de Calidad

### Antes de hacer commit
```bash
# 1. Verificar que no haya errores de lint
ruff check app/

# 2. Verificar que el formato sea correcto
ruff format --check app/

# 3. (Opcional) Auto-corregir problemas
ruff check app/ --fix
ruff format app/
```

### Antes de hacer merge a develop
- [ ] Ruff pasa sin errores (`ruff check app/`)
- [ ] Los contenedores levantan correctamente (`docker compose up -d`)
- [ ] El endpoint `/docs` carga sin errores
- [ ] Las migraciones se ejecutan sin fallos (`alembic upgrade head`)

### Antes de hacer merge a main
- [ ] Todo lo anterior
- [ ] Tests pasan correctamente (`pytest tests/ -v`)
- [ ] Se revisó el código manualmente (code review)
- [ ] Se etiquetó con versión (`git tag -a vX.Y.Z`)

---

## Estructura de archivos: ¿Qué va a GitHub y qué no?

| Carpeta/Archivo | ¿Va a GitHub? | Razón |
|---|---|---|
| `app/` | ✅ Sí | Código fuente de la API |
| `alembic/` | ✅ Sí | Migraciones de base de datos |
| `scripts/` | ✅ Sí | Scripts de administración |
| `tests/` | ✅ Sí | Tests automatizados |
| `.github/` | ✅ Sí | CI/CD con GitHub Actions |
| `docs/logo.png` | ✅ Sí | Usado por README.md |
| `docs/*.md` | ❌ No | Documentación académica (local) |
| `architecture/` | ❌ No | Diagramas UML y ADD (local) |
| `.env` | ❌ No | Variables secretas |
