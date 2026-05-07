import apiHelper from '@/helpers/api.helper.js';
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

  /**
   * Add a workspace user into channel
   * @param {string} workspaceId
   * @param {string} channelId
   * @param {{ userId: string, memberRole?: 'manager' | 'member' }} payload
   */
  async addMember(workspaceId, channelId, payload) {
    const response = await apiHelper.post(
      API_ENDPOINTS.CHANNELS.ADD_MEMBER(workspaceId, channelId),
      payload
    );
    return response.data.data;
  }

  /**
   * Get members of a channel
   * @param {string} workspaceId
   * @param {string} channelId
   * @returns {Promise<Array<{channelId: string, userId: string, workspaceMemberId: string, name?: string, email?: string, avatar?: string, memberRole: 'manager' | 'member', joinedAt: Date}>>}
   */
  async getMembers(workspaceId, channelId) {
    const response = await apiHelper.get(
      API_ENDPOINTS.CHANNELS.GET_MEMBERS(workspaceId, channelId)
    );
    return response.data.data;
  }

  /**
   * Remove a member from channel
   * @param {string} workspaceId
   * @param {string} channelId
   * @param {string} userId
   */
  async kickMember(workspaceId, channelId, userId) {
    const response = await apiHelper.delete(
      API_ENDPOINTS.CHANNELS.KICK_MEMBER(workspaceId, channelId, userId)
    );
    return response.data.data;
  }

  /**
   * Update channel dynamic permissions settings (manager only).
   * Payload shape mirrors BE UpdateChannelPermissionsDto.
   */
  async updateChannelPermissions(workspaceId, channelId, payload) {
    const response = await apiHelper.patch(
      API_ENDPOINTS.CHANNELS.UPDATE_PERMISSIONS(workspaceId, channelId),
      payload
    );
    return response.data.data;
  }
}

export default new ChannelService();
