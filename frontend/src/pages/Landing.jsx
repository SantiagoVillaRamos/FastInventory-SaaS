import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const features = [
  { icon: '📦', title: 'Inventario en tiempo real', desc: 'Control de stock actualizado al instante.' },
  { icon: '🛒', title: 'Punto de Venta (POS)', desc: 'Registra ventas multi-ítem en segundos.' },
  { icon: '📊', title: 'Reportes y analíticas', desc: 'Reportes diarios y mensuales automáticos.' },
  { icon: '🔐', title: '100% Seguro', desc: 'Arquitectura multi-tenant con aislamiento.' },
];

const plans = [
  { name: 'Free', price: '$0', desc: 'Para probar y arrancar', features: ['50 productos', '2 usuarios', 'Ventas ilimitadas', 'Reporte diario'], cta: 'Empezar gratis', highlight: false },
  { name: 'Basic', price: '$15', desc: 'Para negocios en crecimiento', features: ['500 productos', '10 usuarios', 'Ventas ilimitadas', 'Reportes completos'], cta: 'Comenzar con Basic', highlight: true },
  { name: 'Premium', price: '$35', desc: 'Para múltiples sucursales', features: ['Productos ilimitados', 'Usuarios ilimitados', 'Ventas ilimitadas', 'Soporte prioritario'], cta: 'Comenzar con Premium', highlight: false },
];

export default function Landing() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ business_name: '', slug: '', admin_name: '', admin_email: '', admin_password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/register', form);
      setSuccess(true);
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Ocurrió un error al registrar el negocio. Verifica tus datos.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-fi-bg">
      {/* ── NAV ── */}
      <nav className="fixed top-0 w-full bg-fi-surface/80 backdrop-blur-md border-b border-fi-border z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <span className="font-bold text-fi-navy text-lg tracking-tight">FastInventory</span>
          </div>
          <div className="hidden md:flex gap-8 text-sm font-medium text-fi-muted">
            <a href="#features" className="hover:text-fi-navy transition-colors">Características</a>
            <a href="#plans" className="hover:text-fi-navy transition-colors">Planes</a>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/login')} className="fi-btn-secondary py-1.5 px-4">Iniciar sesión</button>
            <a href="#register" className="fi-btn-primary py-1.5 px-4 hidden sm:flex">Empezar gratis</a>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="pt-32 pb-20 px-4 text-center">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fi-blue/10 text-fi-blue text-sm font-medium">
            🚀 Lanzamiento oficial · Plan Free
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold text-fi-navy tracking-tight leading-tight">
            Controla tu inventario.<br />
            <span className="text-fi-blue">Vende más rápido.</span>
          </h1>
          <p className="text-lg text-fi-muted max-w-2xl mx-auto">
            FastInventory es la plataforma de gestión de inventario y punto de venta diseñada para PYMEs en Latinoamérica.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
            <a href="#register" className="fi-btn-primary text-base px-8 py-3 w-auto">Crear mi negocio gratis</a>
            <button onClick={() => navigate('/login')} className="fi-btn-secondary text-base px-8 py-3 w-auto">Ver Demo</button>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-20 bg-fi-surface border-y border-fi-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-fi-navy">Todo lo que necesitas, en un solo lugar</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((f, i) => (
              <div key={i} className="fi-card p-6 border-none shadow-sm hover:shadow-md transition-shadow bg-fi-bg">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-bold text-fi-navy mb-2">{f.title}</h3>
                <p className="text-fi-muted text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLANS ── */}
      <section id="plans" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-fi-navy">Precios simples</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((p, i) => (
              <div key={i} className={`fi-card p-8 flex flex-col ${p.highlight ? 'ring-2 ring-fi-blue shadow-xl scale-105 bg-fi-surface' : 'bg-fi-surface/50'}`}>
                <h3 className="text-xl font-bold text-fi-navy">{p.name}</h3>
                <div className="mt-4 mb-2">
                  <span className="text-4xl font-extrabold text-fi-navy">{p.price}</span>
                  <span className="text-fi-muted">/mes</span>
                </div>
                <p className="text-sm text-fi-muted mb-8">{p.desc}</p>
                <ul className="space-y-4 mb-8 flex-1">
                  {p.features.map((feat, j) => (
                    <li key={j} className="flex items-center gap-3 text-sm text-fi-navy">
                      <span className="text-fi-blue">✓</span> {feat}
                    </li>
                  ))}
                </ul>
                <a href="#register" className={p.highlight ? 'fi-btn-primary' : 'fi-btn-secondary'}>{p.cta}</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── REGISTER ── */}
      <section id="register" className="py-24 bg-fi-navy text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl font-bold mb-6">Crea tu negocio en 2 minutos</h2>
            <p className="text-slate-300 mb-8 text-lg">Sin tarjeta de crédito. Sin configuración compleja. Solo tus datos y listo.</p>
            <ul className="space-y-4 text-slate-300">
              <li className="flex items-center gap-3"><span>🔐</span> Datos cifrados y aislados</li>
              <li className="flex items-center gap-3"><span>🚀</span> Acceso inmediato</li>
              <li className="flex items-center gap-3"><span>📱</span> Funciona en móviles</li>
            </ul>
          </div>

          <div className="bg-fi-surface text-fi-navy p-8 rounded-2xl shadow-2xl relative">
            {success ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">🎉</div>
                <h3 className="text-2xl font-bold text-fi-navy mb-2">¡Tu negocio está listo!</h3>
                <p className="text-fi-muted mb-8">El tenant fue aprovisionado con éxito en nuestra base de datos.</p>
                <button onClick={() => navigate('/login')} className="fi-btn-primary">Ir al Login para entrar</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <h3 className="text-xl font-bold mb-6">Registra tu negocio</h3>
                
                {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">{error}</div>}

                <div>
                  <label className="block text-sm font-medium mb-1.5">Nombre del negocio *</label>
                  <input required name="business_name" value={form.business_name} onChange={handleChange} className="fi-input" placeholder="Ej: Ferretería Don Pedro" />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Identificador único (slug) *</label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-fi-border bg-slate-50 text-fi-muted text-sm">
                      app.fast/
                    </span>
                    <input required name="slug" value={form.slug} onChange={handleChange} pattern="^[a-z0-9-]+$" title="Solo minúsculas y guiones" className="fi-input rounded-l-none" placeholder="mi-ferreteria" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Tu nombre *</label>
                    <input required name="admin_name" value={form.admin_name} onChange={handleChange} className="fi-input" placeholder="Pedro García" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Email admin *</label>
                    <input required type="email" name="admin_email" value={form.admin_email} onChange={handleChange} className="fi-input" placeholder="pedro@tienda.com" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Contraseña admin *</label>
                  <input required type="password" name="admin_password" value={form.admin_password} onChange={handleChange} minLength={6} className="fi-input" placeholder="••••••••" />
                </div>

                <button type="submit" disabled={loading} className="fi-btn-primary mt-6">
                  {loading ? 'Creando infraestructura...' : 'Crear mi negocio gratis'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-fi-navy text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm">
          <p>© 2026 FastInventory SaaS. Arquitectura Monolito Modular.</p>
        </div>
      </footer>
    </div>
  );
}
