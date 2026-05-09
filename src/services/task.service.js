import apiHelper from '@/helpers/api.helper.js';
import { API_ENDPOINTS } from '@/config/api.js';

/**
 * Task & TaskList API Service
 */
class TaskService {
  // ─── Task Lists ─────────────────────────────────────────

  async getTaskLists(workspaceId, channelId) {
    const response = await apiHelper.get(
      API_ENDPOINTS.TASK_LISTS.LIST(workspaceId, channelId)
    );
    return response.data.data;
  }

  async createTaskList(workspaceId, channelId, data = {}) {
    const response = await apiHelper.post(
      API_ENDPOINTS.TASK_LISTS.CREATE(workspaceId, channelId),
      data
    );
    return response.data.data;
  }

  async updateTaskList(workspaceId, taskListId, data) {
    const response = await apiHelper.patch(
      API_ENDPOINTS.TASK_LISTS.UPDATE(workspaceId, taskListId),
      data
    );
    return response.data.data;
  }

  async deleteTaskList(workspaceId, taskListId) {
    const response = await apiHelper.delete(
      API_ENDPOINTS.TASK_LISTS.DELETE(workspaceId, taskListId)
    );
    return response.data.data;
  }

  // ─── Tasks ──────────────────────────────────────────────

  async getTasksByList(workspaceId, taskListId, filters = {}) {
    const response = await apiHelper.get(
      API_ENDPOINTS.TASKS.LIST_BY_LIST(workspaceId, taskListId),
      { params: filters }
    );
    return response.data.data;
  }

  async createTask(workspaceId, taskListId, data) {
    const response = await apiHelper.post(
      API_ENDPOINTS.TASKS.CREATE(workspaceId, taskListId),
      data
    );
    return response.data.data;
  }

  async getTaskById(workspaceId, taskId) {
    const response = await apiHelper.get(
      API_ENDPOINTS.TASKS.GET_BY_ID(workspaceId, taskId)
    );
    return response.data.data;
  }

  async updateTask(workspaceId, taskId, data) {
    const response = await apiHelper.patch(
      API_ENDPOINTS.TASKS.UPDATE(workspaceId, taskId),
      data
    );
    return response.data.data;
  }

  /**
   * Upload one file; appends attachment on server. Use FormData (do not set JSON Content-Type).
   */
  async uploadTaskAttachment(workspaceId, taskId, file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiHelper.post(
      API_ENDPOINTS.TASKS.UPLOAD_ATTACHMENT(workspaceId, taskId),
      formData,
      {
        headers: { 'Content-Type': false },
      }
    );
    return response.data.data;
  }

  async deleteTask(workspaceId, taskId) {
    const response = await apiHelper.delete(
      API_ENDPOINTS.TASKS.DELETE(workspaceId, taskId)
    );
    return response.data.data;
  }

  async getMyTasks(workspaceId, filters = {}) {
    const response = await apiHelper.get(
      API_ENDPOINTS.TASKS.MY_TASKS(workspaceId),
      { params: filters }
    );
    return response.data.data;
  }

  async assignTask(workspaceId, taskId, workspaceMemberId) {
    const response = await apiHelper.post(
      API_ENDPOINTS.TASKS.ASSIGN(workspaceId, taskId),
      { workspaceMemberId }
    );
    return response.data.data;
  }

  async unassignTask(workspaceId, taskId, memberId) {
    const response = await apiHelper.delete(
      API_ENDPOINTS.TASKS.UNASSIGN(workspaceId, taskId, memberId)
    );
    return response.data.data;
  }
}

export default new TaskService();
