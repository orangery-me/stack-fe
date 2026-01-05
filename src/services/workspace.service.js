import apiService from './api.service.js';
import { API_ENDPOINTS } from '@/config/api.js';

/**
 * Workspace API Service
 */
class WorkspaceService {
  /**
   * Create a new workspace
   * @param {Object} workspaceData
   * @param {string} workspaceData.name - Name of the workspace
   * @param {string} workspaceData.displayName - Display name of creator in workspace
   * @param {Array<{email: string, roleId: string}>} [workspaceData.invites] - Array of invites
   * @param {string} [workspaceData.plan] - Plan type (free/pro/enterprise)
   * @returns {Promise<{id: string, name: string, slug: string, ownerId: string, plan: string, settings?: object, createdAt: Date}>}
   */
  async createWorkspace(workspaceData) {
    const response = await apiService.post(API_ENDPOINTS.WORKSPACES.CREATE, workspaceData);
    return response.data.data;
  }

  /**
   * Invite a member to workspace
   * @param {string} workspaceId - ID of the workspace
   * @param {Object} inviteData
   * @param {string} inviteData.email - Email of the user to invite
   * @param {string} inviteData.roleId - ID of the role to assign
   * @returns {Promise<{message: string}>}
   */
  async inviteMember(workspaceId, inviteData) {
    const response = await apiService.post(
      API_ENDPOINTS.WORKSPACES.INVITE(workspaceId),
      inviteData
    );
    return response.data.data;
  }

  /**
   * Accept workspace invitation
   * @param {string} token - Invitation token from email
   * @returns {Promise<{message: string, workspaceId: string}>}
   */
  async acceptInvite(token) {
    const response = await apiService.post(API_ENDPOINTS.WORKSPACES.ACCEPT_INVITE, {
      token,
    });
    return response.data.data;
  }

  /**
   * Get list of workspaces for current user
   * @returns {Promise<Array<{id: string, name: string, slug: string, ownerId: string, plan: string, settings?: object, createdAt: Date}>>}
   */
  async getMyWorkspaces() {
    const response = await apiService.get(API_ENDPOINTS.WORKSPACES.GET_MY_WORKSPACES);
    return response.data.data;
  }

  /**
   * Get list of members in a workspace
   * @param {string} workspaceId - ID of the workspace
   * @returns {Promise<Array<{id: string, workspaceId: string, userId: string, email: string, name: string, avatar?: string, roleId: string, roleName: string, permissions?: object, status: string, joinedAt: Date}>>}
   */
  async getWorkspaceMembers(workspaceId) {
    const response = await apiService.get(API_ENDPOINTS.WORKSPACES.GET_MEMBERS(workspaceId));
    return response.data.data;
  }
}

export default new WorkspaceService();

