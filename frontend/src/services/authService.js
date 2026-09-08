import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://my-dream-school.onrender.com/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // If the data is FormData, let axios set the Content-Type with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token expiration
// Eslatma: /auth/login dagi 401 (noto'g'ri parol) da login sahifasidan
// haydab yubormaymiz — aks holda xatolik matni ko'rinmay qoladi.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const isAuthCall = url.includes('/auth/login') || url.includes('/auth/me');
    if (status === 401 && !isAuthCall) {
      localStorage.removeItem('token');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

const authService = {
  // Login user
  login: async (phone, password, recaptchaToken) => {
    const config = recaptchaToken
      ? { headers: { 'X-Recaptcha-Token': recaptchaToken } }
      : undefined;
    const response = await api.post('/auth/login', { phone, password, recaptchaToken }, config);
    return response.data;
  },

  // Register user (admin only)
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  // Get current user
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Logout
  logout: () => {
    localStorage.removeItem('token');
  }
};

export default authService;
export { api };
