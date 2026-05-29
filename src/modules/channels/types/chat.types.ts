/**
 * Chat message status
 */
export type MessageStatus = "pending" | "sent" | "failed";

/**
 * Chat message interface
 */
export interface ChatMessage {
  id: string;
  senderId: string;
  authorName: string;
  content: string;
  messageType?: string;
  createdAt: string;
  channelId: string;
  status: MessageStatus;
  metadata?: Record<string, any>;
}

/**
 * Pending message tracking info
 */
export interface PendingMessageInfo {
  timeoutId: number;
  channelId: string;
  content: string;
}

/**
 * Send message payload
 */
export interface SendMessagePayload {
  workspaceId: string;
  channelId: string;
  content: string;
}

/**
 * Socket listener channel data
 */
export interface ChannelListenerData {
  members: any[];
}
