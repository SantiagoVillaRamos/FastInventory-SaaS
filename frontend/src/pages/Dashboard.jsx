// F27-T04 a T11: Dashboard Principal — KPI Cards + Tabla de Stock Bajo
import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

// ── Helpers ────────────────────────────────────────────────────────────────
const formatCOP = (value) =>
  Number(value || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

// F27-T04: Badges de estado de stock
const StockBadge = ({ stock }) => {
  if (stock === 0)  return <span className="fi-badge-danger">🔴 Agotado</span>;
  if (stock <= 5)   return <span className="fi-badge-warning">🟡 Stock bajo</span>;
  return <span className="fi-badge-success">✅ OK</span>;
};

// F27-T09: Skeleton de carga
const KpiSkeleton = () => (
  <div className="fi-card p-6 animate-pulse">
    <div className="h-3 w-24 bg-slate-200 rounded mb-4" />
    <div className="h-8 w-32 bg-slate-200 rounded mb-2" />
    <div className="h-3 w-16 bg-slate-100 rounded" />
  </div>
);

// ── Componente KPI Card ────────────────────────────────────────────────────
function KpiCard({ label, value, icon, color }) {
  return (
    <div className={`fi-card p-6 border-l-4 ${color}`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-fi-muted text-sm font-medium">{label}</p>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-3xl font-bold text-fi-navy">{value}</p>
    </div>
  );
}

// ── Dashboard Principal ────────────────────────────────────────────────────
export default function Dashboard() {
  const [report, setReport]     = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  // F27-T07/T08: loadReport() — GET /reports/daily
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [reportRes, productsRes] = await Promise.all([
        api.get('/reports/daily'),
        api.get('/products/'),
      ]);
      setReport(reportRes.data);
      setProducts(productsRes.data);
    } catch {
      setError('No se pudo conectar con el servidor. Verifica que el backend esté corriendo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // F27-T08: Productos con stock bajo (umbral ≤ 5, definido en specs F-27)
  const lowStock = products
    .filter((p) => p.stock <= 5)
    .sort((a, b) => a.stock - b.stock);

  // ── Estado de error (F27-T10)
  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="text-5xl">⚠️</div>
      <p className="text-fi-muted text-center">{error}</p>
      <button onClick={loadData} className="fi-btn-secondary w-auto px-8">Reintentar</button>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-fi-navy">Dashboard</h1>
        <p className="text-fi-muted text-sm mt-1">Resumen de actividad del día</p>
      </div>

      {/* ── KPI Cards (F27-T04) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : (
          <>
            <KpiCard
              label="Ingresos de Hoy"
              value={formatCOP(report?.total_revenue ?? report?.total_sales)}
              icon="💰"
              color="border-fi-blue"
            />
            <KpiCard
              label="Transacciones"
              value={report?.total_transactions ?? report?.sales_count ?? 0}
              icon="🛒"
              color="border-emerald-500"
            />
            <KpiCard
              label="Productos Activos"
              value={products.length}
              icon="📦"
              color="border-violet-500"
            />
            <KpiCard
              label="Alertas de Stock"
              value={lowStock.length}
              icon={lowStock.length > 0 ? '🔴' : '✅'}
              color={lowStock.length > 0 ? 'border-red-500' : 'border-green-500'}
            />
          </>
        )}
      </div>

      {/* ── Tabla de Stock Bajo (F27-T05) ── */}
      <div className="fi-card overflow-hidden">
        <div className="px-6 py-4 border-b border-fi-border">
          <h2 className="text-base font-semibold text-fi-navy">
            Productos con Stock Bajo
          </h2>
          <p className="text-xs text-fi-muted mt-0.5">Umbral: stock ≤ 5 unidades</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="fi-spinner w-8 h-8" />
          </div>
        ) : lowStock.length === 0 ? (
          // F27-T11: Estado vacío positivo
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="text-5xl">🎉</div>
            <p className="font-semibold text-fi-navy">¡Todo el stock está en buen estado!</p>
            <p className="text-fi-muted text-sm">No hay productos por debajo del umbral.</p>
          </div>
        ) : (
          <table className="fi-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Stock actual</th>
                <th>Estado</th>
                <th>Precio</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium text-fi-navy">{p.name}</td>
                  <td className="text-fi-muted">{p.category_name || p.category?.name || '—'}</td>
                  <td className="font-bold text-fi-navy">{p.stock} {p.unit}</td>
                  <td><StockBadge stock={p.stock} /></td>
                  <td className="text-fi-muted">{formatCOP(p.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
