import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await api.get('/tenants/me');
        setForm({
          name: res.data.name,
          default_vat_rate: res.data.default_vat_rate * 100, // Mostrar como porcentaje
          default_retention_rate: res.data.default_retention_rate * 100,
        });
      } catch (err) {
        setError('No se pudo cargar la configuración.');
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        name: form.name,
        default_vat_rate: parseFloat(form.default_vat_rate) / 100, // Guardar como tasa decimal
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="fi-spinner w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fi-navy">Ajustes de Empresa</h1>
        <p className="text-fi-muted text-sm mt-1">Configura la información y el motor de impuestos de tu negocio.</p>
      </div>

      <div className="fi-card p-6">
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
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
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
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
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
            <button
              type="submit"
              disabled={saving}
              className="fi-btn-primary w-auto px-8"
            >
              {saving ? 'Guardando...' : 'Guardar Ajustes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
