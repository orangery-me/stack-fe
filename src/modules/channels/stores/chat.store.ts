import { defineStore } from "pinia";
import chatService from "../../../services/chat.service";
import socketHelper from "../../../helpers/socketHelper";
import { CHAT_EVENTS, CHAT_NAMESPACE } from "../constants";
import { useAuthStore } from "../../auth/stores/auth.store";
import type {
  MessageStatus,
  ChatMessage,
  PendingMessageInfo,
  SendMessagePayload,
} from "../types";
import {
  PENDING_MESSAGE_TIMEOUT,
  DEFAULT_AUTHOR_NAME,
  UNKNOWN_AUTHOR_NAME,
  TEMP_ID_PREFIX,
} from "../constants";

export type { MessageStatus, ChatMessage } from "../types";

function generateTempId(): string {
  return `${TEMP_ID_PREFIX}${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;
}

export const useChatStore = defineStore("chat", {
  state: () => ({
    messagesByChannel: {} as Record<string, ChatMessage[]>,
    messagesLoading: false,
    messagesError: null as Error | null,
    socketListeners: {} as Record<string, { members: any[] } | boolean>,
    pendingMessages: {} as Record<string, PendingMessageInfo>,
  }),

  getters: {
    getMessagesByChannelId: (state) => (channelId: string) => {
      return state.messagesByChannel[channelId] || [];
    },
  },

  actions: {
    // ==================== Message Fetching ====================

    async fetchMessages(
      workspaceId: string,
      channelId: string,
      members: any[] = []
    ) {
      this.messagesLoading = true;
      this.messagesError = null;

      try {
        const result: any = await chatService.getMessages(
          workspaceId,
          channelId
        );
        const messages = result?.data?.messages || [];

        this.messagesByChannel[channelId] = this.formatMessages(
          messages,
          members,
          "sent"
        );

        this.joinChannel(channelId);

        if (!this.socketListeners[channelId]) {
          this.setupSocketListeners(channelId, members);
        }
      } catch (error) {
        this.messagesError = error as Error;
        throw error;
      } finally {
        this.messagesLoading = false;
      }
    },

    // ==================== Message Sending ====================

    sendMessage({ workspaceId, channelId, content }: SendMessagePayload) {
      if (!content?.trim()) return;

      const trimmedContent = content.trim();
      const authStore = useAuthStore();
      const tempId = generateTempId();

      // Create optimistic message
      const user = authStore.user as { id?: string; name?: string } | null;
      const optimisticMessage: ChatMessage = {
        id: tempId,
        senderId: user?.id ?? "",
        authorName: user?.name || DEFAULT_AUTHOR_NAME,
        content: trimmedContent,
        createdAt: new Date().toISOString(),
        channelId,
        status: "pending",
      };

      // Add message immediately to UI
      this.ensureChannelExists(channelId);
      this.messagesByChannel[channelId].push(optimisticMessage);

      console.log("[Chat Store] Sending message optimistic:", {
        tempId,
        channelId,
        content: this.truncateContent(trimmedContent),
        workspaceId,
      });

      // Set timeout to mark as failed
      const timeoutId = window.setTimeout(() => {
        this.markMessageAsFailed(channelId, tempId);
      }, PENDING_MESSAGE_TIMEOUT);

      // Track pending message
      this.pendingMessages[tempId] = {
        timeoutId,
        channelId,
        content: trimmedContent,
      };

      // Emit socket event
      socketHelper.emit(CHAT_EVENTS.SEND_CHANNEL_MESSAGE, {
        workspaceId,
        channelId,
        content: trimmedContent,
      });
    },

    retryMessage(channelId: string, messageId: string, workspaceId: string) {
      const messages = this.messagesByChannel[channelId];
      if (!messages) return;

      const index = messages.findIndex(
        (m) => m.id === messageId && m.status === "failed"
      );

      if (index >= 0) {
        const failedMessage = messages[index];
        messages.splice(index, 1);

        this.sendMessage({
          workspaceId,
          channelId,
          content: failedMessage.content,
        });
      }
    },

    // ==================== Message Status Management ====================

    markMessageAsFailed(channelId: string, tempId: string) {
      const messages = this.messagesByChannel[channelId];
      if (!messages) return;

      const index = messages.findIndex((m) => m.id === tempId);
      if (index >= 0 && messages[index].status === "pending") {
        console.log(
          "[Chat Store] Message timed out, marking as failed:",
          tempId
        );
        messages[index].status = "failed";
      }

      this.cleanupPendingMessage(tempId);
    },

    confirmPendingMessage(channelId: string, serverMessage: any): boolean {
      const messages = this.messagesByChannel[channelId];
      if (!messages) return false;

      // Find the pending message in the local messages
      const pendingIndex = messages.findIndex(
        (m) =>
          m.status === "pending" &&
          m.content === serverMessage.content &&
          m.channelId === channelId
      );

      if (pendingIndex < 0) return false;

      const pendingMessage = messages[pendingIndex];
      const tempId = pendingMessage.id;

      // Clear timeout and cleanup
      if (this.pendingMessages[tempId]) {
        window.clearTimeout(this.pendingMessages[tempId].timeoutId);
        this.cleanupPendingMessage(tempId);
      }

      // Update message with server data
      messages[pendingIndex] = {
        ...pendingMessage,
        id: serverMessage.id,
        senderId: serverMessage.senderId,
        createdAt: serverMessage.createdAt,
        status: "sent",
      };

      return true;
    },

    // ==================== Socket Management ====================

    joinChannel(channelId: string) {
      socketHelper.emit(CHAT_EVENTS.JOIN_CHANNEL, { channelId });
    },

    setupSocketListeners(channelId: string, members: any[] = []) {
      this.socketListeners[channelId] = { members };

      // Setup global listeners only once
      if (this.socketListeners._globalSetup) return;
      this.socketListeners._globalSetup = true;

      // Connect to chat namespace with logging enabled
      socketHelper.connect(CHAT_NAMESPACE, { enableLogging: true });

      socketHelper.on(
        CHAT_EVENTS.NEW_MESSAGE,
        this.handleNewMessage.bind(this)
      );
      socketHelper.on(
        CHAT_EVENTS.MESSAGE_SENT,
        this.handleMessageSent.bind(this)
      );
      socketHelper.on(CHAT_EVENTS.ERROR, this.handleSocketError.bind(this));
    },
    // Handle new message from server
    handleNewMessage(message: any) {
      const channelId = message.channelId;
      const channelData = this.socketListeners[channelId];

      if (!channelId || !channelData || typeof channelData === "boolean")
        return;

      console.log("[Chat Store] Received new_message:", {
        messageId: message.id,
        channelId,
        senderId: message.senderId,
        content: this.truncateContent(message.content),
      });

      const formattedMessage = this.formatMessage(
        message,
        channelData.members || [],
        "sent"
      );

      this.ensureChannelExists(channelId);

      // Check for duplicates
      const exists = this.messagesByChannel[channelId].some(
        (m) =>
          m.id === message.id ||
          (m.status === "pending" && m.content === message.content)
      );

      if (!exists) {
        this.messagesByChannel[channelId].push(formattedMessage);
      } else {
        console.log("[Chat Store] Message already exists, skipping duplicate");
      }
    },
    // Handle message sent confirmation
    handleMessageSent(message: any) {
      const channelId = message.channelId;
      const channelData = this.socketListeners[channelId];

      if (!channelId || !channelData || typeof channelData === "boolean")
        return;

      // Confirm pending message first
      if (this.confirmPendingMessage(channelId, message)) return;

      // Fallback: add as new message
      const formattedMessage = this.formatMessage(
        message,
        channelData.members || [],
        "sent"
      );

      this.ensureChannelExists(channelId);
      // Check for duplicates
      const exists = this.messagesByChannel[channelId].some(
        (m) => m.id === message.id
      );

      if (!exists) {
        this.messagesByChannel[channelId].push(formattedMessage);
      }
    },

    handleSocketError(error: any) {
      console.error("[Chat] Socket error:", error);
      this.messagesError = error;

      // Mark all pending messages as failed
      Object.keys(this.pendingMessages).forEach((tempId) => {
        const pending = this.pendingMessages[tempId];
        if (pending) {
          window.clearTimeout(pending.timeoutId);
          this.markMessageAsFailed(pending.channelId, tempId);
        }
      });
    },

    // ==================== Cleanup ====================

    cleanupChannelListeners(channelId: string) {
      if (this.socketListeners[channelId]) {
        delete this.socketListeners[channelId];
      }
    },

    cleanupChannelChat(channelId: string) {
      // Clear pending message timeouts for this channel
      Object.keys(this.pendingMessages).forEach((tempId) => {
        const pending = this.pendingMessages[tempId];
        if (pending?.channelId === channelId) {
          window.clearTimeout(pending.timeoutId);
          this.cleanupPendingMessage(tempId);
        }
      });

      if (this.messagesByChannel[channelId]) {
        delete this.messagesByChannel[channelId];
      }

      this.cleanupChannelListeners(channelId);
    },

    cleanupPendingMessage(tempId: string) {
      if (this.pendingMessages[tempId]) {
        delete this.pendingMessages[tempId];
      }
    },

    // ==================== Message Formatting ====================

    formatMessage(
      message: any,
      members: any[] = [],
      status: MessageStatus = "sent"
    ): ChatMessage {
      const author = members.find((m) => m.id === message.senderId);
      const authorName =
        author?.name || message.senderName || UNKNOWN_AUTHOR_NAME;

      return {
        id: message.id,
        senderId: message.senderId,
        authorName,
        content: message.content,
        createdAt: message.createdAt,
        channelId: message.channelId,
        status: message.status || status,
      };
    },

    formatMessages(
      messages: any[],
      members: any[] = [],
      status: MessageStatus = "sent"
    ): ChatMessage[] {
      return messages.map((message) =>
        this.formatMessage(message, members, status)
      );
    },

    // ==================== Utilities ====================

    ensureChannelExists(channelId: string) {
      if (!this.messagesByChannel[channelId]) {
        this.messagesByChannel[channelId] = [];
      }
    },

    initChannelChat(_workspaceId: string, channelId: string) {
      this.ensureChannelExists(channelId);
    },

    truncateContent(content: string | undefined, maxLength = 50): string {
      if (!content) return "";
      return content.length > maxLength
        ? `${content.substring(0, maxLength)}...`
        : content;
    },
  },
});
