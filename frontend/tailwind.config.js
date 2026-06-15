/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Design Tokens FastInventory ───────────────────────────────────
        'fi-navy':    '#0f172a',   // Sidebar, nav, encabezados estructurales
        'fi-blue':    '#2563eb',   // CTA primario, botones de acción
        'fi-blue-lt': '#3b82f6',   // Hover, estados activos, links
        'fi-sky':     '#eff6ff',   // Panel decorativo (degradado base)
        'fi-surface': '#ffffff',   // Fondo de tarjetas y formularios
        'fi-bg':      '#f8fafc',   // Fondo general (slate-50)
        'fi-border':  '#e2e8f0',   // Bordes sutiles (slate-200)
        'fi-text':    '#0f172a',   // Texto principal
        'fi-muted':   '#64748b',   // Texto secundario (slate-500)
        'fi-danger':  '#dc2626',   // Errores y alertas
        'fi-success': '#16a34a',   // Éxito y confirmaciones
        'fi-warning': '#d97706',   // Advertencias (stock bajo)
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'fi-card': '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)',
        'fi-modal': '0 20px 60px -10px rgb(0 0 0 / 0.2)',
      },
    },
  },
  plugins: [],
}
