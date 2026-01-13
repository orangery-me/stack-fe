import { defineStore } from 'pinia';
import channelService from '@/services/channel.service.js';
import socketService, { CHAT_EVENTS } from '@/services/socket.service.js';

export const useChannelStore = defineStore('channel', {
  state: () => ({
    // List of channels for current workspace
    channels: [],
    channelsLoading: false,
    channelsError: null,

    // Selected channel
    selectedChannel: null,
    selectedChannelLoading: false,
    selectedChannelError: null,

    // Create channel state
    createChannelLoading: false,
    createChannelError: null,

    // Chat messages per conversation/channel
    messagesByConversation: {},
    isSocketConnected: false,
    sendMessageError: null,
  }),

  getters: {
    /**
     * Get channel by ID
     */
    getChannelById: (state) => (channelId) => {
      return state.channels.find((channel) => channel.id === channelId);
    },

    /**
     * Get messages for current selected channel (mapped to conversation)
     */
    currentChannelMessages(state) {
      if (!state.selectedChannel) return [];
      const conversationId = state.selectedChannel.conversationId || state.selectedChannel.id;
      return state.messagesByConversation[conversationId] || [];
    },
  },

  actions: {
    /**
     * Fetch channels where user is a member
     * @param {string} workspaceId - ID of the workspace
     */
    async fetchUserChannels(workspaceId) {
      this.channelsLoading = true;
      this.channelsError = null;
      try {
        const channels = await channelService.getUserChannels(workspaceId);
        this.channels = channels;
        return channels;
      } catch (error) {
        this.channelsError = error;
        throw error;
      } finally {
        this.channelsLoading = false;
      }
    },

    /**
     * Create a new channel
     * @param {string} workspaceId - ID of the workspace
     * @param {Object} channelData - Channel data (type, name, etc.)
     */
    async createChannel(workspaceId, channelData) {
      this.createChannelLoading = true;
      this.createChannelError = null;
      try {
        const channel = await channelService.createChannel(workspaceId, channelData);
        // Add to channels list
        this.channels.push(channel);
        return channel;
      } catch (error) {
        this.createChannelError = error;
        throw error;
      } finally {
        this.createChannelLoading = false;
      }
    },

    /**
     * Select a channel
     * @param {string} channelId - ID of the channel to select
     */
    selectChannel(channelId) {
      const channel = this.getChannelById(channelId);
      if (channel) {
        this.selectedChannel = channel;
      }
    },

    /**
     * Clear selected channel
     */
    clearSelectedChannel() {
      this.selectedChannel = null;
    },

    /**
     * Fetch channel details by ID
     * @param {string} workspaceId - ID of the workspace
     * @param {string} channelId - ID of the channel
     */
    async fetchChannelById(workspaceId, channelId) {
      this.selectedChannelLoading = true;
      this.selectedChannelError = null;
      try {
        const channel = await channelService.getChannelById(workspaceId, channelId);
        this.selectedChannel = channel;
        return channel;
      } catch (error) {
        this.selectedChannelError = error;
        throw error;
      } finally {
        this.selectedChannelLoading = false;
      }
    },

    /**
     * Initialize chat for a conversation/channel:
     * - ensure socket connection
     * - subscribe to new_message events
     */
    initChannelChat(workspaceId, channel) {
      if (!channel) return;

      const conversationId = channel.conversationId || channel.id;

      // Ensure socket is connected
      socketService.connect();
      this.isSocketConnected = socketService.isConnected;

      // Listener for new messages in this conversation
      const handleNewMessage = (message) => {
        if (message.conversationId !== conversationId) return;
        if (!this.messagesByConversation[conversationId]) {
          this.messagesByConversation[conversationId] = [];
        }
        this.messagesByConversation[conversationId].push({
          id: message.id,
          authorName: message.senderName || 'User',
          content: message.content,
          createdAt: message.createdAt,
          isOwn: false,
        });
      };

      // Store handler reference on channel instance (runtime only)
      channel._chatNewMessageHandler = handleNewMessage;

      socketService.on(CHAT_EVENTS.NEW_MESSAGE, handleNewMessage);
    },

    /**
     * Cleanup chat when leaving channel:
     * - unsubscribe listeners
     */
    cleanupChannelChat(channel) {
      if (!channel) return;
      const handler = channel._chatNewMessageHandler;
      if (handler) {
        socketService.off(CHAT_EVENTS.NEW_MESSAGE, handler);
        delete channel._chatNewMessageHandler;
      }
    },

    /**
     * Send message to current channel
     */
    async sendMessage({ workspaceId, channel, content }) {
      const trimmed = content.trim();
      if (!trimmed || !channel) return;

      this.sendMessageError = null;

      const conversationId = channel.conversationId || channel.id;

      // Optimistic UI: add temporary message
      if (!this.messagesByConversation[conversationId]) {
        this.messagesByConversation[conversationId] = [];
      }

      const now = new Date();
      const tempId = `temp-${now.getTime()}`;

      const tempMessage = {
        id: tempId,
        authorName: 'You',
        content: trimmed,
        createdAt: now.toISOString(),
        isOwn: true,
        _isTemp: true,
      };

      this.messagesByConversation[conversationId].push(tempMessage);

      try {
        socketService.emit(CHAT_EVENTS.SEND_MESSAGE, {
          workspaceId,
          conversationId,
          content: trimmed,
        });
      } catch (error) {
        this.sendMessageError = error;
        // Mark temp message as failed
        const list = this.messagesByConversation[conversationId];
        const index = list.findIndex((m) => m.id === tempId);
        if (index !== -1) {
          list[index] = { ...list[index], _failed: true };
        }
      }
    },
  },
});
