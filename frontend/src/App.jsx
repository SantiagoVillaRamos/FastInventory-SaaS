import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Catalog from './pages/Catalog';
import POS from './pages/POS';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="catalog" element={<Catalog />} />
            <Route path="pos" element={<POS />} />
            <Route path="reports" element={<div className="p-8 text-slate-400">Reportes en construcción...</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
