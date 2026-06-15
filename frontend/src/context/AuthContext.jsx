// DS-06: AuthContext — gestión de sesión vía sessionStorage
import React, { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => sessionStorage.getItem('fi_token'));

  // Decodifica el payload del JWT para extraer rol, tenant_id, etc.
  const getPayload = useCallback(() => {
    if (!token) return null;
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
    } catch {
      return null;
    }
  }, [token]);

  const login = useCallback((newToken) => {
    sessionStorage.setItem('fi_token', newToken);
    setToken(newToken);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('fi_token');
    setToken(null);
  }, []);

  const isAuthenticated = !!token;
  const payload = getPayload();

  return (
    <AuthContext.Provider value={{ token, login, logout, isAuthenticated, payload }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
