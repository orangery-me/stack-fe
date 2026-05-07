import apiHelper from "@/helpers/api.helper";
import { API_ENDPOINTS } from "@/config/api.js";

const notificationService = {
  async getNotifications(params = {}) {
    const response = await apiHelper.get(API_ENDPOINTS.NOTIFICATIONS.LIST, { params });
    return response.data.data;
  },

  async getUnreadCount(workspaceId) {
    const response = await apiHelper.get(API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT, {
      params: workspaceId ? { workspaceId } : {},
    });
    return response.data.data;
  },

  async markRead(notificationId) {
    const response = await apiHelper.patch(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(notificationId));
    return response.data.data;
  },

  async markReadAll(workspaceId) {
    const response = await apiHelper.patch(API_ENDPOINTS.NOTIFICATIONS.MARK_READ_ALL, null, {
      params: workspaceId ? { workspaceId } : {},
    });
    return response.data.data;
  },
};

export default notificationService;
