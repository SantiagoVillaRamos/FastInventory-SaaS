// F27-T01/T02/T03: App Shell con Sidebar + Header
// Ruta protegida: redirige al login si no hay token válido.
import React, { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/catalog',   icon: '📦', label: 'Catálogo' },
  { to: '/pos',       icon: '🛒', label: 'Punto de Venta' },
  { to: '/reports',   icon: '📈', label: 'Reportes' },
  { to: '/team',      icon: '👥', label: 'Equipo' },
];

export default function Layout() {
  const { isAuthenticated, logout, payload } = useAuth();
  const navigate = useNavigate();

  // F27-T09: Ruta protegida — redirigir al login si no hay token
  useEffect(() => {
    if (!isAuthenticated) navigate('/login', { replace: true });
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userName = payload?.sub || 'Usuario';
  const userRole = payload?.role || 'admin';

  return (
    <div className="min-h-screen flex bg-fi-bg">
      {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
      <aside className="fixed top-0 left-0 h-full w-64 bg-fi-navy flex flex-col z-30 shadow-xl">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
          <span className="text-2xl">⚡</span>
          <span className="text-white font-bold text-lg tracking-tight">FastInventory</span>
        </div>

        {/* Navegación */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-fi-blue text-white shadow-md shadow-fi-blue/30'
                    : 'text-slate-400 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer del sidebar — usuario + cerrar sesión */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-fi-blue flex items-center justify-center text-white text-sm font-bold">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-white text-sm font-medium truncate">{userName}</p>
              <p className="text-slate-400 text-xs capitalize">{userRole}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 text-sm transition-all"
          >
            <span>↩</span> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
      <div className="flex-1 ml-64 flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 bg-fi-surface/80 backdrop-blur-md border-b border-fi-border z-20 h-16 flex items-center px-8 justify-between">
          <div />
          <div className="flex items-center gap-2 text-sm text-fi-muted">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Sistema operativo
          </div>
        </header>

        {/* Contenido del módulo activo */}
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
