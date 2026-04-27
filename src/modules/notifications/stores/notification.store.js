import { defineStore } from "pinia";
import notificationService from "@/services/notification.service";
import notificationSocketHelper from "@/helpers/notification-socket.helper";

const NOTIFICATION_NAMESPACE = "/notifications";

export const useNotificationStore = defineStore("notification", {
  state: () => ({
    items: [],
    unreadCount: 0,
    loading: false,
    loadingUnread: false,
    error: null,
    isPanelOpen: false,
    listenersBound: false,
  }),

  actions: {
    async fetchNotifications(workspaceId, options = {}) {
      this.loading = true;
      this.error = null;
      try {
        const data = await notificationService.getNotifications({
          workspaceId,
          page: options.page || 1,
          size: options.size || 20,
        });
        this.items = data?.items || [];
        return this.items;
      } catch (error) {
        this.error = error;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchUnreadCount(workspaceId) {
      this.loadingUnread = true;
      try {
        const data = await notificationService.getUnreadCount(workspaceId);
        this.unreadCount = data?.totalUnread || 0;
        return this.unreadCount;
      } finally {
        this.loadingUnread = false;
      }
    },

    async markRead(notificationId, workspaceId) {
      await notificationService.markRead(notificationId);
      this.items = this.items.map((item) =>
        item.id === notificationId ? { ...item, readAt: new Date().toISOString() } : item
      );
      await this.fetchUnreadCount(workspaceId);
    },

    async markAllRead(workspaceId) {
      await notificationService.markReadAll(workspaceId);
      this.items = this.items.map((item) => ({ ...item, readAt: new Date().toISOString() }));
      await this.fetchUnreadCount(workspaceId);
    },

    async connectRealtime(workspaceId) {
      await notificationSocketHelper.connect(NOTIFICATION_NAMESPACE);
      if (this.listenersBound) {
        return;
      }

      notificationSocketHelper.on("notification.created", async (payload) => {
        this.items = [payload, ...this.items];
        await this.fetchUnreadCount(workspaceId);
      });
      notificationSocketHelper.on("notification.unread_count_changed", (payload) => {
        this.unreadCount = payload?.unreadCount ?? this.unreadCount;
      });
      this.listenersBound = true;
    },

    disconnectRealtime() {
      if (!this.listenersBound) return;
      notificationSocketHelper.off("notification.created");
      notificationSocketHelper.off("notification.unread_count_changed");
      notificationSocketHelper.disconnect();
      this.listenersBound = false;
    },

    async openPanel(workspaceId) {
      this.isPanelOpen = true;
      await this.fetchNotifications(workspaceId);
      await this.fetchUnreadCount(workspaceId);
    },

    closePanel() {
      this.isPanelOpen = false;
    },
  },
});
