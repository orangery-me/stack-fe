import apiHelper from '@/helpers/apiHelper.js';
import { API_ENDPOINTS } from '@/config/api.js';

/**
 * Channel API Service
 */
class ChannelService {
  /**
   * Get channels where user is a member
   * @param {string} workspaceId - ID of the workspace
   * @returns {Promise<Array<{id: string, workspaceId: string, type: string, name?: string, createdById: string, createdAt: Date}>>}
   */
  async getUserChannels(workspaceId) {
    const response = await apiHelper.get(API_ENDPOINTS.CHANNELS.GET_USER_CHANNELS(workspaceId));
    return response.data.data;
  }

  /**
   * Get all channels in a workspace (admin only)
   * @param {string} workspaceId - ID of the workspace
   * @returns {Promise<Array<{id: string, workspaceId: string, type: string, name?: string, createdById: string, createdAt: Date, metadata?: object, settings?: object}>>}
   */
  async getAllChannels(workspaceId) {
    const response = await apiHelper.get(API_ENDPOINTS.CHANNELS.GET_ALL_CHANNELS(workspaceId));
    return response.data.data;
  }

  /**
   * Create a new channel in a workspace
   * @param {string} workspaceId - ID of the workspace
   * @param {Object} channelData
   * @param {string} channelData.type - Channel type (public/private/dm/group_dm)
   * @param {string} [channelData.name] - Channel name (can be null for DM)
   * @param {Object} [channelData.metadata] - Channel metadata
   * @param {Object} [channelData.settings] - Channel settings
   * @returns {Promise<{id: string, workspaceId: string, type: string, name?: string, createdById: string, createdAt: Date}>}
   */
  async createChannel(workspaceId, channelData) {
    const response = await apiHelper.post(
      API_ENDPOINTS.CHANNELS.CREATE(workspaceId),
      channelData
    );
    return response.data.data;
  }

  /**
   * Get channel details by ID
   * @param {string} workspaceId - ID of the workspace
   * @param {string} channelId - ID of the channel
   * @returns {Promise<{id: string, workspaceId: string, type: string, name?: string, createdById: string, createdAt: Date, metadata?: object, settings?: object}>}
   */
  async getChannelById(workspaceId, channelId) {
    const response = await apiHelper.get(
      API_ENDPOINTS.CHANNELS.GET_BY_ID(workspaceId, channelId)
    );
    return response.data.data;
  }
}

export default new ChannelService();
