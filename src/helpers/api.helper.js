import axios from 'axios';
import { API_BASE_URL } from '@/config/api.js';

/**
 * Normalize error message from API error object (NestJS style).
 * Handles string message, array message (ValidationPipe), or missing message.
 * @param {unknown} error - Error object (usually error.response.data)
 * @param {string} fallback - Fallback message when none found
 * @returns {string}
 */
export function getMessageFromApiError(error, fallback = 'Something went wrong') {
  if (!error || typeof error !== 'object') return fallback;
  const msg = error.message;
  if (typeof msg === 'string' && msg.trim()) return msg.trim();
  if (Array.isArray(msg)) return msg.map((m) => (typeof m === 'string' ? m : String(m))).join(', ') || fallback;
  return fallback;
}

// Create axios instance
const apiHelper = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add Bearer token to requests
apiHelper.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle token refresh on 401
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiHelper.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    const isPublicEndpoint = originalRequest.url.includes('/auth/login') ||
    originalRequest.url.includes('/auth/register');

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      // For public endpoints, just throw error without redirect
      if (isPublicEndpoint) {
        const errorData = error.response?.data || error;
        return Promise.reject(errorData);
      }

      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiHelper(originalRequest);
          })
          .catch((err) => {
            const errorData = err.response?.data || err;
            return Promise.reject(errorData);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        // No refresh token, redirect to login
        processQueue(error, null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';

        const errorData = error.response?.data || error;
        return Promise.reject(errorData);
      }

      try {
        const response = await axios.get(
          `${API_BASE_URL}/auth/refresh`,
          {
            headers: {
              Authorization: `Bearer ${refreshToken}`,
            },
          }
        );

        const { accessToken } = response.data.data;
        localStorage.setItem('accessToken', accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        processQueue(null, accessToken);
        return apiHelper(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        // Throw error.response.data if available
        const errorData = refreshError.response?.data || refreshError;
        return Promise.reject(errorData);
      } finally {
        isRefreshing = false;
      }
    }

    // For all other errors, throw error.response.data if available
    // This allows direct access to error.message, error.statusCode, etc.
    const errorData = error.response?.data || error;
    return Promise.reject(errorData);
  }
);

export default apiHelper;
