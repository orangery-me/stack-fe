// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8105/api';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    GOOGLE: '/auth/google',
    GOOGLE_CALLBACK: '/auth/google/callback',
    VERIFY_EMAIL: '/auth/verify-email',
  },
};

