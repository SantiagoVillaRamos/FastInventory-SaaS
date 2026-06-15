// F28-T01 a T15: Gestión de Catálogo — Tabs + CRUD + RBAC
import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

// ── Helpers ────────────────────────────────────────────────────────────────
const formatCOP = (v) =>
  Number(v || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

// ── Modal reutilizable ─────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="fi-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="fi-modal max-w-lg w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-fi-border">
          <h3 className="text-base font-semibold text-fi-navy">{title}</h3>
          <button onClick={onClose} className="text-fi-muted hover:text-fi-navy text-xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ── Modal de Confirmación Borrar ───────────────────────────────────────────
function ConfirmModal({ message, onConfirm, onClose }) {
  return (
    <Modal title="Confirmar eliminación" onClose={onClose}>
      <p className="text-fi-muted text-sm mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button onClick={onClose} className="fi-btn-secondary w-auto">Cancelar</button>
        <button onClick={onConfirm} className="fi-btn-danger w-auto">Sí, eliminar</button>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── TAB: Categorías ───────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function CategoriesTab({ isAdmin }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState(null); // null | 'create' | 'edit' | 'delete'
  const [selected, setSelected]     = useState(null);
  const [form, setForm]             = useState({ name: '', description: '' });
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  // F28-T08: loadCategories()
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/categories/');
      setCategories(res.data);
    } catch { /* manejado por interceptor */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm({ name: '', description: '' }); setSelected(null); setModal('create'); };
  const openEdit   = (cat) => { setForm({ name: cat.name, description: cat.description || '' }); setSelected(cat); setModal('edit'); };
  const openDelete = (cat) => { setSelected(cat); setModal('delete'); };
  const closeModal = () => { setModal(null); setSelected(null); setError(''); };

  // F28-T09: POST / PATCH categoría
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (modal === 'create') {
        await api.post('/categories/', form);
      } else {
        await api.patch(`/categories/${selected.id}`, form);
      }
      await load();
      closeModal();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar la categoría.');
    } finally {
      setSaving(false);
    }
  };

  // F28-T10: DELETE categoría
  const handleDelete = async () => {
    try {
      await api.delete(`/categories/${selected.id}`);
      await load();
      closeModal();
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo eliminar.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex justify-between items-center">
        <p className="text-fi-muted text-sm">{categories.length} categorías registradas</p>
        {isAdmin && (
          <button onClick={openCreate} className="fi-btn-primary w-auto px-5 py-2 text-sm">
            + Nueva categoría
          </button>
        )}
      </div>

      {/* Tabla F28-T02 */}
      <div className="fi-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><div className="fi-spinner w-7 h-7" /></div>
        ) : categories.length === 0 ? (
          <div className="text-center py-16 text-fi-muted">No hay categorías aún.</div>
        ) : (
          <table className="fi-table">
            <thead><tr><th>Nombre</th><th>Descripción</th>{isAdmin && <th>Acciones</th>}</tr></thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium text-fi-navy">{c.name}</td>
                  <td className="text-fi-muted">{c.description || '—'}</td>
                  {isAdmin && (
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(c)} className="text-fi-blue hover:underline text-sm">Editar</button>
                        <button onClick={() => openDelete(c)} className="text-red-500 hover:underline text-sm">Eliminar</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Crear/Editar */}
      {(modal === 'create' || modal === 'edit') && (
        <Modal title={modal === 'create' ? 'Nueva categoría' : 'Editar categoría'} onClose={closeModal}>
          <form onSubmit={handleSave} className="space-y-4">
            {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">{error}</p>}
            <div>
              <label className="block text-sm font-medium mb-1.5">Nombre *</label>
              <input required className="fi-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Electrónica" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Descripción</label>
              <textarea rows={3} className="fi-input resize-none" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripción opcional" />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={closeModal} className="fi-btn-secondary w-auto">Cancelar</button>
              <button type="submit" disabled={saving} className="fi-btn-primary w-auto px-6">{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Confirmar Borrar */}
      {modal === 'delete' && (
        <ConfirmModal
          message={`¿Estás seguro de que quieres eliminar la categoría "${selected?.name}"? Esta acción no se puede deshacer.`}
          onConfirm={handleDelete}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── TAB: Productos ────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
const EMPTY_VARIANT = () => ({ name: '', sku: '', price: '', stock: '0' });

function ProductsTab({ isAdmin }) {
  const [products, setProducts]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState(null);
  const [selected, setSelected]     = useState(null);
  const [form, setForm]             = useState({ name: '', price: '0', stock: '0', unit: 'unidad', category_id: '', has_variants: false, is_tax_exempt: false });
  const [variants, setVariants]     = useState([EMPTY_VARIANT()]);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  // F28-T11: loadProducts() — cruza productos con categorías
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([api.get('/products/'), api.get('/categories/')]);
      setCategories(cRes.data);
      const catMap = Object.fromEntries(cRes.data.map((c) => [c.id, c.name]));
      setProducts(pRes.data.map((p) => ({ ...p, category_name: catMap[p.category_id] || '—' })));
    } catch { /* interceptor maneja 401 */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // F28-T12: Búsqueda por nombre
  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => {
    setForm({ name: '', price: '0', stock: '0', unit: 'unidad', category_id: categories[0]?.id || '', has_variants: false, is_tax_exempt: false });
    setVariants([EMPTY_VARIANT()]);
    setSelected(null);
    setModal('create');
  };
  const openEdit = (p) => {
    setForm({ name: p.name, price: p.price, stock: p.stock, unit: p.unit || 'unidad', category_id: p.category_id, has_variants: p.has_variants || false, is_tax_exempt: p.is_tax_exempt || false });
    setVariants(p.variants?.length ? p.variants.map(v => ({ name: v.name, sku: v.sku || '', price: String(v.price), stock: String(v.stock) })) : [EMPTY_VARIANT()]);
    setSelected(p);
    setModal('edit');
  };
  const openDelete = (p) => { setSelected(p); setModal('delete'); };
  const closeModal = () => { setModal(null); setSelected(null); setError(''); };

  // Helpers para variantes
  const handleVariantChange = (idx, field, value) => {
    setVariants(prev => { const v = [...prev]; v[idx] = { ...v[idx], [field]: value }; return v; });
  };
  const addVariant    = () => setVariants(prev => [...prev, EMPTY_VARIANT()]);
  const removeVariant = (idx) => setVariants(prev => prev.filter((_, i) => i !== idx));

  // F28-T14 / F-33: POST / PATCH producto (con soporte de variantes)
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      name: form.name,
      price: parseFloat(form.price) || 0,
      stock: form.has_variants ? 0 : parseInt(form.stock, 10),
      unit: form.unit,
      category_id: form.category_id,
      has_variants: form.has_variants,
      is_tax_exempt: form.is_tax_exempt,
    };
    if (form.has_variants && modal === 'create') {
      payload.variants = variants.map(v => ({
        name: v.name,
        sku: v.sku || null,
        price: parseFloat(v.price),
        stock: parseInt(v.stock, 10) || 0,
      }));
    }
    try {
      if (modal === 'create') {
        await api.post('/products/', payload);
      } else {
        await api.patch(`/products/${selected.id}`, payload);
      }
      await load();
      closeModal();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar el producto.');
    } finally {
      setSaving(false);
    }
  };

  // F28-T15: DELETE producto
  const handleDelete = async () => {
    try {
      await api.delete(`/products/${selected.id}`);
      await load();
      closeModal();
    } catch { /* silent */ }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar F28-T04 */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar producto por nombre..."
          className="fi-input max-w-xs"
        />
        {isAdmin && (
          <button onClick={openCreate} className="fi-btn-primary w-auto px-5 py-2 text-sm">
            + Nuevo producto
          </button>
        )}
      </div>

      {/* Tabla F28-T03 */}
      <div className="fi-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><div className="fi-spinner w-7 h-7" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-fi-muted">No se encontraron productos.</div>
        ) : (
          <table className="fi-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Precio / Variantes</th>
                <th>Stock</th>
                <th>Unidad</th>
                {isAdmin && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium text-fi-navy">
                    {p.name}
                    {p.has_variants && <span className="ml-2 fi-badge-warning text-xs">🎨 variantes</span>}
                    {p.is_tax_exempt && <span className="ml-2 bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-xs font-semibold">exento</span>}
                  </td>
                  <td><span className="fi-badge-success">{p.category_name}</span></td>
                  <td className="text-fi-muted">
                    {p.has_variants
                      ? <span className="text-xs text-fi-muted">{p.variants?.length || 0} var. / desde {formatCOP(Math.min(...(p.variants?.map(v => v.price) || [0])))}</span>
                      : formatCOP(p.price)
                    }
                  </td>
                  <td>
                    {p.has_variants
                      ? <span className="fi-badge-success">{(p.variants || []).reduce((a, v) => a + v.stock, 0)} total</span>
                      : <span className={p.stock === 0 ? 'fi-badge-danger' : p.stock <= 5 ? 'fi-badge-warning' : 'fi-badge-success'}>{p.stock}</span>
                    }
                  </td>
                  <td className="text-fi-muted text-xs">{p.unit}</td>
                  {isAdmin && (
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(p)} className="text-fi-blue hover:underline text-sm">Editar</button>
                        <button onClick={() => openDelete(p)} className="text-red-500 hover:underline text-sm">Eliminar</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Crear/Editar — F28 + F-33 */}
      {(modal === 'create' || modal === 'edit') && (
        <Modal title={modal === 'create' ? 'Nuevo producto' : 'Editar producto'} onClose={closeModal}>
          <form onSubmit={handleSave} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">{error}</p>}

            <div>
              <label className="block text-sm font-medium mb-1.5">Nombre *</label>
              <input required className="fi-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Camiseta Polo" />
            </div>

            {/* F-33: Toggle de variantes */}
            <div className="flex items-center justify-between p-3 bg-fi-bg rounded-xl border border-fi-border">
              <div>
                <p className="text-sm font-medium text-fi-navy">¿Tiene variantes?</p>
                <p className="text-xs text-fi-muted mt-0.5">Ej: tallas, colores, medidas</p>
              </div>
              <button
                type="button"
                onClick={() => setForm({ ...form, has_variants: !form.has_variants })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  form.has_variants ? 'bg-fi-blue' : 'bg-gray-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  form.has_variants ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* F-34: Toggle de exención de impuestos */}
            <div className="flex items-center justify-between p-3 bg-fi-bg rounded-xl border border-fi-border">
              <div>
                <p className="text-sm font-medium text-fi-navy">¿Exento de Impuestos (IVA)?</p>
                <p className="text-xs text-fi-muted mt-0.5">Activa si este producto no cobra IVA</p>
              </div>
              <button
                type="button"
                onClick={() => setForm({ ...form, is_tax_exempt: !form.is_tax_exempt })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  form.is_tax_exempt ? 'bg-fi-blue' : 'bg-gray-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  form.is_tax_exempt ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Precio y Stock (solo si NO tiene variantes) */}
            {!form.has_variants && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Precio *</label>
                  <input required type="number" min="0" step="0.01" className="fi-input" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Stock inicial *</label>
                  <input required type="number" min="0" className="fi-input" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="0" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Unidad *</label>
                <select required className="fi-input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                  <option value="unidad">Unidad</option>
                  <option value="kg">Kilogramo</option>
                  <option value="lt">Litro</option>
                  <option value="mt">Metro</option>
                  <option value="caja">Caja</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Categoría *</label>
                <select required className="fi-input" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                  <option value="">Seleccionar...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* F-33: Sección de variantes (solo al crear con has_variants) */}
            {form.has_variants && modal === 'create' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-fi-navy">Variantes *</label>
                  <button type="button" onClick={addVariant} className="text-fi-blue text-sm hover:underline">+ Agregar</button>
                </div>
                <div className="space-y-3">
                  {variants.map((v, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 bg-fi-bg rounded-xl border border-fi-border">
                      <div className="col-span-4">
                        {idx === 0 && <label className="block text-xs font-medium text-fi-muted mb-1">Nombre *</label>}
                        <input required className="fi-input text-sm" placeholder="Ej: Rojo - M" value={v.name} onChange={(e) => handleVariantChange(idx, 'name', e.target.value)} />
                      </div>
                      <div className="col-span-3">
                        {idx === 0 && <label className="block text-xs font-medium text-fi-muted mb-1">Precio *</label>}
                        <input required type="number" min="0.01" step="0.01" className="fi-input text-sm" placeholder="0" value={v.price} onChange={(e) => handleVariantChange(idx, 'price', e.target.value)} />
                      </div>
                      <div className="col-span-2">
                        {idx === 0 && <label className="block text-xs font-medium text-fi-muted mb-1">Stock</label>}
                        <input type="number" min="0" className="fi-input text-sm" placeholder="0" value={v.stock} onChange={(e) => handleVariantChange(idx, 'stock', e.target.value)} />
                      </div>
                      <div className="col-span-2">
                        {idx === 0 && <label className="block text-xs font-medium text-fi-muted mb-1">SKU</label>}
                        <input className="fi-input text-sm" placeholder="Opcional" value={v.sku} onChange={(e) => handleVariantChange(idx, 'sku', e.target.value)} />
                      </div>
                      <div className="col-span-1 flex items-end pb-0.5 justify-center">
                        {variants.length > 1 && (
                          <button type="button" onClick={() => removeVariant(idx)} className="text-red-400 hover:text-red-600 text-lg font-bold">×</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {form.has_variants && modal === 'edit' && (
                  <p className="text-xs text-fi-muted mt-2">Para gestionar variantes de un producto existente, usa la sección de Compras para reponer stock por variante.</p>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={closeModal} className="fi-btn-secondary w-auto">Cancelar</button>
              <button type="submit" disabled={saving} className="fi-btn-primary w-auto px-6">{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'delete' && (
        <ConfirmModal
          message={`¿Eliminar el producto "${selected?.name}"? Esta acción no se puede deshacer.`}
          onConfirm={handleDelete}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Componente Principal: Catalog ─────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
const TABS = ['Productos', 'Categorías'];

export default function Catalog() {
  const [activeTab, setActiveTab] = useState('Productos');
  const { payload } = useAuth();

  // F28-T09: RBAC — solo admin puede crear/editar/borrar
  const isAdmin = payload?.role === 'admin';

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-fi-navy">Catálogo</h1>
        <p className="text-fi-muted text-sm mt-1">Gestión de productos y categorías</p>
      </div>

      {/* F28-T01: Sistema de Tabs */}
      <div className="border-b border-fi-border">
        <nav className="-mb-px flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-fi-blue text-fi-blue'
                  : 'border-transparent text-fi-muted hover:text-fi-navy'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenido del tab activo */}
      {activeTab === 'Categorías' ? (
        <CategoriesTab isAdmin={isAdmin} />
      ) : (
        <ProductsTab isAdmin={isAdmin} />
      )}
    </div>
  );
}
