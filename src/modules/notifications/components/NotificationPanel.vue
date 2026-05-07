<script setup>
import { computed } from "vue";
import { useNotificationStore } from "@/modules/notifications/stores/notification.store.js";
import { formatDistanceToNow } from "date-fns";

const props = defineProps({
  workspaceId: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["close"]);

const notificationStore = useNotificationStore();
const notifications = computed(() => notificationStore.items);

const markAllNotificationsRead = async () => {
  await notificationStore.markAllRead(props.workspaceId);
};

const markNotificationRead = async (notificationId) => {
  await notificationStore.markRead(notificationId, props.workspaceId);
};

// Helper for relative time
const formatTime = (dateString) => {
  if (!dateString) return "";
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch (e) {
    return dateString;
  }
};

// Helper to get a nicely formatted type label
const getTypeLabel = (type) => {
  if (!type) return "System";
  if (type.startsWith("task.")) return "Task";
  if (type.startsWith("channel.")) return "Channel";
  if (type.startsWith("workspace.")) return "Workspace";
  return "Activity";
};
</script>

<template>
  <div
    class="notification-overlay"
    @click.self="emit('close')"
  >
    <div class="notification-panel">
      <div class="notification-panel-header">
        <h3>Notifications</h3>
        <button
          class="settings-btn"
          type="button"
          title="Mark all as read"
          @click="markAllNotificationsRead"
        >
          <v-icon
            name="fc-check-mark"
            scale="1.2"
          />
        </button>
      </div>

      <div
        v-if="notificationStore.loading"
        class="notification-empty"
      >
        <div
          class="spinner-border text-primary"
          role="status"
        >
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
      
      <div
        v-else-if="notifications.length === 0"
        class="notification-empty"
      >
        <v-icon
          name="fc-info"
          scale="3"
          class="empty-icon"
        />
        <p>No notifications yet.</p>
      </div>
      
      <div
        v-else
        class="notification-list"
      >
        <div
          v-for="item in notifications"
          :key="item.id"
          class="notification-item"
          :class="{ unread: !item.readAt }"
          @click="markNotificationRead(item.id)"
        >
          <div class="notification-avatar">
            <v-icon
              :name="item.payload?.icon || 'fc-info'"
              scale="1.5"
            />
            <div
              v-if="!item.readAt"
              class="unread-dot"
            />
          </div>
          <div class="notification-content">
            <!-- notification title -->
            <div class="notification-title">
              <strong>{{ item.title }}</strong>
            </div>
            <div class="notification-body">
              <strong v-if="item.payload?.actorName">{{ item.payload.actorName }}</strong> 
              <span v-if="item.payload?.actorName">&nbsp;</span>
              <span> {{ item.body }}</span>
            </div>
            <div class="notification-meta">
              <span class="meta-type">{{ getTypeLabel(item.type) }}</span>
              <span class="meta-dot">&bull;</span>
              <span class="meta-time">{{ formatTime(item.createdAt) }}</span>
            </div>
          </div>
          <div class="notification-actions">
            <button
              class="more-btn"
              @click.stop
            >
              <i class="pi pi-ellipsis-v" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.notification-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.24);
  display: flex;
  justify-content: flex-end;
  z-index: 1200;
  backdrop-filter: blur(2px);
}

.notification-panel {
  width: min(420px, 100%);
  background: #ffffff;
  height: 100%;
  border-left: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.08);
}

.notification-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 24px 16px 24px;
  border-bottom: 1px solid #f1f5f9;

  h3 {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: -0.01em;
  }

  .settings-btn {
    border: none;
    background: transparent;
    cursor: pointer;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background 0.2s;

    &:hover {
      background: #f1f5f9;
    }
  }
}

.notification-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  color: #64748b;
  font-size: 15px;

  .empty-icon {
    margin-bottom: 16px;
    opacity: 0.8;
  }
  
  p {
    margin: 0;
  }
}

.notification-list {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 8px 0;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px 24px;
  background: transparent;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid #f8fafc;

  &:hover {
    background: #f8fafc;
  }

  &.unread {
    background: #f0fdf4;
    
    &:hover {
      background: #e6fced;
    }
  }
}

.notification-avatar {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid #e2e8f0;

  .unread-dot {
    position: absolute;
    top: -2px;
    right: -2px;
    width: 12px;
    height: 12px;
    background: #3b82f6;
    border: 2px solid #ffffff;
    border-radius: 50%;
  }
}

.notification-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 2px;
}

.notification-body {
  font-size: 14.5px;
  color: #334155;
  line-height: 1.4;
  
  :deep(strong) {
    color: #0f172a;
    font-weight: 600;
  }
}

.notification-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #64748b;
  
  .meta-type {
    font-weight: 500;
  }
}

.notification-actions {
  flex-shrink: 0;
  
  .more-btn {
    border: none;
    background: transparent;
    cursor: pointer;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    color: #94a3b8;
    transition: all 0.2s;

    &:hover {
      background: #f1f5f9;
      color: #475569;
    }
  }
}
</style>
