import { io } from 'socket.io-client';
import { CHAT_BASE_URL } from '@/config/api.js';

const CHAT_NAMESPACE = '/chat';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.isConnected = false;
  }

  connect () {
    if (this.socket && this.isConnected) {
      return this.socket;
    }

    const accessToken = localStorage.getItem('accessToken');

    const baseUrl = CHAT_BASE_URL.replace(/\/api\/?$/, '').replace(/\/$/, '');

    this.socket = io(baseUrl + CHAT_NAMESPACE, {
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

  disconnect () {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
    }
  }

  on (event, handler) {
    if (!this.socket) {
      this.connect();
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

  off (event, handler) {
    if (!this.socket) return;
    const handlers = this.listeners.get(event);
    if (!handlers) return;

    if (handlers.has(handler)) {
      handlers.delete(handler);
      this.socket.off(event, handler);
    }

    if (handlers.size === 0) {
      this.listeners.delete(event);
    }
  }

  emit (event, payload) {
    if (!this.socket) {
      this.connect();
    }

    // Log outgoing socket events (especially chat messages)
    if (event === 'send_channel_message' || event === 'join_channel') {
      console.log(`[Socket Service] 📤 Emitting event: ${event}`, {
        channelId: payload?.channelId,
        ...(event === 'send_channel_message' && {
          content: payload?.content?.substring(0, 50) + (payload?.content?.length > 50 ? "..." : ""),
        }),
      });
    }

    this.socket.emit(event, payload);
  }
}

const socketService = new SocketService();

export const CHAT_EVENTS = {
  // Channel messaging
  SEND_CHANNEL_MESSAGE: 'send_channel_message',
  // Direct messaging
  SEND_DM_MESSAGE: 'send_dm_message',

  // Generic chat events
  NEW_MESSAGE: 'new_message',
  MESSAGE_SENT: 'message_sent',
  ERROR: 'error',

  // Room management
  JOIN_CHANNEL: 'join_channel',

  // Message loading / pagination
  LOAD_MESSAGES: 'load_messages',
  MESSAGES_LOADED: 'messages_loaded',
};

export default socketService;

