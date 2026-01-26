import { defineStore } from "pinia";
import chatService from "../../../services/chat.service";
import socketService, { CHAT_EVENTS } from "../../../services/socket.service";

export const useChatStore = defineStore("chat", {
  state: () => ({
    messagesByChannel: {},
    messagesLoading: false,
    messagesError: null,
    socketListeners: {}, // Track listeners per channelId
  }),
  getters: {
    getMessagesByChannelId: (state) => (channelId) => {
      return state.messagesByChannel[channelId] || [];
    },
  },
  actions: {
    async fetchMessages(channelId, members: any[] = []) {
      this.messagesLoading = true;
      this.messagesError = null;
      try {
        const result: any = await chatService.getMessagesByChannelId(channelId);
        const messages = result?.messages || [];

        // Format messages with authorName
        const formattedMessages = this.formatMessages(messages, members);

        // Store messages by channelId
        this.messagesByChannel[channelId] = formattedMessages;

        // Join channel room
        this.joinChannel(channelId);

        // Setup socket listeners (only once per channel)
        if (!this.socketListeners[channelId]) {
          this.setupSocketListeners(channelId, members);
        }
      } catch (error) {
        this.messagesError = error;
        throw error;
      } finally {
        this.messagesLoading = false;
      }
    },

    sendMessage({ workspaceId, channelId, content }) {
      if (!content || !content.trim()) return;

      const messageData = {
        workspaceId,
        channelId,
        content: content.trim(),
      };

      console.log("[Chat Store] 📤 Sending message:", {
        channelId,
        content:
          content.trim().substring(0, 50) +
          (content.trim().length > 50 ? "..." : ""),
        workspaceId,
      });

      socketService.emit(CHAT_EVENTS.SEND_CHANNEL_MESSAGE, messageData);
    },

    joinChannel(channelId) {
      socketService.emit(CHAT_EVENTS.JOIN_CHANNEL, { channelId });
    },

    setupSocketListeners(channelId, members: any[] = []) {
      // Mark that listeners are set up for this channel
      this.socketListeners[channelId] = { members };

      // Setup global listeners only once (they handle all channels)
      if (!this.socketListeners._globalSetup) {
        this.socketListeners._globalSetup = true;

        // Listen for new messages (handles all channels)
        const newMessageHandler = (message: any) => {
          const channelId = message.channelId;
          if (!channelId || !this.socketListeners[channelId]) return;

          console.log("[Chat Store] 📥 Received new_message:", {
            messageId: message.id,
            channelId,
            senderId: message.senderId,
            content:
              message.content?.substring(0, 50) +
              (message.content?.length > 50 ? "..." : ""),
          });

          const channelData = this.socketListeners[channelId];
          const formattedMessage = this.formatMessage(
            message,
            channelData.members || []
          );

          if (!this.messagesByChannel[channelId]) {
            this.messagesByChannel[channelId] = [];
          }
          // Check if message already exists (avoid duplicates)
          const exists = this.messagesByChannel[channelId].some(
            (m: any) => m.id === message.id
          );
          if (!exists) {
            this.messagesByChannel[channelId].push(formattedMessage);
          } else {
            console.log(
              "[Chat Store] ⚠️ Message already exists, skipping duplicate"
            );
          }
        };

        // Listen for message sent confirmation (handles all channels)
        const messageSentHandler = (message: any) => {
          const channelId = message.channelId;
          if (!channelId || !this.socketListeners[channelId]) return;

          console.log("[Chat Store] ✅ Received message_sent confirmation:", {
            messageId: message.id,
            channelId,
            senderId: message.senderId,
          });

          const channelData = this.socketListeners[channelId];
          const formattedMessage = this.formatMessage(
            message,
            channelData.members || []
          );

          if (!this.messagesByChannel[channelId]) {
            this.messagesByChannel[channelId] = [];
          }
          // Update or add message
          const index = this.messagesByChannel[channelId].findIndex(
            (m: any) => m.id === message.id
          );
          if (index >= 0) {
            this.messagesByChannel[channelId][index] = formattedMessage;
          } else {
            this.messagesByChannel[channelId].push(formattedMessage);
          }
        };

        // Listen for errors
        const errorHandler = (error: any) => {
          console.error("[Chat] Socket error:", error);
          this.messagesError = error;
        };

        // Register global listeners
        socketService.on(CHAT_EVENTS.NEW_MESSAGE, newMessageHandler);
        socketService.on(CHAT_EVENTS.MESSAGE_SENT, messageSentHandler);
        socketService.on(CHAT_EVENTS.ERROR, errorHandler);
      }
    },

    cleanupChannelListeners(channelId) {
      // Remove channel from listeners tracking (global listeners remain active)
      if (this.socketListeners[channelId]) {
        delete this.socketListeners[channelId];
      }
    },

    formatMessage(message: any, members: any[] = []) {
      // Find author name from members
      const author = members.find((m: any) => m.id === message.senderId);
      const authorName = author?.name || message.senderName || "Unknown";

      return {
        id: message.id,
        senderId: message.senderId,
        authorName,
        content: message.content,
        createdAt: message.createdAt,
        channelId: message.channelId,
      };
    },

    formatMessages(messages: any[], members: any[] = []) {
      return messages.map((message) => this.formatMessage(message, members));
    },

    cleanupChannelChat(channelId) {
      // Clear messages for this channel
      if (this.messagesByChannel[channelId]) {
        delete this.messagesByChannel[channelId];
      }
      // Cleanup listeners
      this.cleanupChannelListeners(channelId);
    },

    initChannelChat(workspaceId, channelId) {
      // Initialize empty messages array for channel
      if (!this.messagesByChannel[channelId]) {
        this.messagesByChannel[channelId] = [];
      }
    },
  },
});
