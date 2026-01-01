import { ref } from 'vue';

// Shared state - singleton pattern
const toasts = ref([]);
let toastIdCounter = 0;

/**
 * Generate unique ID for toast
 */
const generateId = () => {
  return `toast-${Date.now()}-${++toastIdCounter}`;
};

/**
 * Show a toast notification
 * @param {Object} options - Toast options
 * @param {string} options.message - Message to display
 * @param {string} options.type - Type of toast (success, error, warning, info)
 * @param {number} options.duration - Duration in milliseconds (0 = no auto-dismiss)
 * @returns {string} Toast ID
 */
const show = (options) => {
  const id = generateId();
  const toast = {
    id,
    message: options.message || '',
    type: options.type || 'info',
    duration: options.duration !== undefined ? options.duration : 5000,
  };

  toasts.value.push(toast);
  return id;
};

/**
 * Show success toast
 * @param {string} message - Success message
 * @param {number} duration - Duration in milliseconds
 * @returns {string} Toast ID
 */
const success = (message, duration = 5000) => {
  return show({ message, type: 'success', duration });
};

/**
 * Show error toast
 * @param {string} message - Error message
 * @param {number} duration - Duration in milliseconds
 * @returns {string} Toast ID
 */
const error = (message, duration = 5000) => {
  return show({ message, type: 'error', duration });
};

/**
 * Show warning toast
 * @param {string} message - Warning message
 * @param {number} duration - Duration in milliseconds
 * @returns {string} Toast ID
 */
const warning = (message, duration = 5000) => {
  return show({ message, type: 'warning', duration });
};

/**
 * Show info toast
 * @param {string} message - Info message
 * @param {number} duration - Duration in milliseconds
 * @returns {string} Toast ID
 */
const info = (message, duration = 5000) => {
  return show({ message, type: 'info', duration });
};

/**
 * Dismiss a toast by ID
 * @param {string} id - Toast ID
 */
const dismiss = (id) => {
  const index = toasts.value.findIndex((toast) => toast.id === id);
  if (index > -1) {
    toasts.value.splice(index, 1);
  }
};

/**
 * Dismiss all toasts
 */
const dismissAll = () => {
  toasts.value = [];
};

/**
 * Toast notification composable
 * Provides methods to show different types of toast notifications
 * Uses singleton pattern to share state across all components
 */
export function useToast() {
  return {
    toasts,
    show,
    success,
    error,
    warning,
    info,
    dismiss,
    dismissAll,
  };
}

