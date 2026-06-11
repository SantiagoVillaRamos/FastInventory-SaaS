/* ============================================================
   FastInventory SaaS — API Client
   Wrapper de fetch() con JWT automático y manejo de errores
   Ubicación: core/js/api.js
   ============================================================ */

const API_BASE = "http://localhost:8002";

const api = {
  /**
   * Realiza un request GET autenticado.
   * @param {string} path — Ruta relativa (ej. "/products")
   * @param {Object} [params] — Query params opcionales
   * @returns {Promise<Object>}
   */
  async get(path, params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = `${API_BASE}${path}${query ? "?" + query : ""}`;
    return this._request(url, { method: "GET" });
  },

  /**
   * Realiza un request POST autenticado con body JSON.
   * @param {string} path
   * @param {Object} body
   * @returns {Promise<Object>}
   */
  async post(path, body = {}) {
    return this._request(`${API_BASE}${path}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /**
   * Realiza un request PUT autenticado con body JSON.
   * @param {string} path
   * @param {Object} body
   * @returns {Promise<Object>}
   */
  async put(path, body = {}) {
    return this._request(`${API_BASE}${path}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  /**
   * Realiza un request PATCH autenticado con body JSON.
   * @param {string} path
   * @param {Object} body
   * @returns {Promise<Object>}
   */
  async patch(path, body = {}) {
    return this._request(`${API_BASE}${path}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  /**
   * Realiza un request DELETE autenticado.
   * @param {string} path
   * @returns {Promise<Object>}
   */
  async delete(path) {
    return this._request(`${API_BASE}${path}`, { method: "DELETE" });
  },

  /**
   * Descarga un archivo binario (ej. PDF).
   * @param {string} path
   * @returns {Promise<Blob>}
   */
  async download(path) {
    const token = auth.getToken();
    if (!token) {
      auth.logout();
      throw new Error("No autenticado");
    }

    const response = await fetch(`${API_BASE}${path}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 401) {
      auth.logout();
      throw new Error("Sesión expirada");
    }

    if (!response.ok) {
      throw new Error(`Error ${response.status}`);
    }

    return response.blob();
  },

  /**
   * Request interno con manejo de errores centralizado.
   * @param {string} url
   * @param {RequestInit} options
   * @returns {Promise<Object>}
   * @private
   */
  async _request(url, options = {}) {
    const token = auth.getToken();
    if (!token) {
      auth.logout();
      throw new Error("No autenticado");
    }

    const config = {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      // Si el backend devuelve 401, la sesión expiró
      if (response.status === 401) {
        auth.logout();
        throw new Error("Sesión expirada");
      }

      const data = await response.json();

      if (!response.ok) {
        const error = new Error(data?.detail || `Error ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      if (err.message === "Sesión expirada") throw err;
      if (err.status) throw err;

      // Error de red
      const networkError = new Error("No se pudo conectar con el servidor.");
      networkError.status = 0;
      throw networkError;
    }
  },
};
