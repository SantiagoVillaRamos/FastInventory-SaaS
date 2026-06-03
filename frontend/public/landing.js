/* ============================================================
   FastInventory SaaS — Frontend App Logic
   F-25: Landing Page + Registro de Tenant
   ============================================================ */

// ── Configuración ────────────────────────────────────────────
const API_BASE = "http://localhost:8000";  // En producción: cambiar a URL de Render

// ── Utilidades ───────────────────────────────────────────────

/**
 * Muestra un error en el campo de formulario correspondiente.
 * @param {string} fieldName - ID del campo (sin el prefijo "error-")
 * @param {string} message   - Mensaje de error a mostrar
 */
function setFieldError(fieldName, message) {
  const group = document.getElementById(`group-${fieldName}`);
  const error = document.getElementById(`error-${fieldName}`);
  if (!group || !error) return;
  group.classList.remove("has-success");
  group.classList.add("has-error");
  error.textContent = message;
}

/**
 * Marca un campo como válido (limpia el error).
 * @param {string} fieldName
 */
function setFieldValid(fieldName) {
  const group = document.getElementById(`group-${fieldName}`);
  const error = document.getElementById(`error-${fieldName}`);
  if (!group || !error) return;
  group.classList.remove("has-error");
  group.classList.add("has-success");
  error.textContent = "";
}

/**
 * Limpia todos los errores del formulario.
 */
function clearErrors() {
  const fields = ["business_name", "slug", "admin_name", "admin_email", "admin_password"];
  fields.forEach(f => {
    const group = document.getElementById(`group-${f}`);
    const error = document.getElementById(`error-${f}`);
    if (group) group.classList.remove("has-error", "has-success");
    if (error) error.textContent = "";
  });
}

/**
 * Pone el botón de submit en estado cargando o normal.
 * @param {boolean} loading
 */
function setLoading(loading) {
  const btn = document.getElementById("submitBtn");
  const text = btn.querySelector(".btn__text");
  const spinner = btn.querySelector(".btn__spinner");
  btn.disabled = loading;
  text.hidden = loading;
  spinner.hidden = !loading;
}

// ── Validación local (frontend) ───────────────────────────────

/**
 * Valida todos los campos del formulario en el cliente.
 * Retorna true si todo es válido, false si hay errores.
 * @param {Object} data - Datos del formulario
 * @returns {boolean}
 */
function validateForm(data) {
  let isValid = true;
  clearErrors();

  // Nombre del negocio
  if (!data.business_name || data.business_name.trim().length < 2) {
    setFieldError("business_name", "El nombre debe tener al menos 2 caracteres.");
    isValid = false;
  }

  // Slug
  const slugRegex = /^[a-z0-9-]+$/;
  if (!data.slug || data.slug.length < 2) {
    setFieldError("slug", "El identificador debe tener al menos 2 caracteres.");
    isValid = false;
  } else if (!slugRegex.test(data.slug)) {
    setFieldError("slug", "Solo letras minúsculas, números y guiones. Sin espacios.");
    isValid = false;
  }

  // Nombre del admin
  if (!data.admin_name || data.admin_name.trim().length < 2) {
    setFieldError("admin_name", "Tu nombre debe tener al menos 2 caracteres.");
    isValid = false;
  }

  // Email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.admin_email || !emailRegex.test(data.admin_email)) {
    setFieldError("admin_email", "Ingresa un correo electrónico válido.");
    isValid = false;
  }

  // Password
  if (!data.admin_password || data.admin_password.length < 8) {
    setFieldError("admin_password", "La contraseña debe tener al menos 8 caracteres.");
    isValid = false;
  }

  return isValid;
}

// ── Indicador de fortaleza de contraseña ─────────────────────
const passwordInput = document.getElementById("admin_password");
const strengthFill  = document.getElementById("strengthFill");
const strengthLabel = document.getElementById("strengthLabel");

if (passwordInput) {
  passwordInput.addEventListener("input", () => {
    const value = passwordInput.value;
    let score = 0;

    if (value.length >= 8) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/[0-9]/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;

    const levels = [
      { pct: "0%",   color: "transparent",         label: "" },
      { pct: "25%",  color: "#ef4444",             label: "Débil" },
      { pct: "50%",  color: "#f59e0b",             label: "Regular" },
      { pct: "75%",  color: "#6366f1",             label: "Buena" },
      { pct: "100%", color: "#10b981",             label: "Fuerte" },
    ];

    const level = levels[score] || levels[0];
    strengthFill.style.width = value.length > 0 ? level.pct : "0%";
    strengthFill.style.background = level.color;
    strengthLabel.textContent = value.length > 0 ? level.label : "";
  });
}

// ── Toggle mostrar/ocultar contraseña ─────────────────────────
const togglePassword = document.getElementById("togglePassword");
if (togglePassword && passwordInput) {
  togglePassword.addEventListener("click", () => {
    const isPassword = passwordInput.type === "password";
    passwordInput.type = isPassword ? "text" : "password";
    togglePassword.textContent = isPassword ? "🙈" : "👁";
  });
}

// ── Auto-slug desde el nombre del negocio ─────────────────────
const businessNameInput = document.getElementById("business_name");
const slugInput = document.getElementById("slug");
let slugTouched = false;

if (slugInput) {
  slugInput.addEventListener("input", () => { slugTouched = true; });
}

if (businessNameInput && slugInput) {
  businessNameInput.addEventListener("input", () => {
    if (slugTouched) return;
    const suggested = businessNameInput.value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")  // quitar tildes
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .substring(0, 60);
    slugInput.value = suggested;
  });
}

// ── Modal de éxito ────────────────────────────────────────────
const successModal = document.getElementById("successModal");
const modalBody    = document.getElementById("modalBody");
const modalClose   = document.getElementById("modalClose");

function showSuccessModal(tenantData, email) {
  modalBody.textContent =
    `¡${tenantData.name} ya está en FastInventory! Usa el correo "${email}" y tu contraseña para acceder a la API desde Swagger. Tu identificador es: "${tenantData.slug}".`;
  successModal.hidden = false;
  document.body.style.overflow = "hidden";
}

function hideModal() {
  successModal.hidden = true;
  document.body.style.overflow = "";
}

if (modalClose) modalClose.addEventListener("click", hideModal);
if (successModal) {
  successModal.addEventListener("click", (e) => {
    if (e.target === successModal) hideModal();
  });
}

// ── Submit del formulario ─────────────────────────────────────
const registerForm = document.getElementById("registerForm");

if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
      business_name: document.getElementById("business_name")?.value.trim(),
      slug:          document.getElementById("slug")?.value.trim(),
      plan:          document.getElementById("plan")?.value,
      admin_email:   document.getElementById("admin_email")?.value.trim(),
      admin_name:    document.getElementById("admin_name")?.value.trim(),
      admin_password: document.getElementById("admin_password")?.value,
    };

    // Validar en el frontend primero
    if (!validateForm(data)) return;

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        // ✅ Registro exitoso
        registerForm.reset();
        slugTouched = false;
        clearErrors();
        showSuccessModal(result, data.admin_email);
      } else {
        // ⚠️ Error del servidor (400, 422, etc.)
        handleApiError(response.status, result);
      }
    } catch (err) {
      // ❌ Error de red
      console.error("Error de red:", err);
      showNetworkError();
    } finally {
      setLoading(false);
    }
  });
}

/**
 * Maneja errores específicos devueltos por la API.
 * @param {number} status - Código HTTP
 * @param {Object} result - Body de la respuesta
 */
function handleApiError(status, result) {
  const detail = result?.detail || "";

  if (status === 400) {
    const detailLower = detail.toLowerCase();
    if (detailLower.includes("slug")) {
      setFieldError("slug", "Este identificador ya está en uso. Prueba con otro.");
    } else if (detailLower.includes("correo") || detailLower.includes("email")) {
      setFieldError("admin_email", "Este correo ya está registrado. ¿Ya tienes cuenta?");
    } else {
      showGlobalError(detail || "Error en el registro. Por favor revisa tus datos.");
    }
    return;
  }

  if (status === 422) {
    // Errores de validación de Pydantic
    const errors = result?.detail;
    if (Array.isArray(errors)) {
      errors.forEach((err) => {
        const field = err.loc?.[err.loc.length - 1];
        const msg   = err.msg?.replace("Value error, ", "") || "Campo inválido.";
        if (field) setFieldError(field, msg);
      });
    } else {
      showGlobalError("Datos inválidos. Revisa los campos marcados.");
    }
    return;
  }

  showGlobalError(`Error inesperado (${status}). Por favor intenta de nuevo.`);
}

function showNetworkError() {
  showGlobalError("No se pudo conectar con el servidor. Verifica tu conexión.");
}

function showGlobalError(message) {
  // Muestra el error junto al botón de submit
  const existing = document.getElementById("globalError");
  if (existing) existing.remove();

  const div = document.createElement("p");
  div.id = "globalError";
  div.style.cssText = "color:#ef4444;font-size:13px;text-align:center;margin-bottom:12px;";
  div.textContent = message;

  const submitBtn = document.getElementById("submitBtn");
  submitBtn.parentNode.insertBefore(div, submitBtn);
}

// ── Nav scroll effect ─────────────────────────────────────────
window.addEventListener("scroll", () => {
  const nav = document.getElementById("nav");
  if (nav) {
    nav.style.background = window.scrollY > 60
      ? "rgba(255,255,255,1)"
      : "rgba(255,255,255,0.92)";
  }
}, { passive: true });
