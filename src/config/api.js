// API Configuration
// REST API (stack-api - authentication, workspaces, channels, users, ...)
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8105/api';

// WebSocket / Realtime API (stack-chat - chat service)
export const CHAT_BASE_URL = import.meta.env.VITE_CHAT_BASE_URL || 'http://localhost:3000';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    GOOGLE_LOGIN: '/auth/google/login',
    VERIFY_EMAIL: '/auth/verify-email',
  },
  WORKSPACES: {
    CREATE: '/workspaces',
    GET_MY_WORKSPACES: '/workspaces/me',
    DETAIL_BY_ID: (id) => `/workspaces/${id}`,
    INVITE: (id) => `/workspaces/${id}/invite`,
    ACCEPT_INVITE: '/workspaces/invite/accept',
    GET_MEMBERS: (id) => `/workspaces/${id}/members`,
  },
  USERS: {
    SEARCH: '/users/search',
  },
  CHANNELS: {
    GET_USER_CHANNELS: (workspaceId) => `/workspaces/${workspaceId}/channels/my`,
    GET_ALL_CHANNELS: (workspaceId) => `/workspaces/${workspaceId}/channels`,
    CREATE: (workspaceId) => `/workspaces/${workspaceId}/channels`,
    GET_BY_ID: (workspaceId, channelId) => `/workspaces/${workspaceId}/channels/${channelId}`,
  },
};

