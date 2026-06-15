import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

export default function Settings() {
  const [form, setForm] = useState({
    name: '',
    default_vat_rate: 0,
    default_retention_rate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // F-35: Estado de sucursales
  const [branches, setBranches] = useState([]);
  const [newBranch, setNewBranch] = useState({ name: '', address: '' });
  const [branchSaving, setBranchSaving] = useState(false);
  const [branchMsg, setBranchMsg] = useState('');

  const loadBranches = useCallback(async () => {
    try {
      const res = await api.get('/branches/');
      setBranches(res.data);
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await api.get('/tenants/me');
        setForm({
          name: res.data.name,
          default_vat_rate: res.data.default_vat_rate * 100,
          default_retention_rate: res.data.default_retention_rate * 100,
        });
      } catch (err) {
        setError('No se pudo cargar la configuración.');
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
    loadBranches();
  }, [loadBranches]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        name: form.name,
        default_vat_rate: parseFloat(form.default_vat_rate) / 100,
        default_retention_rate: parseFloat(form.default_retention_rate) / 100,
      };
      await api.patch('/tenants/me', payload);
      setSuccess('Configuración de empresa guardada con éxito.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar la configuración.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    setBranchSaving(true);
    setBranchMsg('');
    try {
      await api.post('/branches/', newBranch);
      setNewBranch({ name: '', address: '' });
      setBranchMsg('✅ Sucursal creada.');
      await loadBranches();
    } catch (err) {
      setBranchMsg(`❌ ${err.response?.data?.detail || 'Error al crear la sucursal.'}`);
    } finally {
      setBranchSaving(false);
    }
  };

  const handleToggleBranch = async (branch) => {
    try {
      await api.patch(`/branches/${branch.id}`, { is_active: !branch.is_active });
      await loadBranches();
    } catch { /* silencioso */ }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="fi-spinner w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fi-navy">Ajustes de Empresa</h1>
        <p className="text-fi-muted text-sm mt-1">Configura la información, impuestos y sucursales de tu negocio.</p>
      </div>

      {/* Motor de Impuestos */}
      <div className="fi-card p-6">
        <h2 className="text-base font-bold text-fi-navy mb-4">⚙️ Motor de Impuestos</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          {success && <p className="text-green-600 text-sm bg-green-50 p-3 rounded-lg border border-green-200">✅ {success}</p>}
          {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">❌ {error}</p>}

          <div>
            <label className="block text-sm font-semibold text-fi-navy mb-1.5">Nombre de la Empresa</label>
            <input
              required
              type="text"
              className="fi-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Mi Negocio SaaS"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-fi-navy mb-1.5">Tasa IVA General (%)</label>
              <div className="relative">
                <input
                  required type="number" step="0.01" min="0" max="100"
                  className="fi-input pr-10"
                  value={form.default_vat_rate}
                  onChange={(e) => setForm({ ...form, default_vat_rate: e.target.value })}
                  placeholder="19"
                />
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-fi-muted pointer-events-none">%</span>
              </div>
              <p className="text-xs text-fi-muted mt-1">IVA por defecto para productos gravados.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-fi-navy mb-1.5">Retención en la Fuente (%)</label>
              <div className="relative">
                <input
                  required type="number" step="0.01" min="0" max="100"
                  className="fi-input pr-10"
                  value={form.default_retention_rate}
                  onChange={(e) => setForm({ ...form, default_retention_rate: e.target.value })}
                  placeholder="0"
                />
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-fi-muted pointer-events-none">%</span>
              </div>
              <p className="text-xs text-fi-muted mt-1">Se descuenta del subtotal en cada venta.</p>
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button type="submit" disabled={saving} className="fi-btn-primary w-auto px-8">
              {saving ? 'Guardando...' : 'Guardar Ajustes'}
            </button>
          </div>
        </form>
      </div>

      {/* F-35: Gestión de Sucursales */}
      <div className="fi-card p-6 space-y-5">
        <h2 className="text-base font-bold text-fi-navy">🏪 Sucursales</h2>

        {/* Lista */}
        <div className="space-y-2">
          {branches.length === 0 ? (
            <p className="text-fi-muted text-sm">No hay sucursales registradas.</p>
          ) : branches.map((b) => (
            <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-fi-bg border border-fi-border">
              <div>
                <p className="font-medium text-fi-navy text-sm">{b.name}</p>
                {b.address && <p className="text-xs text-fi-muted">{b.address}</p>}
              </div>
              <button
                onClick={() => handleToggleBranch(b)}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${
                  b.is_active
                    ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700'
                    : 'bg-slate-100 text-slate-500 hover:bg-green-100 hover:text-green-700'
                }`}
              >
                {b.is_active ? 'Activa' : 'Inactiva'}
              </button>
            </div>
          ))}
        </div>

        {/* Formulario nueva sucursal */}
        <form onSubmit={handleCreateBranch} className="space-y-3 border-t border-fi-border pt-4">
          <p className="text-sm font-semibold text-fi-navy">Añadir sucursal</p>
          {branchMsg && (
            <p className={`text-sm p-2 rounded-lg ${branchMsg.startsWith('✅') ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
              {branchMsg}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <input
              required
              type="text"
              placeholder="Nombre (ej. Sucursal Norte)"
              className="fi-input"
              value={newBranch.name}
              onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
            />
            <input
              type="text"
              placeholder="Dirección (opcional)"
              className="fi-input"
              value={newBranch.address}
              onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
            />
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={branchSaving} className="fi-btn-primary w-auto px-6">
              {branchSaving ? 'Creando...' : '+ Nueva Sucursal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
