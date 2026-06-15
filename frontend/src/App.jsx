// DS-08 actualizado: App.jsx — Enrutador con Layout protegido y módulos F-25, F-26, F-27
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// ── Módulo F-25: Landing
import Landing from './pages/Landing';

// ── Módulo F-26: Login
import Login from './pages/Login';

// ── F-27: Layout protegido + Dashboard
import Layout    from './components/Layout';
import Dashboard from './pages/Dashboard';

// ── F-28: Catálogo
import Catalog from './pages/Catalog';

// ── F-30: Punto de Venta
import POS from './pages/POS';

// ── F-31: Reportes
import Reports from './pages/Reports';

// ── F-32: Compras y Reposición
import Purchases from './pages/Purchases';

// ── F-34: Ajustes e Impuestos
import Settings from './pages/Settings';

// Placeholder para módulos aún no construidos
const ComingSoon = ({ name }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
    <div className="text-6xl">🚧</div>
    <h2 className="text-xl font-bold text-fi-navy">{name}</h2>
    <p className="text-fi-muted text-sm">Este módulo se está construyendo.</p>
  </div>
);

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ── Rutas públicas ── */}
          <Route path="/"      element={<Landing />} />
          <Route path="/login" element={<Login />} />

          {/* ── Rutas protegidas (dentro del Layout) ── */}
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/catalog"   element={<Catalog />} />
            <Route path="/pos"       element={<POS />} />
            <Route path="/purchases" element={<Purchases />} />
            <Route path="/reports"   element={<Reports />} />
            <Route path="/settings"  element={<Settings />} />
            <Route path="/team"      element={<ComingSoon name="Equipo" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
