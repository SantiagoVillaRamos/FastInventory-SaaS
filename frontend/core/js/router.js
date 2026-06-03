/* ============================================================
   FastInventory SaaS — SPA Router
   Carga módulos dinámicamente dentro de <main id="content">
   Ubicación: core/js/router.js
   ============================================================ */

const router = {
  /** @type {HTMLElement} */
  container: null,

  /** @type {Object<string, {html: string, css: string, js: string, init?: Function}>} */
  modules: {},

  /** @type {string} */
  currentModule: null,

  /** @type {Set<string>} */
  loadedStyles: new Set(),

  /**
   * Inicializa el router.
   * @param {string} containerId — ID del elemento <main>
   * @param {Object} moduleMap — Mapa de módulos: { nombre: { html, css, js } }
   */
  init(containerId, moduleMap) {
    this.container = document.getElementById(containerId);
    this.modules = moduleMap;

    // Escuchar cambios de hash
    window.addEventListener("hashchange", () => this._onHashChange());

    // Cargar módulo inicial
    this._onHashChange();
  },

  /**
   * Navega a un módulo programáticamente.
   * @param {string} moduleName
   */
  navigate(moduleName) {
    window.location.hash = `#${moduleName}`;
  },

  /**
   * Manejador del evento hashchange.
   * @private
   */
  async _onHashChange() {
    const hash = window.location.hash.replace("#", "") || "dashboard";
    const mod = this.modules[hash];

    if (!mod) {
      this.navigate("dashboard");
      return;
    }

    if (this.currentModule === hash) return;
    this.currentModule = hash;

    // Actualizar nav activo
    document.querySelectorAll("[data-module]").forEach((el) => {
      el.classList.toggle("active", el.dataset.module === hash);
    });

    try {
      // 1. Cargar HTML del módulo
      const response = await fetch(mod.html);
      if (!response.ok) throw new Error(`No se pudo cargar ${mod.html}`);
      const html = await response.text();
      this.container.innerHTML = html;

      // 2. Cargar CSS del módulo (solo una vez)
      if (mod.css && !this.loadedStyles.has(mod.css)) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = mod.css;
        document.head.appendChild(link);
        this.loadedStyles.add(mod.css);
      }

      // 3. Cargar y ejecutar JS del módulo
      if (mod.js) {
        // Eliminar script previo del mismo módulo si existe
        const existing = document.getElementById(`module-script-${hash}`);
        if (existing) existing.remove();

        const script = document.createElement("script");
        script.id = `module-script-${hash}`;
        script.src = `${mod.js}?t=${Date.now()}`; // Cache bust
        document.body.appendChild(script);
      }
    } catch (err) {
      console.error(`Error cargando módulo "${hash}":`, err);
      this.container.innerHTML = `
        <div style="text-align:center;padding:80px 24px;">
          <p style="font-size:48px;margin-bottom:16px;">⚠️</p>
          <h2 style="margin-bottom:8px;">Error al cargar</h2>
          <p style="color:var(--color-text-muted);">No se pudo cargar el módulo "${hash}". Intenta recargar la página.</p>
        </div>
      `;
    }
  },
};
