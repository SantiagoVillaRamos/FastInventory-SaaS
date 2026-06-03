/* ============================================================
   FastInventory SaaS — Auth Module
   Manejo centralizado de sesión JWT (sessionStorage)
   Ubicación: core/js/auth.js
   ============================================================ */

const AUTH_TOKEN_KEY = "fi_access_token";
const LOGIN_PAGE = "/login.html";
const APP_PAGE = "/app.html";

const auth = {
  /**
   * Guarda el access token en sessionStorage.
   * @param {string} accessToken
   */
  saveToken(accessToken) {
    sessionStorage.setItem(AUTH_TOKEN_KEY, accessToken);
  },

  /**
   * Lee el token. Retorna null si no existe o está expirado.
   * @returns {string|null}
   */
  getToken() {
    const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return null;

    const payload = this.getPayload();
    if (!payload || !payload.exp) return null;

    // Verificar expiración
    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp < nowInSeconds) {
      this.clearToken();
      return null;
    }

    return token;
  },

  /**
   * Decodifica el payload del JWT sin verificar firma.
   * Solo para uso de UI (mostrar rol, verificar expiración).
   * La verificación de firma ocurre siempre en el backend.
   * @returns {{ sub: string, role: string, tenant_id: string, exp: number }|null}
   */
  getPayload() {
    const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return null;

    try {
      const parts = token.split(".");
      if (parts.length !== 3) return null;

      const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );

      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  },

  /**
   * Elimina el token de sessionStorage (sin redirigir).
   */
  clearToken() {
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
  },

  /**
   * Cierra sesión: elimina el token y redirige a login.
   */
  logout() {
    this.clearToken();
    window.location.href = LOGIN_PAGE;
  },

  /**
   * Protección de ruta: si no hay token válido, redirige a login.
   * Llamar al inicio de cada página protegida.
   */
  requireAuth() {
    if (!this.getToken()) {
      window.location.href = LOGIN_PAGE;
    }
  },

  /**
   * Retorna los headers necesarios para fetch() autenticado.
   * @returns {Object}
   */
  getHeaders() {
    const token = this.getToken();
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  },

  /**
   * Verifica si hay sesión activa (token válido y no expirado).
   * @returns {boolean}
   */
  isAuthenticated() {
    return this.getToken() !== null;
  },

  /**
   * Retorna cuántos minutos faltan para que el token expire.
   * @returns {number|null}
   */
  getMinutesRemaining() {
    const payload = this.getPayload();
    if (!payload || !payload.exp) return null;
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const remaining = Math.floor((payload.exp - nowInSeconds) / 60);
    return remaining > 0 ? remaining : 0;
  },
};
