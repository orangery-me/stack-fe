import { defineStore } from 'pinia';
import channelService from '@/services/channel.service.js';

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
  }),

  getters: {
    /**
     * Get channel by ID
     */
    getChannelById: (state) => (channelId) => {
      return state.channels.find((channel) => channel.id === channelId);
    },
  },

  actions: {
    async fetchUserChannels (workspaceId) {
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

    async createChannel (workspaceId, channelData) {
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

    selectChannel (channelId) {
      const channel = this.getChannelById(channelId);
      if (channel) {
        this.selectedChannel = channel;
      }
    },

    /**
     * Clear selected channel
     */
    clearSelectedChannel () {
      this.selectedChannel = null;
    },

    async fetchChannelById (workspaceId, channelId) {
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
  },
});
