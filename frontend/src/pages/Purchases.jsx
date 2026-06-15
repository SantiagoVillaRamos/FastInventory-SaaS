// F32-T16: Página de Compras y Reposición de Inventario
import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

// ── Helpers ────────────────────────────────────────────────────────────────
const formatCOP = (v) =>
  Number(v || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

// ── Modal reutilizable ─────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="fi-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="fi-modal max-w-2xl w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-fi-border">
          <h3 className="text-base font-semibold text-fi-navy">{title}</h3>
          <button onClick={onClose} className="text-fi-muted hover:text-fi-navy text-xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-5 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// ── Fila de ítem en el formulario ──────────────────────────────────────────
function ItemRow({ item, index, products, onChange, onRemove }) {
  return (
    <div className="grid grid-cols-12 gap-3 items-end">
      <div className="col-span-5">
        {index === 0 && <label className="block text-xs font-medium text-fi-muted mb-1">Producto *</label>}
        <select
          required
          className="fi-input"
          value={item.product_id}
          onChange={(e) => onChange(index, 'product_id', e.target.value)}
        >
          <option value="">Seleccionar...</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name} (stock: {p.stock})</option>
          ))}
        </select>
      </div>
      <div className="col-span-3">
        {index === 0 && <label className="block text-xs font-medium text-fi-muted mb-1">Cantidad *</label>}
        <input
          required type="number" min="1"
          className="fi-input"
          placeholder="Unidades"
          value={item.quantity}
          onChange={(e) => onChange(index, 'quantity', e.target.value)}
        />
      </div>
      <div className="col-span-3">
        {index === 0 && <label className="block text-xs font-medium text-fi-muted mb-1">Costo unit. *</label>}
        <input
          required type="number" min="0.01" step="0.01"
          className="fi-input"
          placeholder="0.00"
          value={item.unit_cost}
          onChange={(e) => onChange(index, 'unit_cost', e.target.value)}
        />
      </div>
      <div className="col-span-1 flex items-end pb-0.5">
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="text-red-400 hover:text-red-600 text-lg font-bold leading-none"
          title="Quitar ítem"
        >×</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Página principal de Compras ───────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
const EMPTY_ITEM = () => ({ product_id: '', quantity: '', unit_cost: '' });

export default function Purchases() {
  const [orders, setOrders]     = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [modal, setModal]       = useState(null); // null | 'create' | 'detail'
  const [detail, setDetail]     = useState(null);
  const [saving, setSaving]     = useState(false);
  const [formError, setFormError] = useState('');

  // Formulario de nueva orden
  const [form, setForm] = useState({
    supplier_name: '',
    notes: '',
    items: [EMPTY_ITEM()],
  });

  // Cargar órdenes y productos simultáneamente
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ordersRes, productsRes] = await Promise.all([
        api.get('/purchases/'),
        api.get('/products/'),
      ]);
      setOrders(ordersRes.data);
      setProducts(productsRes.data);
    } catch {
      setError('No se pudo cargar la información. Verifica la conexión con el backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Formulario dinámico de ítems ──
  const handleItemChange = (idx, field, value) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], [field]: value };
      return { ...prev, items };
    });
  };
  const addItem    = () => setForm((prev) => ({ ...prev, items: [...prev.items, EMPTY_ITEM()] }));
  const removeItem = (idx) => setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));

  // ── Resumen del costo total estimado ──
  const estimatedTotal = form.items.reduce((acc, i) => {
    const qty = parseFloat(i.quantity) || 0;
    const cost = parseFloat(i.unit_cost) || 0;
    return acc + qty * cost;
  }, 0);

  // ── Abrir modal de detalle ──
  const openDetail = async (id) => {
    try {
      const res = await api.get(`/purchases/${id}`);
      setDetail(res.data);
      setModal('detail');
    } catch {
      alert('No se pudo cargar el detalle de la orden.');
    }
  };

  const openCreate = () => {
    setForm({ supplier_name: '', notes: '', items: [EMPTY_ITEM()] });
    setFormError('');
    setModal('create');
  };

  const closeModal = () => { setModal(null); setDetail(null); setFormError(''); };

  // ── Crear nueva orden ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        supplier_name: form.supplier_name || null,
        notes: form.notes || null,
        items: form.items.map((i) => ({
          product_id: i.product_id,
          quantity: parseInt(i.quantity, 10),
          unit_cost: parseFloat(i.unit_cost),
        })),
      };
      await api.post('/purchases/', payload);
      await loadData();
      closeModal();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Error al registrar la orden de compra.');
    } finally {
      setSaving(false);
    }
  };

  // ── Error state ──
  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="text-5xl">⚠️</div>
      <p className="text-fi-muted text-center">{error}</p>
      <button onClick={loadData} className="fi-btn-secondary w-auto px-8">Reintentar</button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fi-navy">Compras y Reposición</h1>
          <p className="text-fi-muted text-sm mt-1">Registra entradas de mercancía para reponer el inventario</p>
        </div>
        <button onClick={openCreate} className="fi-btn-primary w-auto px-5 py-2.5">
          + Nueva Orden de Compra
        </button>
      </div>

      {/* Tabla de historial */}
      <div className="fi-card overflow-hidden">
        <div className="px-6 py-4 border-b border-fi-border">
          <h2 className="text-base font-semibold text-fi-navy">Historial de Órdenes</h2>
          <p className="text-xs text-fi-muted mt-0.5">{orders.length} órdenes registradas</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="fi-spinner w-7 h-7" /></div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="text-5xl">📦</div>
            <p className="font-semibold text-fi-navy">Aún no hay órdenes registradas</p>
            <p className="text-fi-muted text-sm">Crea tu primera orden de compra para reponer stock.</p>
          </div>
        ) : (
          <table className="fi-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Proveedor</th>
                <th>N° Ítems</th>
                <th>Costo Total</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="text-fi-muted text-sm">{formatDate(o.created_at)}</td>
                  <td className="font-medium text-fi-navy">{o.supplier_name || <span className="text-fi-muted italic text-sm">Sin proveedor</span>}</td>
                  <td>
                    <span className="fi-badge-success">{o.items_count} {o.items_count === 1 ? 'ítem' : 'ítems'}</span>
                  </td>
                  <td className="font-bold text-fi-navy">{formatCOP(o.total_cost)}</td>
                  <td>
                    <button onClick={() => openDetail(o.id)} className="text-fi-blue hover:underline text-sm">
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modal: Nueva Orden de Compra ── */}
      {modal === 'create' && (
        <Modal title="Nueva Orden de Compra" onClose={closeModal}>
          <form onSubmit={handleSubmit} className="space-y-5">
            {formError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{formError}</div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Proveedor</label>
                <input
                  className="fi-input"
                  placeholder="Nombre del proveedor (opcional)"
                  value={form.supplier_name}
                  onChange={(e) => setForm({ ...form, supplier_name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Notas</label>
                <input
                  className="fi-input"
                  placeholder="Observaciones opcionales"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>

            {/* Ítems dinámicos */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-fi-navy">Productos a ingresar</label>
                <button type="button" onClick={addItem} className="text-fi-blue text-sm hover:underline">
                  + Agregar producto
                </button>
              </div>
              <div className="space-y-3">
                {form.items.map((item, idx) => (
                  <ItemRow
                    key={idx}
                    index={idx}
                    item={item}
                    products={products}
                    onChange={handleItemChange}
                    onRemove={removeItem}
                  />
                ))}
              </div>
            </div>

            {/* Resumen estimado */}
            <div className="bg-fi-bg rounded-xl p-4 border border-fi-border">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-fi-muted">Costo total estimado</span>
                <span className="text-xl font-bold text-fi-navy">{formatCOP(estimatedTotal)}</span>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={closeModal} className="fi-btn-secondary w-auto">Cancelar</button>
              <button type="submit" disabled={saving} className="fi-btn-primary w-auto px-8">
                {saving ? 'Registrando...' : '✅ Confirmar Compra'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal: Detalle de Orden ── */}
      {modal === 'detail' && detail && (
        <Modal title={`Orden de Compra — ${formatDate(detail.created_at)}`} onClose={closeModal}>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-fi-muted font-medium">Proveedor</p>
                <p className="text-fi-navy font-semibold mt-0.5">{detail.supplier_name || 'No especificado'}</p>
              </div>
              <div>
                <p className="text-fi-muted font-medium">Costo Total</p>
                <p className="text-fi-navy font-bold text-lg mt-0.5">{formatCOP(detail.total_cost)}</p>
              </div>
              {detail.notes && (
                <div className="col-span-2">
                  <p className="text-fi-muted font-medium">Notas</p>
                  <p className="text-fi-navy mt-0.5">{detail.notes}</p>
                </div>
              )}
            </div>

            <table className="fi-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cantidad ingresada</th>
                  <th>Costo unitario</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {detail.items.map((item) => (
                  <tr key={item.id}>
                    <td className="font-medium text-fi-navy">{item.product_name}</td>
                    <td><span className="fi-badge-success">+{item.quantity} uds</span></td>
                    <td className="text-fi-muted">{formatCOP(item.unit_cost)}</td>
                    <td className="font-semibold text-fi-navy">{formatCOP(item.unit_cost * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end pt-2">
              <button onClick={closeModal} className="fi-btn-secondary w-auto px-8">Cerrar</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
