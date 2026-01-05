import { defineStore } from 'pinia';
import workspaceService from '@/services/workspace.service.js';

export const useWorkspaceStore = defineStore('workspace', {
  state: () => ({
    // List of workspaces of current user
    workspaces: [],
    workspacesLoading: false,
    workspacesError: null,

    // Create workspace state
    createWorkspaceLoading: false,
    createWorkspaceError: null,

    // Members of a specific workspace
    members: [],
    membersLoading: false,
    membersError: null,

    // Invite member state
    inviteMemberLoading: false,
    inviteMemberError: null,

    // Accept invite state
    acceptInviteLoading: false,
    acceptInviteError: null,
  }),

  actions: {
    /**
     * Fetch list of workspaces of current user
     */
    async fetchMyWorkspaces() {
      this.workspacesLoading = true;
      this.workspacesError = null;
      try {
        const list = await workspaceService.getMyWorkspaces();
        this.workspaces = list;
        return list;
      } catch (error) {
        this.workspacesError = error;
        throw error;
      } finally {
        this.workspacesLoading = false;
      }
    },

    /**
     * Create a new workspace
     * The caller can handle navigation/toast using the returned data
     */
    async createWorkspace(workspaceData) {
      this.createWorkspaceLoading = true;
      this.createWorkspaceError = null;
      try {
        const workspace = await workspaceService.createWorkspace(workspaceData);
        // Optionally refresh my workspaces list in background
        this.fetchMyWorkspaces().catch(() => {});
        return workspace;
      } catch (error) {
        this.createWorkspaceError = error;
        throw error;
      } finally {
        this.createWorkspaceLoading = false;
      }
    },

    /**
     * Fetch members of a workspace and store in state
     */
    async fetchMembers(workspaceId) {
      this.membersLoading = true;
      this.membersError = null;
      try {
        const members = await workspaceService.getWorkspaceMembers(workspaceId);
        this.members = members;
        return members;
      } catch (error) {
        this.membersError = error;
        throw error;
      } finally {
        this.membersLoading = false;
      }
    },

    /**
     * Invite a member to workspace
     * Also refresh members list after successful invite
     */
    async inviteMember(workspaceId, inviteData) {
      this.inviteMemberLoading = true;
      this.inviteMemberError = null;
      try {
        await workspaceService.inviteMember(workspaceId, inviteData);
        // Refresh members to reflect newly invited user
        await this.fetchMembers(workspaceId);
      } catch (error) {
        this.inviteMemberError = error;
        throw error;
      } finally {
        this.inviteMemberLoading = false;
      }
    },

    /**
     * Accept workspace invitation by token
     */
    async acceptInvite(token) {
      this.acceptInviteLoading = true;
      this.acceptInviteError = null;
      try {
        const result = await workspaceService.acceptInvite(token);
        return result;
      } catch (error) {
        this.acceptInviteError = error;
        throw error;
      } finally {
        this.acceptInviteLoading = false;
      }
    },
  },
});


