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

    directMessageLoading: false,
    directMessageError: null,

    // Channel members cache by channelId
    channelMembersById: {},
    channelMembersLoadingById: {},
    channelMembersErrorById: {},
  }),

  getters: {
    /**
     * Get channel by ID
     */
    getChannelById: (state) => (channelId) => {
      return state.channels.find((channel) => channel.id === channelId);
    },
    getChannelMembersById: (state) => (channelId) => {
      return state.channelMembersById[channelId] || [];
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

    async findOrCreateDirectMessage (workspaceId, targetUserId) {
      this.directMessageLoading = true;
      this.directMessageError = null;
      try {
        const channel = await channelService.findOrCreateDirectMessage(workspaceId, {
          targetUserId,
        });
        const existingIndex = this.channels.findIndex((item) => item.id === channel.id);
        if (existingIndex >= 0) {
          this.channels[existingIndex] = {
            ...this.channels[existingIndex],
            ...channel,
          };
        } else {
          this.channels.push(channel);
        }
        this.selectedChannel = this.channels.find((item) => item.id === channel.id) || channel;
        await this.fetchChannelMembers(workspaceId, channel.id, { force: true });
        return this.selectedChannel;
      } catch (error) {
        this.directMessageError = error;
        throw error;
      } finally {
        this.directMessageLoading = false;
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

    async fetchChannelMembers (workspaceId, channelId, options = {}) {
      const { force = false } = options;
      if (!workspaceId || !channelId) {
        return [];
      }

      if (!force && Array.isArray(this.channelMembersById[channelId])) {
        return this.channelMembersById[channelId];
      }

      this.channelMembersLoadingById[channelId] = true;
      this.channelMembersErrorById[channelId] = null;

      try {
        const members = await channelService.getMembers(workspaceId, channelId);
        this.channelMembersById[channelId] = members;
        return members;
      } catch (error) {
        this.channelMembersErrorById[channelId] = error;
        throw error;
      } finally {
        this.channelMembersLoadingById[channelId] = false;
      }
    },

    async addMemberToChannel (workspaceId, channelId, payload) {
      const result = await channelService.addMember(workspaceId, channelId, payload);
      if (Array.isArray(this.channelMembersById[channelId])) {
        await this.fetchChannelMembers(workspaceId, channelId, { force: true });
      }
      return result;
    },

    async kickMemberFromChannel (workspaceId, channelId, userId) {
      const result = await channelService.kickMember(workspaceId, channelId, userId);
      if (Array.isArray(this.channelMembersById[channelId])) {
        this.channelMembersById[channelId] = this.channelMembersById[channelId].filter(
          (member) => member.userId !== userId
        );
      }
      return result;
    },

    async updateChannelPermissions(workspaceId, channelId, payload) {
      await channelService.updateChannelPermissions(workspaceId, channelId, payload);
      return this.fetchChannelById(workspaceId, channelId);
    },
  },
});
