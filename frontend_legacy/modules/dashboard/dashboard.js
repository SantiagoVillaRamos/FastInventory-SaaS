/* ============================================================
   Dashboard Module JS — modules/dashboard/dashboard.js
   F-27: Dashboard principal
   Usa api.get() de core/js/api.js (AC-08)
   ============================================================ */

(function () {
  /* ── Constantes ──────────────────────────────────────────── */
  const LOW_STOCK_THRESHOLD = 5;
  const MAX_LOW_STOCK_ROWS  = 10;

  /* ── Elementos del DOM ───────────────────────────────────── */
  const subtitle      = document.getElementById("dashSubtitle");
  const errorBox      = document.getElementById("dashError");
  const errorText     = document.getElementById("dashErrorText");
  const retryBtn      = document.getElementById("dashRetryBtn");
  const kpiRevenueVal = document.getElementById("kpiRevenueVal");
  const kpiSalesVal   = document.getElementById("kpiSalesVal");
  const kpiProductsVal= document.getElementById("kpiProductsVal");
  const kpiTopVal     = document.getElementById("kpiTopVal");
  const stockSkeleton = document.getElementById("stockSkeleton");
  const stockTableWrap= document.getElementById("stockTableWrap");
  const stockTableBody= document.getElementById("stockTableBody");
  const stockEmpty    = document.getElementById("stockEmpty");

  /* ── Formatters ──────────────────────────────────────────── */
  function formatCurrency(amount) {
    return amount.toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }

  function truncate(str, max = 22) {
    return str.length > max ? str.substring(0, max) + "…" : str;
  }

  /* ── Estado de carga ─────────────────────────────────────── */
  function setLoading(loading) {
    [kpiRevenueVal, kpiSalesVal, kpiProductsVal, kpiTopVal].forEach((el) => {
      if (el) el.classList.toggle("dash-skeleton", loading);
    });
  }

  /* ── Mostrar error (AC-06) ───────────────────────────────── */
  function showError(message) {
    if (errorText) errorText.textContent = message;
    if (errorBox)  errorBox.hidden = false;
  }

  function hideError() {
    if (errorBox) errorBox.hidden = true;
  }

  /* ── Render KPI cards (AC-01, AC-02) ────────────────────── */
  function renderKPIs(report, productCount) {
    // Ingresos del día
    if (kpiRevenueVal) {
      kpiRevenueVal.textContent = formatCurrency(report.total_revenue);
      kpiRevenueVal.classList.remove("dash-skeleton");
    }

    // Ventas del día
    if (kpiSalesVal) {
      kpiSalesVal.textContent = report.total_sales > 0
        ? `${report.total_sales} ventas`
        : "Sin ventas hoy";
      kpiSalesVal.classList.remove("dash-skeleton");
    }

    // Productos en catálogo
    if (kpiProductsVal) {
      kpiProductsVal.textContent = `${productCount} productos`;
      kpiProductsVal.classList.remove("dash-skeleton");
    }

    // Top producto del día
    if (kpiTopVal) {
      if (report.items && report.items.length > 0) {
        // items viene ordenado por revenue del backend (el primero es el top)
        kpiTopVal.textContent = truncate(report.items[0].product_name);
      } else {
        kpiTopVal.textContent = "Sin ventas";
      }
      kpiTopVal.classList.remove("dash-skeleton");
    }

    // Subtitle con nombre del negocio
    if (subtitle && report.tenant_name) {
      const today = new Date().toLocaleDateString("es-CO", {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
      });
      subtitle.textContent = `${report.tenant_name} · ${today}`;
    }
  }

  /* ── Render tabla de stock bajo (AC-03, AC-04) ───────────── */
  function renderLowStock(products) {
    // Filtrar y ordenar por stock ASC
    const lowStock = products
      .filter((p) => p.stock <= LOW_STOCK_THRESHOLD)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, MAX_LOW_STOCK_ROWS);

    // Ocultar skeleton
    if (stockSkeleton) stockSkeleton.hidden = true;

    if (lowStock.length === 0) {
      // Estado vacío positivo (AC-04)
      if (stockEmpty) stockEmpty.hidden = false;
      return;
    }

    // Llenar tabla
    if (stockTableBody) {
      stockTableBody.innerHTML = lowStock.map((p) => {
        const isCritical = p.stock === 0;
        const badgeClass = isCritical ? "stock-badge--critical" : "stock-badge--low";
        const badgeLabel = isCritical ? "🔴 Agotado" : "🟡 Stock bajo";

        return `
          <tr>
            <td>${truncate(p.name, 30)}</td>
            <td><strong>${p.stock}</strong></td>
            <td>${p.unit}</td>
            <td><span class="stock-badge ${badgeClass}">${badgeLabel}</span></td>
          </tr>
        `;
      }).join("");
    }

    if (stockTableWrap) stockTableWrap.hidden = false;
  }

  /* ── Carga de datos ──────────────────────────────────────── */
  async function loadDashboard() {
    hideError();
    setLoading(true);

    // Reset tabla
    if (stockSkeleton) stockSkeleton.hidden = false;
    if (stockTableWrap) stockTableWrap.hidden = true;
    if (stockEmpty) stockEmpty.hidden = true;

    try {
      // AC-08: Solo se usa api.get(), no fetch() directamente
      const [report, products] = await Promise.all([
        api.get("/reports/daily"),
        api.get("/products"),
      ]);

      setLoading(false);
      renderKPIs(report, products.length);
      renderLowStock(products);
    } catch (err) {
      setLoading(false);
      if (stockSkeleton) stockSkeleton.hidden = true;

      // AC-07: 401 es manejado automáticamente por api.js (llama a auth.logout())
      // AC-06: Otros errores se muestran aquí
      if (err.status !== 401) {
        const message = err.status === 0
          ? "No se pudo conectar con el servidor. Verifica que el backend está corriendo."
          : `Error al cargar el dashboard (${err.status || "desconocido"}).`;
        showError(message);
      }
    }
  }

  /* ── Botón reintentar (AC-06) ────────────────────────────── */
  if (retryBtn) {
    retryBtn.addEventListener("click", loadDashboard);
  }

  /* ── Inicializar ─────────────────────────────────────────── */
  loadDashboard();
})();
