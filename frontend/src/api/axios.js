// DS-05: Cliente HTTP centralizado
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
});

// Interceptor: adjunta el JWT en cada request si existe
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('fi_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: si la API responde 401, limpiar sesión y redirigir al login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('fi_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
