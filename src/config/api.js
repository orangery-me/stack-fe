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
    DIRECT_MESSAGES: (workspaceId) => `/workspaces/${workspaceId}/channels/direct-messages`,
    GET_BY_ID: (workspaceId, channelId) => `/workspaces/${workspaceId}/channels/${channelId}`,
    GET_MEMBERS: (workspaceId, channelId) =>
      `/workspaces/${workspaceId}/channels/${channelId}/members`,
    ADD_MEMBER: (workspaceId, channelId) =>
      `/workspaces/${workspaceId}/channels/${channelId}/members`,
    KICK_MEMBER: (workspaceId, channelId, userId) =>
      `/workspaces/${workspaceId}/channels/${channelId}/members/${userId}`,
    UPDATE_PERMISSIONS: (workspaceId, channelId) =>
      `/workspaces/${workspaceId}/channels/${channelId}/settings/permissions`,
  },
  TASK_LISTS: {
    LIST: (workspaceId, channelId) =>
      `/workspaces/${workspaceId}/channels/${channelId}/task-lists`,
    CREATE: (workspaceId, channelId) =>
      `/workspaces/${workspaceId}/channels/${channelId}/task-lists`,
    UPDATE: (workspaceId, taskListId) =>
      `/workspaces/${workspaceId}/task-lists/${taskListId}`,
    DELETE: (workspaceId, taskListId) =>
      `/workspaces/${workspaceId}/task-lists/${taskListId}`,
  },
  TASKS: {
    LIST_BY_LIST: (workspaceId, taskListId) =>
      `/workspaces/${workspaceId}/task-lists/${taskListId}/tasks`,
    CREATE: (workspaceId, taskListId) =>
      `/workspaces/${workspaceId}/task-lists/${taskListId}/tasks`,
    MY_TASKS: (workspaceId) =>
      `/workspaces/${workspaceId}/tasks/my`,
    GET_BY_ID: (workspaceId, taskId) =>
      `/workspaces/${workspaceId}/tasks/${taskId}`,
    UPDATE: (workspaceId, taskId) =>
      `/workspaces/${workspaceId}/tasks/${taskId}`,
    DELETE: (workspaceId, taskId) =>
      `/workspaces/${workspaceId}/tasks/${taskId}`,
    UPLOAD_ATTACHMENT: (workspaceId, taskId) =>
      `/workspaces/${workspaceId}/tasks/${taskId}/attachments/upload`,
    ASSIGN: (workspaceId, taskId) =>
      `/workspaces/${workspaceId}/tasks/${taskId}/assignees`,
    UNASSIGN: (workspaceId, taskId, memberId) =>
      `/workspaces/${workspaceId}/tasks/${taskId}/assignees/${memberId}`,
  },
  CHAT: {
    GET_MESSAGES: (workspaceId, channelId) => `/workspaces/${workspaceId}/channels/${channelId}/messages`,
    SEND_MESSAGE: (workspaceId, channelId) => `/workspaces/${workspaceId}/channels/${channelId}/messages`,
    UPLOAD_ATTACHMENT: (workspaceId, channelId) =>
      `/workspaces/${workspaceId}/channels/${channelId}/messages/attachments/upload`,
    PIN_MESSAGE: (workspaceId, channelId, messageId) =>
      `/workspaces/${workspaceId}/channels/${channelId}/messages/${messageId}/pin`,
    DELETE_MESSAGE: (workspaceId, channelId, messageId) =>
      `/workspaces/${workspaceId}/channels/${channelId}/messages/${messageId}`,
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
    GET_ACCESS: (canvasId) => `/canvases/${canvasId}/access`,
    GET_COLLAB_TOKEN: (canvasId) => `/canvases/${canvasId}/collab-token`,
    GET_PERMISSIONS: (canvasId) => `/canvases/${canvasId}/permissions`,
    SHARE_USER: (canvasId) => `/canvases/${canvasId}/permissions/users`,
    SHARE_CHANNEL: (canvasId) => `/canvases/${canvasId}/permissions/channels`,
    UPDATE_VISIBILITY: (canvasId) => `/canvases/${canvasId}/visibility`,
    REMOVE_PERMISSION: (canvasId, permissionId) => `/canvases/${canvasId}/permissions/${permissionId}`,
    SAVE_CONTENT: (canvasId) => `/canvases/${canvasId}/content`,
    // Versions
    GET_VERSIONS: (canvasId) => `/canvases/${canvasId}/versions`,
    GET_VERSION: (canvasId, version) => `/canvases/${canvasId}/versions/${version}`,
    CREATE_VERSION: (canvasId) => `/canvases/${canvasId}/versions`,
    REVERT_VERSION: (canvasId, version) =>
      `/canvases/${canvasId}/versions/${version}/revert`,
    SUGGESTIONS: (canvasId) => `/canvas/${canvasId}/suggestions`,
    ACCEPT_SUGGESTION: (canvasId, suggestionId) =>
      `/canvas/${canvasId}/suggestions/${suggestionId}/accept`,
    REJECT_SUGGESTION: (canvasId, suggestionId) =>
      `/canvas/${canvasId}/suggestions/${suggestionId}/reject`,
    ACCEPT_ALL_SUGGESTIONS: (canvasId) =>
      `/canvas/${canvasId}/suggestions/accept-all`,
    REJECT_ALL_SUGGESTIONS: (canvasId) =>
      `/canvas/${canvasId}/suggestions/reject-all`,
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
    SESSION_MESSAGE_ACTION_STATUS: (sessionId, messageId, actionId) =>
      `/agent/sessions/${sessionId}/messages/${messageId}/actions/${actionId}`,
    SESSION_UPDATE: (sessionId) => `/agent/sessions/${sessionId}`,
    SESSION_SEND: (sessionId) => `/agent/sessions/${sessionId}/messages`,
    SESSION_SEND_STREAM: (sessionId) => `/agent/sessions/${sessionId}/messages/stream`,
    SESSION_CANVAS_SEND_STREAM: (sessionId) => `/agent/sessions/${sessionId}/canvas/messages/stream`,
    SESSION_TASK_SEND_STREAM: (sessionId) => `/agent/sessions/${sessionId}/tasks/messages/stream`,
    CANVAS_WRITE_STREAM: '/agent/canvas/write/stream',
    CANVAS_APPLY_ACTION: '/agent/canvas/actions/apply',
    TASK_APPLY_ACTION: '/agent/tasks/actions/apply',
    TASK_APPLY_ACTION_STREAM: '/agent/tasks/actions/apply/stream',
  },
};
