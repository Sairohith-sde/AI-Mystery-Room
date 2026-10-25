import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  timeout: 60000,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const payload = error.response?.data || {};
    const apiError = payload.error || {
      code: 'INTERNAL_ERROR',
      message: error.message || 'Request failed.',
      details: null,
    };

    return Promise.reject({
      code: apiError.code || 'INTERNAL_ERROR',
      message: apiError.message || 'Request failed.',
      details: apiError.details || null,
    });
  },
);

export default api;