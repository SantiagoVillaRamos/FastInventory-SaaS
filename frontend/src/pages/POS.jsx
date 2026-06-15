// F30-T01 a T08: Módulo Punto de Venta (POS)
// Grid layout: 2/3 catálogo | 1/3 carrito
import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

// ── Helpers ────────────────────────────────────────────────────────────────
const formatCOP = (v) =>
  Number(v || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

// IVA por defecto si no carga de la base de datos
const DEFAULT_IVA = 0.19;

// ── Modal de Éxito ─────────────────────────────────────────────────────────
function SuccessModal({ total, itemCount, onClose }) {
  return (
    <div className="fi-modal-overlay">
      <div className="fi-modal max-w-sm w-full text-center">
        <div className="px-8 py-10 space-y-5">
          <div className="text-6xl">🎉</div>
          <h3 className="text-xl font-bold text-fi-navy">¡Venta registrada!</h3>
          <div className="bg-fi-bg rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between text-fi-muted">
              <span>Ítems vendidos</span>
              <span className="font-medium text-fi-navy">{itemCount}</span>
            </div>
            <div className="flex justify-between text-fi-muted border-t border-fi-border pt-2 mt-2">
              <span className="font-semibold">Total cobrado</span>
              <span className="font-bold text-fi-navy text-base">{formatCOP(total)}</span>
            </div>
          </div>
          <p className="text-fi-muted text-xs">El stock ha sido actualizado automáticamente.</p>
          <button onClick={onClose} className="fi-btn-primary mt-2">
            Nueva venta
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tarjeta de Producto ────────────────────────────────────────────────────
function ProductCard({ product, onAdd }) {
  // F-33: Para productos con variantes mostramos stock total y badge especial
  const totalStock = product.has_variants
    ? (product.variants || []).reduce((a, v) => a + v.stock, 0)
    : product.stock;
  const outOfStock = totalStock === 0;
  const minPrice   = product.has_variants && product.variants?.length
    ? Math.min(...product.variants.map(v => v.price))
    : product.price;

  return (
    <button
      onClick={() => !outOfStock && onAdd(product)}
      disabled={outOfStock}
      className={`fi-card p-4 text-left transition-all duration-150 w-full
        ${outOfStock
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:shadow-md hover:border-fi-blue/40 active:scale-[0.98] cursor-pointer'
        }`}
    >
      <div className="flex justify-between items-start gap-2 mb-3">
        <h3 className="text-sm font-semibold text-fi-navy leading-tight line-clamp-2">{product.name}</h3>
        {product.has_variants
          ? <span className="flex-shrink-0 fi-badge-warning text-xs">🎨 {(product.variants || []).length} var.</span>
          : <span className={`flex-shrink-0 fi-badge-${outOfStock ? 'danger' : product.stock <= 5 ? 'warning' : 'success'} text-xs`}>{totalStock} {product.unit}</span>
        }
      </div>
      <p className="text-fi-blue font-bold text-base">
        {product.has_variants ? `Desde ${formatCOP(minPrice)}` : formatCOP(product.price)}
      </p>
      {!outOfStock && (
        <p className="text-fi-muted text-xs mt-2">
          {product.has_variants ? 'Clic para elegir variante →' : 'Clic para agregar →'}
        </p>
      )}
    </button>
  );
}

// ── Ítem en el Carrito ─────────────────────────────────────────────────────
function CartItem({ item, onIncrease, onDecrease, onRemove }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-fi-border last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-fi-navy truncate">{item.name}</p>
        <p className="text-xs text-fi-muted">{formatCOP(item.price)} c/u</p>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onDecrease(item.id)}
          className="w-7 h-7 rounded-lg border border-fi-border flex items-center justify-center text-fi-muted hover:bg-fi-bg hover:text-fi-navy transition-colors"
        >−</button>
        <span className="w-6 text-center text-sm font-bold text-fi-navy">{item.quantity}</span>
        <button
          onClick={() => onIncrease(item.id)}
          disabled={item.quantity >= item.stock}
          className="w-7 h-7 rounded-lg border border-fi-border flex items-center justify-center text-fi-muted hover:bg-fi-bg hover:text-fi-navy transition-colors disabled:opacity-40"
        >+</button>
      </div>
      <div className="text-right min-w-[60px]">
        <p className="text-sm font-semibold text-fi-navy">{formatCOP(item.price * item.quantity)}</p>
        <button onClick={() => onRemove(item.id)} className="text-xs text-red-400 hover:text-red-600">Quitar</button>
      </div>
    </div>
  );
}

// ── Modal Selector de Variante (F-33) ─────────────────────────────────────
function VariantModal({ product, onSelect, onClose }) {
  return (
    <div className="fi-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="fi-modal max-w-md w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-fi-border">
          <div>
            <h3 className="text-base font-semibold text-fi-navy">{product.name}</h3>
            <p className="text-xs text-fi-muted mt-0.5">Selecciona una variante</p>
          </div>
          <button onClick={onClose} className="text-fi-muted hover:text-fi-navy text-xl">&times;</button>
        </div>
        <div className="px-6 py-4 grid grid-cols-2 gap-3 max-h-80 overflow-y-auto">
          {(product.variants || []).filter(v => v.stock > 0).map(v => (
            <button
              key={v.id}
              onClick={() => onSelect(product, v)}
              className="p-3 rounded-xl border border-fi-border text-left hover:border-fi-blue hover:bg-fi-blue/5 transition-colors"
            >
              <p className="text-sm font-semibold text-fi-navy">{v.name}</p>
              <p className="text-fi-blue font-bold text-sm mt-1">{formatCOP(v.price)}</p>
              <p className="text-xs text-fi-muted mt-0.5">{v.stock} disponibles</p>
            </button>
          ))}
          {(product.variants || []).filter(v => v.stock === 0).map(v => (
            <div key={v.id} className="p-3 rounded-xl border border-fi-border opacity-40 cursor-not-allowed">
              <p className="text-sm font-semibold text-fi-navy line-through">{v.name}</p>
              <p className="text-xs text-red-400 mt-1">Sin stock</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── POS Principal ─────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export default function POS() {
  const [products, setProducts]     = useState([]);
  const [cartItems, setCartItems]   = useState([]);
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(true);
  const [checking, setChecking]     = useState(false);
  const [success, setSuccess]       = useState(null);
  const [variantModal, setVariantModal] = useState(null); // F-33: producto con variantes pendiente
  const [taxConfig, setTaxConfig]   = useState({ vatRate: DEFAULT_IVA, retentionRate: 0.00 });

  // F30-T04: Cargar productos con stock disponible
  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/products/');
      // F-33: Para productos con variantes, calcular stock total; para simples usar stock directo
      setProducts(res.data.filter((p) => {
        if (p.has_variants) return (p.variants || []).some(v => v.stock > 0);
        return p.stock > 0;
      }));
    } catch { /* interceptor maneja 401 */ }
    finally { setLoading(false); }
  }, []);

  const loadTaxConfig = useCallback(async () => {
    try {
      const res = await api.get('/tenants/me');
      setTaxConfig({
        vatRate: res.data.default_vat_rate,
        retentionRate: res.data.default_retention_rate,
      });
    } catch {
      // Usar valores por defecto si falla
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadTaxConfig();
  }, [loadProducts, loadTaxConfig]);

  // Productos filtrados por búsqueda
  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  // F30-T06 / F-33: addToCart — si el producto tiene variantes abre el modal selector
  const addToCart = (product) => {
    if (product.has_variants) {
      setVariantModal(product);
      return;
    }
    addSimpleToCart(product, null);
  };

  // Agrega al carrito un producto simple o con variante ya seleccionada
  const addSimpleToCart = (product, variant) => {
    // El id del item en carrito es: variant.id si hay variante, o product.id si es simple
    const itemId    = variant ? `${product.id}::${variant.id}` : product.id;
    const itemName  = variant ? `${product.name} — ${variant.name}` : product.name;
    const itemPrice = variant ? variant.price : product.price;
    const itemStock = variant ? variant.stock : product.stock;

    setCartItems((prev) => {
      const exists = prev.find((i) => i.id === itemId);
      if (exists) {
        if (exists.quantity >= itemStock) return prev;
        return prev.map((i) => i.id === itemId ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        id: itemId,
        product_id: product.id,
        variant_id: variant?.id || null,
        name: itemName,
        price: itemPrice,
        stock: itemStock,
        quantity: 1,
        is_tax_exempt: product.is_tax_exempt || false,
      }];
    });
  };

  // F30-T07: Controles +/- del carrito
  const increaseQty  = (id) => setCartItems((prev) =>
    prev.map((i) => i.id === id && i.quantity < i.stock ? { ...i, quantity: i.quantity + 1 } : i)
  );
  const decreaseQty  = (id) => setCartItems((prev) =>
    prev.map((i) => i.id === id ? { ...i, quantity: i.quantity - 1 } : i).filter((i) => i.quantity > 0)
  );
  const removeFromCart = (id) => setCartItems((prev) => prev.filter((i) => i.id !== id));

  // F30-T08 / F-34: Cálculos del resumen
  const subtotal = cartItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const iva      = cartItems.reduce((acc, i) => {
    if (i.is_tax_exempt) return acc;
    return acc + (i.price * i.quantity) * taxConfig.vatRate;
  }, 0);
  const retention = subtotal * taxConfig.retentionRate;
  const total    = subtotal + iva - retention;

  // F30-T09 / F-33: checkout() — POST /sales/ con variant_id si aplica
  const checkout = async () => {
    if (cartItems.length === 0) return;
    setChecking(true);
    try {
      const payload = {
        items: cartItems.map((i) => ({
          product_id: i.product_id || i.id,
          variant_id: i.variant_id || null,
          quantity: i.quantity,
        })),
      };
      await api.post('/sales/', payload);
      setSuccess({ total, itemCount: cartItems.reduce((a, i) => a + i.quantity, 0) });
      setCartItems([]);
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al procesar la venta.');
    } finally {
      setChecking(false);
    }
  };

  // F30-T10: Modal de éxito → recargar catálogo
  const handleSuccessClose = () => {
    setSuccess(null);
    loadProducts();
  };

  return (
    <div className="space-y-6 h-full">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-fi-navy">Punto de Venta</h1>
        <p className="text-fi-muted text-sm mt-1">Selecciona productos para añadir al carrito</p>
      </div>

      {/* F30-T02: Grid principal 2/3 | 1/3 */}
      <div className="flex gap-6 items-start">

        {/* ── Panel Catálogo (2/3) ── */}
        <div className="flex-1 space-y-4">
          <input
            type="search"
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="fi-input"
          />

          {loading ? (
            <div className="flex justify-center py-16"><div className="fi-spinner w-8 h-8" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-fi-muted">No se encontraron productos con stock.</div>
          ) : (
            // F30-T05: Grid de tarjetas de producto
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} onAdd={addToCart} />
              ))}
            </div>
          )}
        </div>

        {/* ── Panel Carrito (1/3) ── */}
        <div className="w-80 flex-shrink-0 sticky top-24">
          <div className="fi-card overflow-hidden">
            <div className="px-5 py-4 border-b border-fi-border flex items-center justify-between">
              <h2 className="text-base font-semibold text-fi-navy">Carrito</h2>
              {cartItems.length > 0 && (
                <button onClick={() => setCartItems([])} className="text-xs text-red-400 hover:text-red-600">
                  Vaciar
                </button>
              )}
            </div>

            {/* Lista de ítems */}
            <div className="px-5 max-h-80 overflow-y-auto">
              {cartItems.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-fi-muted text-sm">El carrito está vacío.</p>
                  <p className="text-fi-muted text-xs mt-1">Haz clic en un producto para agregarlo.</p>
                </div>
              ) : (
                cartItems.map((item) => (
                  <CartItem
                    key={item.id}
                    item={item}
                    onIncrease={increaseQty}
                    onDecrease={decreaseQty}
                    onRemove={removeFromCart}
                  />
                ))
              )}
            </div>

            {/* F30-T08: Panel Resumen */}
            {cartItems.length > 0 && (
              <div className="px-5 py-4 bg-fi-bg border-t border-fi-border space-y-2">
                <div className="flex justify-between text-sm text-fi-muted">
                  <span>Subtotal</span>
                  <span>{formatCOP(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-fi-muted">
                  <span>IVA ({(taxConfig.vatRate * 100).toFixed(0)}%)</span>
                  <span>{formatCOP(iva)}</span>
                </div>
                {taxConfig.retentionRate > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Retención ({(taxConfig.retentionRate * 100).toFixed(1)}%)</span>
                    <span>-{formatCOP(retention)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-fi-navy text-base border-t border-fi-border pt-2 mt-1">
                  <span>Total</span>
                  <span>{formatCOP(total)}</span>
                </div>

                {/* F30-T09: Botón Finalizar Venta */}
                <button
                  onClick={checkout}
                  disabled={checking}
                  className="fi-btn-primary mt-4"
                >
                  {checking ? 'Procesando...' : '✅ Finalizar Venta'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* F-33: Modal selector de variante */}
      {variantModal && (
        <VariantModal
          product={variantModal}
          onSelect={(product, variant) => {
            addSimpleToCart(product, variant);
            setVariantModal(null);
          }}
          onClose={() => setVariantModal(null)}
        />
      )}

      {/* F30-T10: Modal de éxito */}
      {success && (
        <SuccessModal
          total={success.total}
          itemCount={success.itemCount}
          onClose={handleSuccessClose}
        />
      )}
    </div>
  );
}
