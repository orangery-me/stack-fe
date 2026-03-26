import axios from 'axios';
import { API_BASE_URL } from '@/config/api.js';
import { useToast } from '@/composables/useToast.js';

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

// ---- Global error toast with dedupe ----
// Key: `${method}:${url}:${status}`, value: timestamp of last toast shown.
const _recentErrorToasts = new Map();
const TOAST_DEDUPE_MS = 3000;

/**
 * Show an error toast unless:
 * - The request config opts out via `config.silentToast = true`
 * - An identical error was already toasted within TOAST_DEDUPE_MS ms
 */
function showErrorToast(config, status, message) {
  if (config?.silentToast) return;

  const method = (config?.method || 'get').toUpperCase();
  const url = config?.url || '';
  const key = `${method}:${url}:${status}`;

  const lastShown = _recentErrorToasts.get(key);
  if (lastShown && Date.now() - lastShown < TOAST_DEDUPE_MS) return;

  _recentErrorToasts.set(key, Date.now());

  const { error } = useToast();
  error(message);
}

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
      // For public endpoints, just throw error without redirect (caller shows its own toast)
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
        // No refresh token, redirect to login – no toast needed, UX is handled by redirect
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
        // Refresh failed, clear tokens and redirect to login – no toast, redirect is the UX signal
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        const errorData = refreshError.response?.data || refreshError;
        return Promise.reject(errorData);
      } finally {
        isRefreshing = false;
      }
    }

    // For all other errors: show a toast (unless opt-out), then reject.
    const status = error.response?.status;
    const errorData = error.response?.data || error;
    const message = getMessageFromApiError(errorData);
    showErrorToast(originalRequest, status, message);
    return Promise.reject(errorData);
  }
);

export default apiHelper;
