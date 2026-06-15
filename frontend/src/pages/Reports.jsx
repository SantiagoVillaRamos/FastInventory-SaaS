// F31-T01 a T07: Panel de Reportes con KPI Cards, AreaChart y tabla de historial
import React, { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';
import api from '../api/axios';

// ── Helpers ────────────────────────────────────────────────────────────────
const formatCOP = (v) =>
  Number(v || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatTime = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
};

// ── Skeleton de KPI ────────────────────────────────────────────────────────
const KpiSkeleton = () => (
  <div className="fi-card p-6 animate-pulse">
    <div className="h-3 w-24 bg-slate-200 rounded mb-4" />
    <div className="h-8 w-32 bg-slate-200 rounded mb-2" />
    <div className="h-3 w-16 bg-slate-100 rounded" />
  </div>
);

// ── KPI Card ───────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon, accent }) {
  const borders = {
    blue:   'border-fi-blue',
    green:  'border-emerald-500',
    violet: 'border-violet-500',
    amber:  'border-amber-500',
  };
  return (
    <div className={`fi-card p-6 border-l-4 ${borders[accent] || 'border-fi-blue'}`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-fi-muted text-sm font-medium">{label}</p>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-3xl font-bold text-fi-navy">{value}</p>
    </div>
  );
}

// ── Tooltip personalizado del gráfico ─────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="fi-card px-4 py-3 text-sm shadow-lg">
        <p className="font-semibold text-fi-navy mb-1">{label}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: {p.name === 'Ingresos' ? formatCOP(p.value) : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

// ── Panel de Reportes ──────────────────────────────────────────────────────
export default function Reports() {
  const [report, setReport]   = useState(null);
  const [sales, setSales]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  // F31-T03: Carga simultánea de /reports/daily y /sales/
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [reportRes, salesRes] = await Promise.all([
        api.get('/reports/daily'),
        api.get('/sales/'),
      ]);
      setReport(reportRes.data);
      setSales(Array.isArray(salesRes.data) ? salesRes.data : []);
    } catch {
      setError('No se pudo cargar el reporte. Verifica la conexión con el backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleExportSales = async (format) => {
    try {
      const response = await api.get(`/reports/export/sales/${format}`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ventas-reporte.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error al exportar ventas:', err);
      alert('No se pudo exportar el historial de ventas.');
    }
  };

  // F31-T05: Preparar datos para el AreaChart agrupados por fecha
  const chartData = React.useMemo(() => {
    if (!sales.length) return [];
    const grouped = {};
    sales.forEach((sale) => {
      const date = formatDate(sale.created_at || sale.date);
      if (!grouped[date]) grouped[date] = { date, Ingresos: 0, Ventas: 0 };
      grouped[date].Ingresos += parseFloat(sale.total || 0);
      grouped[date].Ventas   += 1;
    });
    return Object.values(grouped).slice(-14); // últimos 14 días
  }, [sales]);

  // Métricas derivadas de /reports/daily y /sales/
  const totalRevenue  = report?.total_revenue  ?? report?.total_sales  ?? 0;
  const totalTx       = report?.total_transactions ?? report?.sales_count ?? sales.length;
  const avgTicket     = totalTx > 0 ? totalRevenue / totalTx : 0;

  // ── Error state ───────────────────────────────────────────────────────
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
        <h1 className="text-2xl font-bold text-fi-navy">Reportes</h1>
        <p className="text-fi-muted text-sm mt-1">Resumen de ingresos y transacciones</p>
      </div>

      {/* F31-T03: KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : (
          <>
            <KpiCard label="Ingresos de Hoy"         value={formatCOP(totalRevenue)} icon="💰" accent="blue" />
            <KpiCard label="Número de Transacciones" value={totalTx}                 icon="🛒" accent="green" />
            <KpiCard label="Ticket Promedio"          value={formatCOP(avgTicket)}   icon="📊" accent="violet" />
          </>
        )}
      </div>

      {/* F31-T05: Gráfico AreaChart */}
      <div className="fi-card p-6">
        <div className="mb-6">
          <h2 className="text-base font-semibold text-fi-navy">Ingresos por Día</h2>
          <p className="text-xs text-fi-muted mt-0.5">Últimas 2 semanas</p>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="fi-spinner w-8 h-8" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2">
            <p className="text-4xl">📉</p>
            <p className="text-fi-muted text-sm">No hay datos de ventas para graficar aún.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="Ingresos"
                stroke="#2563eb"
                strokeWidth={2}
                fill="url(#colorIngresos)"
                dot={{ r: 3, fill: '#2563eb' }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* F31-T06: Gráfico de barras — Ventas por día */}
      <div className="fi-card p-6">
        <div className="mb-6">
          <h2 className="text-base font-semibold text-fi-navy">Número de Transacciones por Día</h2>
        </div>
        {!loading && chartData.length > 0 && (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Ventas" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* F31-T07: Tabla de historial de transacciones */}
      <div className="fi-card overflow-hidden">
        <div className="px-6 py-4 border-b border-fi-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-base font-semibold text-fi-navy">Historial de Transacciones</h2>
            <p className="text-xs text-fi-muted mt-0.5">{sales.length} transacciones registradas</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleExportSales('csv')} className="fi-btn-secondary w-auto px-3 py-2 text-sm flex items-center gap-1" title="Exportar Ventas a CSV">
              📥 CSV
            </button>
            <button onClick={() => handleExportSales('xlsx')} className="fi-btn-secondary w-auto px-3 py-2 text-sm flex items-center gap-1" title="Exportar Ventas a Excel">
              📥 Excel
            </button>
          </div>
        </div>


        {loading ? (
          <div className="flex justify-center py-12"><div className="fi-spinner w-7 h-7" /></div>
        ) : sales.length === 0 ? (
          <div className="py-12 text-center text-fi-muted text-sm">No hay transacciones registradas aún.</div>
        ) : (
          <table className="fi-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Fecha</th>
                <th>Hora</th>
                <th>N° Ítems</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {[...sales].reverse().slice(0, 50).map((sale, idx) => (
                <tr key={sale.id || idx}>
                  <td className="text-fi-muted text-xs font-mono">{sale.id || idx + 1}</td>
                  <td className="text-fi-navy font-medium">{formatDate(sale.created_at || sale.date)}</td>
                  <td className="text-fi-muted">{formatTime(sale.created_at || sale.date)}</td>
                  <td>
                    <span className="fi-badge-success">
                      {sale.items?.length ?? sale.item_count ?? '—'} ítems
                    </span>
                  </td>
                  <td className="font-bold text-fi-navy">{formatCOP(sale.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
