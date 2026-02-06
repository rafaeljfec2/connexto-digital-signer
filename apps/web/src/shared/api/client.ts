import axios from 'axios';

const baseURL =
  process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000/digital-signer/v1';

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined' && error?.response?.status === 401) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
