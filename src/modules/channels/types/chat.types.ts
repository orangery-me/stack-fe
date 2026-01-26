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
  createdAt: string;
  channelId: string;
  status: MessageStatus;
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
