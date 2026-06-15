"""Tests del módulo Auth — Registro de tenants y Login JWT."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestRegister:
    """RF-01: Onboarding atómico de un tenant con su admin."""

    async def test_register_creates_tenant_and_admin(self, client: AsyncClient):
        """El registro debe crear el tenant y devolver sus datos."""
        resp = await client.post("/auth/register", json={
            "business_name": "Tienda Test",
            "slug": "tienda-test-register",
            "plan": "free",
            "admin_email": "register@test.com",
            "admin_name": "Admin Test",
            "admin_password": "Segura123!",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Tienda Test"
        assert data["slug"] == "tienda-test-register"
        assert data["is_active"] is True

    async def test_register_duplicate_slug_fails(self, client: AsyncClient):
        """No se puede registrar dos tenants con el mismo slug."""
        payload = {
            "business_name": "Tienda Dup",
            "slug": "slug-duplicado",
            "plan": "free",
            "admin_email": "dup1@test.com",
            "admin_name": "Admin Dup",
            "admin_password": "Segura123!",
        }
        resp1 = await client.post("/auth/register", json=payload)
        assert resp1.status_code == 201

        # Segundo registro con mismo slug
        payload["admin_email"] = "dup2@test.com"
        resp2 = await client.post("/auth/register", json=payload)
        assert resp2.status_code == 400
        assert "slug" in resp2.json()["detail"].lower()

    async def test_register_duplicate_email_fails(self, client: AsyncClient):
        """No se puede registrar con un email ya existente."""
        payload = {
            "business_name": "Tienda Email",
            "slug": "email-unico",
            "plan": "free",
            "admin_email": "unico@test.com",
            "admin_name": "Admin Email",
            "admin_password": "Segura123!",
        }
        await client.post("/auth/register", json=payload)

        payload["slug"] = "email-unico-2"
        resp = await client.post("/auth/register", json=payload)
        assert resp.status_code == 400
        assert "correo" in resp.json()["detail"].lower()

    async def test_register_invalid_slug_rejected(self, client: AsyncClient):
        """Slugs con caracteres inválidos deben ser rechazados."""
        resp = await client.post("/auth/register", json={
            "business_name": "Tienda Slug",
            "slug": "MAYÚSCULAS NO!",
            "plan": "free",
            "admin_email": "slug-bad@test.com",
            "admin_name": "Admin Slug",
            "admin_password": "Segura123!",
        })
        assert resp.status_code == 422  # Validación Pydantic


@pytest.mark.asyncio
class TestLogin:
    """Autenticación JWT con OAuth2."""

    async def test_login_success(self, client: AsyncClient, tenant_a: dict):
        """Login con credenciales correctas devuelve un token válido."""
        resp = await client.post("/auth/token", data={
            "username": tenant_a["email"],
            "password": "Password123!",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    async def test_login_wrong_password(self, client: AsyncClient, tenant_a: dict):
        """Password incorrecto devuelve 401."""
        resp = await client.post("/auth/token", data={
            "username": tenant_a["email"],
            "password": "PasswordIncorrecto!",
        })
        assert resp.status_code == 401

    async def test_login_nonexistent_user(self, client: AsyncClient):
        """Email inexistente devuelve 401."""
        resp = await client.post("/auth/token", data={
            "username": "noexisto@test.com",
            "password": "Cualquier123!",
        })
        assert resp.status_code == 401

    async def test_protected_endpoint_without_token(self, client: AsyncClient):
        """Acceder sin token a un endpoint protegido devuelve 401."""
        resp = await client.get("/categories/")
        assert resp.status_code == 401
