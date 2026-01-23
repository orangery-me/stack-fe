export const PENDING_MESSAGE_TIMEOUT = 10000; // 10 seconds
export const DEFAULT_AUTHOR_NAME = 'You';
export const UNKNOWN_AUTHOR_NAME = 'Unknown';
export const TEMP_ID_PREFIX = 'temp_';

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

export const CHAT_NAMESPACE = '/chat';
