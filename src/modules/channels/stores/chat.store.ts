import { defineStore } from "pinia";
import socketHelper from "../../../helpers/socket.helper";
import { CHAT_EVENTS, CHAT_NAMESPACE } from "../constants";
import { useAuthStore } from "../../auth/stores/auth.store";
import { queryClient } from "@/config/queryClient";
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
    socketListeners: {} as Record<string, { members: any[] } | boolean>,
    pendingMessages: {} as Record<string, PendingMessageInfo>,
  }),

  actions: {
    // Helper to mutate Vue Query Cache
    updateQueryCache(channelId: string, updater: (oldData: any) => any) {
      queryClient.setQueryData(['messages', channelId], updater);
    },

    getMessagesFromCache(channelId: string): ChatMessage[] {
      const data: any = queryClient.getQueryData(['messages', channelId]);
      if (!data) return [];
      // Combine all pages
      return data.pages?.flatMap((page: any) => page.messages || []) || [];
    },

    // ==================== Message Sending ====================

    async sendMessage({ workspaceId, channelId, content }: SendMessagePayload) {
      if (!content?.trim()) return;

      const trimmedContent = content.trim();
      const authStore = useAuthStore();
      const tempId = generateTempId();

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

      // Add optimistic message to cache (append to first page assuming latest messages are there)
      this.updateQueryCache(channelId, (oldData: any) => {
        if (!oldData || !oldData.pages) return oldData;
        const newPages = [...oldData.pages];
        if (!newPages[0]) newPages[0] = { messages: [] };
        newPages[0] = {
          ...newPages[0],
          messages: [...(newPages[0].messages || []), optimisticMessage]
        };
        return { ...oldData, pages: newPages };
      });

      console.log("[Chat Store] Sending message optimistic:", { tempId, channelId });

      const timeoutId = window.setTimeout(() => {
        this.markMessageAsFailed(channelId, tempId);
      }, PENDING_MESSAGE_TIMEOUT);

      this.pendingMessages[tempId] = {
        timeoutId,
        channelId,
        content: trimmedContent,
      };

      await socketHelper.emit(CHAT_EVENTS.SEND_CHANNEL_MESSAGE, {
        workspaceId,
        channelId,
        content: trimmedContent,
      });
    },

    retryMessage(channelId: string, messageId: string, workspaceId: string) {
      const messages = this.getMessagesFromCache(channelId);
      const failedMessage = messages.find(
        (m) => m.id === messageId && m.status === "failed"
      );

      if (failedMessage) {
        // Remove from cache
        this.updateQueryCache(channelId, (oldData: any) => {
          if (!oldData || !oldData.pages) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              messages: (page.messages || []).filter((m: any) => m.id !== messageId)
            }))
          };
        });

        this.sendMessage({
          workspaceId,
          channelId,
          content: failedMessage.content,
        });
      }
    },

    // ==================== Message Status Management ====================

    markMessageAsFailed(channelId: string, tempId: string) {
      this.updateQueryCache(channelId, (oldData: any) => {
        if (!oldData || !oldData.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            messages: (page.messages || []).map((m: any) => 
              m.id === tempId && m.status === "pending" ? { ...m, status: "failed" } : m
            )
          }))
        };
      });

      this.cleanupPendingMessage(tempId);
    },

    confirmPendingMessage(channelId: string, serverMessage: any): boolean {
      const messages = this.getMessagesFromCache(channelId);
      
      const pendingMessage = messages.find(
        (m) =>
          m.status === "pending" &&
          m.content === serverMessage.content &&
          m.channelId === channelId
      );

      if (!pendingMessage) return false;

      const tempId = pendingMessage.id;

      if (this.pendingMessages[tempId]) {
        window.clearTimeout(this.pendingMessages[tempId].timeoutId);
        this.cleanupPendingMessage(tempId);
      }

      this.updateQueryCache(channelId, (oldData: any) => {
        if (!oldData || !oldData.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            messages: (page.messages || []).map((m: any) => 
              m.id === tempId ? {
                ...m,
                id: serverMessage.id,
                senderId: serverMessage.senderId,
                createdAt: serverMessage.createdAt,
                status: "sent",
              } : m
            )
          }))
        };
      });

      return true;
    },

    // ==================== Socket Management ====================

    async joinChannel(channelId: string) {
      try {
        await socketHelper.emit(CHAT_EVENTS.JOIN_CHANNEL, { channelId });
      } catch (error) {
        console.error("[Chat Store] Failed to join channel:", error);
        throw error;
      }
    },

    async setupSocketListeners(channelId: string, members: any[] = []) {
      this.socketListeners[channelId] = { members };

      if (this.socketListeners._globalSetup) {
        await socketHelper.waitForConnection();
        return;
      }
      this.socketListeners._globalSetup = true;

      await socketHelper.connect(CHAT_NAMESPACE, { enableLogging: true });

      socketHelper.on(CHAT_EVENTS.NEW_MESSAGE, this.handleNewMessage.bind(this));
      socketHelper.on(CHAT_EVENTS.MESSAGE_SENT, this.handleMessageSent.bind(this));
      socketHelper.on(CHAT_EVENTS.ERROR, this.handleSocketError.bind(this));
    },

    handleNewMessage(message: any) {
      const channelId = message.channelId;
      const channelData = this.socketListeners[channelId];

      if (!channelId || !channelData || typeof channelData === "boolean") return;

      const formattedMessage = this.formatMessage(message, channelData.members || [], "sent");

      const exists = this.getMessagesFromCache(channelId).some(
        (m) => m.id === message.id || (m.status === "pending" && m.content === message.content)
      );

      if (!exists) {
        this.updateQueryCache(channelId, (oldData: any) => {
          if (!oldData || !oldData.pages) return oldData;
          const newPages = [...oldData.pages];
          if (!newPages[0]) newPages[0] = { messages: [] };
          newPages[0] = {
            ...newPages[0],
            messages: [...(newPages[0].messages || []), formattedMessage]
          };
          return { ...oldData, pages: newPages };
        });
      }
    },

    handleMessageSent(message: any) {
      const channelId = message.channelId;
      const channelData = this.socketListeners[channelId];

      if (!channelId || !channelData || typeof channelData === "boolean") return;

      if (this.confirmPendingMessage(channelId, message)) return;

      const formattedMessage = this.formatMessage(message, channelData.members || [], "sent");

      const exists = this.getMessagesFromCache(channelId).some((m) => m.id === message.id);

      if (!exists) {
        this.updateQueryCache(channelId, (oldData: any) => {
          if (!oldData || !oldData.pages) return oldData;
          const newPages = [...oldData.pages];
          if (!newPages[0]) newPages[0] = { messages: [] };
          newPages[0] = {
            ...newPages[0],
            messages: [...(newPages[0].messages || []), formattedMessage]
          };
          return { ...oldData, pages: newPages };
        });
      }
    },

    handleSocketError(error: any) {
      console.error("[Chat] Socket error:", error);

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

    cleanupPendingMessage(tempId: string) {
      if (this.pendingMessages[tempId]) {
        delete this.pendingMessages[tempId];
      }
    },

    // ==================== Message Formatting ====================

    formatMessage(message: any, members: any[] = [], status: MessageStatus = "sent"): ChatMessage {
      const author = members.find((m) => m.id === message.senderId);
      const authorName = author?.name || message.senderName || UNKNOWN_AUTHOR_NAME;

      return {
        id: message.id,
        senderId: message.senderId,
        authorName,
        content: message.content,
        messageType: message.messageType || "text",
        createdAt: message.createdAt,
        channelId: message.channelId,
        status: message.status || status,
      };
    },

    formatMessages(messages: any[], members: any[] = [], status: MessageStatus = "sent"): ChatMessage[] {
      return messages.map((message) => this.formatMessage(message, members, status));
    },

    // ==================== Utilities ====================

    truncateContent(content: string | undefined, maxLength = 50): string {
      if (!content) return "";
      return content.length > maxLength ? `${content.substring(0, maxLength)}...` : content;
    },
  },
});
