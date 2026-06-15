import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

// ── Íconos inline SVG ─────────────────────────────────────────────────────
const IconMail = () => (
  <svg className="w-4 h-4 text-fi-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
  </svg>
);
const IconLock = () => (
  <svg className="w-4 h-4 text-fi-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
);
const IconEye = ({ show }) => show ? (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
) : (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
  </svg>
);

// ── Panel izquierdo decorativo ────────────────────────────────────────────
function LeftPanel() {
  const features = [
    { icon: '📦', text: 'Control de inventario en tiempo real' },
    { icon: '🛒', text: 'Punto de venta rápido y confiable' },
    { icon: '📊', text: 'Reportes y analíticas del negocio' },
    { icon: '🔐', text: 'Datos 100% seguros y privados' },
  ];
  return (
    <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-fi-navy via-blue-900 to-blue-700 p-12 text-white">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-white/15 rounded-lg flex items-center justify-center text-xl">⚡</div>
        <span className="text-xl font-bold tracking-tight">FastInventory</span>
      </div>

      {/* Propuesta de valor */}
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-extrabold leading-tight text-white">
            Controla tu inventario.<br />
            <span className="text-blue-300">Vende más rápido.</span>
          </h1>
          <p className="mt-4 text-blue-200 text-base leading-relaxed">
            La plataforma de gestión diseñada para PYMEs en Latinoamérica.
            Regístrate en 2 minutos y empieza a operar hoy.
          </p>
        </div>

        <ul className="space-y-4">
          {features.map((f, i) => (
            <li key={i} className="flex items-center gap-3 text-sm text-blue-100">
              <span className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                {f.icon}
              </span>
              {f.text}
            </li>
          ))}
        </ul>
      </div>

      {/* Badge inferior */}
      <div className="flex items-center gap-2 text-xs text-blue-300">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        Servidor operativo · Datos encriptados
      </div>
    </div>
  );
}

// ── Formulario de Login ───────────────────────────────────────────────────
export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const form = new URLSearchParams();
      form.append('username', email);
      form.append('password', password);
      const res = await api.post('/auth/token', form);
      login(res.data.access_token);
      navigate('/dashboard');
    } catch {
      setError('Correo o contraseña incorrectos. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-fi-bg">
      {/* Panel izquierdo */}
      <LeftPanel />

      {/* Panel derecho — formulario */}
      <div className="flex flex-col justify-center items-center px-6 py-12 sm:px-12 lg:px-16">
        {/* Logo mobile */}
        <div className="flex items-center gap-2 mb-10 lg:hidden">
          <span className="text-2xl">⚡</span>
          <span className="text-xl font-bold text-fi-navy">FastInventory</span>
        </div>

        <div className="w-full max-w-md">
          {/* Encabezado */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-fi-navy">Bienvenido de nuevo</h2>
            <p className="mt-1 text-sm text-fi-muted">Ingresa a tu cuenta para continuar</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              <span className="mt-0.5">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-fi-navy">
                Correo electrónico
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2">
                  <IconMail />
                </span>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="pedro@mitienda.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="fi-input pl-10"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="block text-sm font-medium text-fi-navy">
                  Contraseña
                </label>
                <button type="button" className="text-xs text-fi-blue hover:underline font-medium">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2">
                  <IconLock />
                </span>
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="fi-input pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-fi-muted hover:text-fi-navy transition-colors"
                  aria-label="Mostrar contraseña"
                >
                  <IconEye show={showPw} />
                </button>
              </div>
            </div>

            {/* CTA */}
            <button type="submit" disabled={loading} className="fi-btn-primary mt-2">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"
                      strokeDasharray="31.4" strokeLinecap="round" className="opacity-25" />
                    <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3"
                      strokeLinecap="round" className="opacity-75" />
                  </svg>
                  Iniciando sesión…
                </span>
              ) : 'Iniciar Sesión'}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-fi-muted">
            ¿No tienes cuenta?{' '}
            <a href="/" className="text-fi-blue font-medium hover:underline">
              Regístrate gratis
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
