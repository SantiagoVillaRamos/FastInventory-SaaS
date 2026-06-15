// F30-T01 a T08: Módulo Punto de Venta (POS)
// Grid layout: 2/3 catálogo | 1/3 carrito
import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

// ── Helpers ────────────────────────────────────────────────────────────────
const formatCOP = (v) =>
  Number(v || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const IVA = 0.19;

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
  const outOfStock = product.stock === 0;
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
        <span className={`flex-shrink-0 fi-badge-${product.stock === 0 ? 'danger' : product.stock <= 5 ? 'warning' : 'success'} text-xs`}>
          {product.stock} {product.unit}
        </span>
      </div>
      <p className="text-fi-blue font-bold text-base">{formatCOP(product.price)}</p>
      {!outOfStock && (
        <p className="text-fi-muted text-xs mt-2">Clic para agregar →</p>
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

// ══════════════════════════════════════════════════════════════════════════════
// ── POS Principal ─────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export default function POS() {
  const [products, setProducts]   = useState([]);
  const [cartItems, setCartItems] = useState([]); // F30-T06
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [checking, setChecking]   = useState(false);
  const [success, setSuccess]     = useState(null); // { total, itemCount }

  // F30-T04: Cargar productos con stock > 0
  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/products/');
      setProducts(res.data.filter((p) => p.stock > 0));
    } catch { /* interceptor maneja 401 */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  // Productos filtrados por búsqueda
  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  // F30-T06: addToCart — agrega o incrementa ítem
  const addToCart = (product) => {
    setCartItems((prev) => {
      const exists = prev.find((i) => i.id === product.id);
      if (exists) {
        if (exists.quantity >= product.stock) return prev; // límite de stock
        return prev.map((i) => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...product, quantity: 1 }];
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

  // F30-T08: Cálculos del resumen
  const subtotal = cartItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const iva      = subtotal * IVA;
  const total    = subtotal + iva;

  // F30-T09: checkout() — POST /sales/
  const checkout = async () => {
    if (cartItems.length === 0) return;
    setChecking(true);
    try {
      const payload = {
        items: cartItems.map((i) => ({ product_id: i.id, quantity: i.quantity })),
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
                  <span>IVA (19%)</span>
                  <span>{formatCOP(iva)}</span>
                </div>
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
