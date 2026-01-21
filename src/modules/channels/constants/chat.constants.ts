/**
 * Timeout for pending messages before marking as failed (in milliseconds)
 */
export const PENDING_MESSAGE_TIMEOUT = 10000; // 10 seconds

/**
 * Default author name for messages when user info is unavailable
 */
export const DEFAULT_AUTHOR_NAME = 'You';

/**
 * Fallback author name for messages from unknown senders
 */
export const UNKNOWN_AUTHOR_NAME = 'Unknown';

/**
 * Temp ID prefix for optimistic messages
 */
export const TEMP_ID_PREFIX = 'temp_';
