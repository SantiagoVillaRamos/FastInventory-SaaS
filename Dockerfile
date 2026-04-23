FROM python:3.11-slim

WORKDIR /app

# Dependencias del sistema (para asyncpg y bcrypt)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Instalar dependencias Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código fuente
COPY . .

# Exponer el puerto de la API
EXPOSE 8000

# Producción: Gunicorn gestiona workers Uvicorn (dev: se sobreescribe en docker-compose.yml)
CMD ["gunicorn", "app.main:app", "--workers", "2", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "--timeout", "60"]
