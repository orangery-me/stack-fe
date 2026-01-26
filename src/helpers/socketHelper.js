import { io } from 'socket.io-client';
import { API_BASE_URL } from '@/config/api.js';

class SocketHelper {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.isConnected = false;
    this.namespace = null;
  }

  connect(namespace = '/', options = {}) {
    const { enableLogging = false } = options;

    // If already connected to the same namespace, return existing socket
    if (this.socket && this.isConnected && this.namespace === namespace) {
      return this.socket;
    }

    // Disconnect existing connection if namespace changed
    if (this.socket && this.namespace !== namespace) {
      this.disconnect();
    }

    const accessToken = localStorage.getItem('accessToken');

    // Connect to stack-api WebSocket gateway (remove /api suffix)
    const baseUrl = API_BASE_URL.replace(/\/api\/?$/, '').replace(/\/$/, '');

    this.namespace = namespace;
    this.enableLogging = enableLogging;

    this.socket = io(baseUrl + namespace, {
      transports: ['websocket'],
      auth: {
        token: accessToken,
      },
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      // Re-register listeners after reconnect
      this.listeners.forEach((handlers, event) => {
        handlers.forEach((handler) => {
          this.socket.on(event, handler);
        });
      });
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error?.message || error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.namespace = null;
      this.listeners.clear();
    }
  }

  on(event, handler) {
    if (!this.socket) {
      throw new Error('Socket not connected. Call connect() first.');
    }

    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    const handlers = this.listeners.get(event);
    if (!handlers.has(handler)) {
      handlers.add(handler);
      this.socket.on(event, handler);
    }
  }

  off(event, handler) {
    if (!this.socket) return;
    const handlers = this.listeners.get(event);
    if (!handlers) return;

    if (handler) {
      if (handlers.has(handler)) {
        handlers.delete(handler);
        this.socket.off(event, handler);
      }
    } else {
      // Remove all handlers for this event
      handlers.forEach((h) => {
        this.socket.off(event, h);
      });
      this.listeners.delete(event);
    }

    if (handlers.size === 0) {
      this.listeners.delete(event);
    }
  }

  emit(event, payload) {
    if (!this.socket) {
      throw new Error('Socket not connected. Call connect() first.');
    }

    // Log outgoing socket events if logging is enabled
    if (this.enableLogging) {
      console.log(`[Socket Helper] 📤 Emitting event: ${event}`, payload);
    }

    this.socket.emit(event, payload);
  }

  getConnectionStatus() {
    return this.isConnected;
  }

  getNamespace() {
    return this.namespace;
  }
}

const socketHelper = new SocketHelper();

export default socketHelper;
