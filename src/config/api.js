export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8105/api';

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
    GET_MEMBERS: (workspaceId, channelId) =>
      `/workspaces/${workspaceId}/channels/${channelId}/members`,
    ADD_MEMBER: (workspaceId, channelId) =>
      `/workspaces/${workspaceId}/channels/${channelId}/members`,
    KICK_MEMBER: (workspaceId, channelId, userId) =>
      `/workspaces/${workspaceId}/channels/${channelId}/members/${userId}`,
  },
  CHAT: {
    GET_MESSAGES: (workspaceId, channelId) => `/workspaces/${workspaceId}/channels/${channelId}/messages`,
    SEND_MESSAGE: (workspaceId, channelId) => `/workspaces/${workspaceId}/channels/${channelId}/messages`,
  },
  NOTIFICATIONS: {
    LIST: "/notifications",
    UNREAD_COUNT: "/notifications/unread-count",
    MARK_READ: (id) => `/notifications/${id}/read`,
    MARK_READ_ALL: "/notifications/read-all",
  },
  CANVAS: {
    // List & create (query channelId)
    GET_ALL: (channelId) => `/canvases?channelId=${channelId}`,
    CREATE: (channelId) => `/canvases?channelId=${channelId}`,
    // By canvasId only
    GET_BY_ID: (canvasId) => `/canvases/${canvasId}`,
    UPDATE: (canvasId) => `/canvases/${canvasId}`,
    SAVE_CONTENT: (canvasId) => `/canvases/${canvasId}/content`,
    // Versions
    GET_VERSIONS: (canvasId) => `/canvases/${canvasId}/versions`,
    GET_VERSION: (canvasId, version) => `/canvases/${canvasId}/versions/${version}`,
    CREATE_VERSION: (canvasId) => `/canvases/${canvasId}/versions`,
    REVERT_VERSION: (canvasId, version) =>
      `/canvases/${canvasId}/versions/${version}/revert`,
  },
  CANVAS_WORKSPACE: {
    CREATE: (workspaceId) => `/workspaces/${workspaceId}/canvases`,
    MY: (workspaceId) => `/workspaces/${workspaceId}/canvases/my`,
    RECENT: (workspaceId) => `/workspaces/${workspaceId}/canvases/recent`,
    SHARED_WITH_ME: (workspaceId) => `/workspaces/${workspaceId}/canvases/shared-with-me`,
  },
  AGENT: {
    ASK: '/agent/ask',
    ASK_STREAM: '/agent/ask/stream',
    SESSIONS_ACTIVE: '/agent/sessions/active',
    SESSIONS: '/agent/sessions',
    SESSION_MESSAGES: (sessionId) => `/agent/sessions/${sessionId}/messages`,
    SESSION_UPDATE: (sessionId) => `/agent/sessions/${sessionId}`,
    SESSION_SEND: (sessionId) => `/agent/sessions/${sessionId}/messages`,
    SESSION_SEND_STREAM: (sessionId) => `/agent/sessions/${sessionId}/messages/stream`,
    SESSION_CANVAS_SEND_STREAM: (sessionId) => `/agent/sessions/${sessionId}/canvas/messages/stream`,
    CANVAS_WRITE_STREAM: '/agent/canvas/write/stream',
    CANVAS_APPLY_ACTION: '/agent/canvas/actions/apply',
  },
};

