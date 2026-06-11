import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';

// ── Iconos inline ────────────────────────────────────────────────
const IconPlus  = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>;
const IconMinus = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>;
const IconTrash = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const IconCheck = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;
const IconSearch = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;

const IVA_RATE = 0.19;

export default function POS() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [successSale, setSuccessSale] = useState(null); // datos de la venta completada

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/products/');
      setProducts(data.filter(p => p.stock > 0));
    } catch (err) {
      console.error('Error cargando productos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // ── Lógica del carrito ────────────────────────────────────────
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev; // límite de stock
        return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product_id: product.id, name: product.name, price: product.price, quantity: 1, maxStock: product.stock }];
    });
  };

  const updateQty = (product_id, delta) => {
    setCart(prev => prev
      .map(i => i.product_id === product_id ? { ...i, quantity: Math.min(i.quantity + delta, i.maxStock) } : i)
      .filter(i => i.quantity > 0)
    );
  };

  const removeFromCart = (product_id) => setCart(prev => prev.filter(i => i.product_id !== product_id));
  const clearCart = () => setCart([]);

  // ── Cálculos ─────────────────────────────────────────────────
  const subtotal = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const iva      = subtotal * IVA_RATE;
  const total    = subtotal + iva;

  // ── Checkout ─────────────────────────────────────────────────
  const checkout = async () => {
    if (cart.length === 0) return;
    setCheckingOut(true);
    try {
      const payload = {
        items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity }))
      };
      const { data } = await api.post('/sales/', payload);
      setSuccessSale(data);
      clearCart();
      fetchProducts(); // refrescar stock
    } catch (err) {
      alert('Error al procesar la venta: ' + (err.response?.data?.detail || err.message));
    } finally {
      setCheckingOut(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  // ── Modal de Éxito ────────────────────────────────────────────
  if (successSale) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="glass-panel p-8 max-w-md w-full mx-4 text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center mx-auto text-accent">
            <IconCheck />
          </div>
          <h2 className="text-2xl font-bold text-white">¡Venta Completada!</h2>
          <p className="text-slate-400">Venta registrada exitosamente.</p>
          <div className="bg-surface/50 rounded-xl p-4 text-left space-y-2 border border-slate-700/50">
            <div className="flex justify-between text-sm text-slate-300">
              <span>ID de venta</span>
              <span className="font-mono text-xs text-slate-400">{successSale.id.slice(0, 16)}...</span>
            </div>
            <div className="flex justify-between font-bold text-lg text-white border-t border-slate-700/50 pt-2 mt-2">
              <span>Total cobrado</span>
              <span className="text-accent">${successSale.total.toFixed(2)}</span>
            </div>
          </div>
          <button
            onClick={() => setSuccessSale(null)}
            className="btn-primary w-full py-3 mt-2"
          >
            Nueva Venta
          </button>
        </div>
      </div>
    );
  }

  // ── Vista Principal ───────────────────────────────────────────
  return (
    <div className="flex h-full gap-6">

      {/* ── Panel izquierdo: Catálogo ────────────────────────── */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Punto de Venta</h2>
          <span className="text-xs text-slate-500 bg-surface px-3 py-1 rounded-full border border-slate-700/50">
            {products.length} productos disponibles
          </span>
        </div>

        {/* Barra de búsqueda */}
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <IconSearch />
          </div>
          <input
            type="text"
            placeholder="Buscar producto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-surface border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>

        {/* Grid de productos */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-28 bg-surface rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500">
              <span className="text-4xl mb-3">📦</span>
              <p>No hay productos con stock disponible.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map(product => {
                const inCart = cart.find(i => i.product_id === product.id);
                const stockUsed = inCart?.quantity || 0;
                const isMaxed = stockUsed >= product.stock;
                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={isMaxed}
                    className={`glass-panel p-4 text-left transition-all duration-200 hover:scale-[1.02] hover:border-primary/50 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed group ${inCart ? 'border-primary/30 shadow-primary/10 shadow-lg' : ''}`}
                  >
                    <div className="text-2xl mb-2">🏷️</div>
                    <p className="font-semibold text-white text-sm leading-tight truncate">{product.name}</p>
                    <p className="text-accent font-bold text-base mt-1">${product.price.toFixed(2)}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${product.stock <= 5 ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-700 text-slate-400'}`}>
                        Stock: {product.stock}
                      </span>
                      {inCart && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                          ×{stockUsed}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Panel derecho: Carrito ───────────────────────────── */}
      <div className="w-80 flex-shrink-0 flex flex-col gap-4">
        <div className="glass-panel flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
            <h3 className="font-bold text-white">Carrito</h3>
            {cart.length > 0 && (
              <button onClick={clearCart} className="text-xs text-red-400 hover:text-red-300 transition-colors">
                Vaciar
              </button>
            )}
          </div>

          {/* Items del carrito */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-slate-500 text-center">
                <span className="text-3xl mb-2">🛒</span>
                <p className="text-sm">El carrito está vacío.<br />Haz clic en un producto.</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.product_id} className="bg-surface/50 rounded-xl p-3 border border-slate-700/30">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-white leading-tight flex-1">{item.name}</p>
                    <button onClick={() => removeFromCart(item.product_id)} className="text-red-400/60 hover:text-red-400 transition-colors flex-shrink-0">
                      <IconTrash />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQty(item.product_id, -1)}
                        className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-300 transition-colors"
                      >
                        <IconMinus />
                      </button>
                      <span className="w-8 text-center text-white font-medium text-sm">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.product_id, 1)}
                        disabled={item.quantity >= item.maxStock}
                        className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <IconPlus />
                      </button>
                    </div>
                    <span className="text-accent font-semibold text-sm">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Resumen y Checkout */}
          <div className="p-4 border-t border-slate-700/50 space-y-3">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>IVA (19%)</span>
                <span>${iva.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-white font-bold text-base pt-2 border-t border-slate-700/50">
                <span>Total</span>
                <span className="text-accent">${total.toFixed(2)}</span>
              </div>
            </div>
            <button
              onClick={checkout}
              disabled={cart.length === 0 || checkingOut}
              className="w-full py-3 bg-accent hover:bg-emerald-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {checkingOut ? (
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : '💳 Finalizar Venta'}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
