/* ============================================================
   Dashboard Module JS — modules/dashboard/dashboard.js
   ============================================================ */

(function () {
  const payload = auth.getPayload();
  if (!payload) return;

  const roleMap = { admin: "Administrador", employee: "Empleado", superadmin: "Super Admin" };
  const roleName = roleMap[payload.role] || payload.role;

  const roleEl = document.getElementById("dashRole");
  const tenantEl = document.getElementById("dashTenant");
  const expiresEl = document.getElementById("dashExpires");

  if (roleEl) roleEl.textContent = roleName;

  if (tenantEl) {
    const tid = payload.tenant_id || "Sin tenant";
    tenantEl.textContent = tid.length > 12 ? tid.substring(0, 12) + "…" : tid;
    tenantEl.title = tid;
  }

  if (expiresEl) {
    const minutes = auth.getMinutesRemaining();
    expiresEl.textContent = minutes !== null ? `${minutes} minutos` : "Desconocido";
  }
})();
