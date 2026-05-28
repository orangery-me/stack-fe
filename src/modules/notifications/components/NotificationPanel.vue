<script setup>
import { ref, watch } from "vue";
import Drawer from "primevue/drawer";
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

const drawerVisible = ref(true);

watch(drawerVisible, (v) => {
  if (!v) emit("close");
});

watch(
  () => props.workspaceId,
  () => {
    drawerVisible.value = true;
  }
);

const markAllNotificationsRead = async () => {
  await notificationStore.markAllRead(props.workspaceId);
};

const markNotificationRead = async (notificationId) => {
  await notificationStore.markRead(notificationId, props.workspaceId);
};

const formatTime = (dateString) => {
  if (!dateString) return "";
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch (e) {
    return dateString;
  }
};

const getTypeLabel = (type) => {
  if (!type) return "System";
  if (type.startsWith("task.")) return "Task";
  if (type.startsWith("channel.")) return "Channel";
  if (type.startsWith("workspace.")) return "Workspace";
  return "Activity";
};

const getTypeClass = (type) => {
  if (!type) return "type-system";
  if (type.startsWith("task.")) return "type-task";
  if (type.startsWith("channel.")) return "type-channel";
  if (type.startsWith("workspace.")) return "type-workspace";
  return "type-activity";
};

const getFormattedBody = (item) => {
  const actor = item.payload?.actorName;
  let body = item.body || "";
  if (actor && body.startsWith(actor)) {
    body = body.slice(actor.length).trim();
  }
  return body;
};
</script>

<template>
  <Drawer
    v-model:visible="drawerVisible"
    position="right"
    class="notification-drawer !w-full md:!min-w-[24rem] md:!w-[min(420px,100vw)]"
  >
    <template #header>
      <div class="drawer-header-custom">
        <h3 class="drawer-title">Notifications</h3>
        <span v-if="notificationStore.unreadCount > 0" class="unread-badge">
          {{ notificationStore.unreadCount }} new
        </span>
      </div>
    </template>

    <div class="notification-panel-inner">
      <div class="notification-panel-toolbar">
        <button
          class="mark-all-btn"
          type="button"
          :disabled="notificationStore.unreadCount === 0"
          @click="markAllNotificationsRead"
        >
          <i class="pi pi-check-circle" />
          <span>Mark all as read</span>
        </button>
      </div>

      <div
        v-if="notificationStore.loading"
        class="notification-loading"
      >
        <div class="elegant-spinner">
          <div class="spinner-dot"></div>
          <div class="spinner-dot"></div>
          <div class="spinner-dot"></div>
        </div>
        <span>Retrieving updates...</span>
      </div>

      <div
        v-else-if="notificationStore.items.length === 0"
        class="notification-empty"
      >
        <div class="empty-illustration">
          <div class="illustration-ring"></div>
          <div class="illustration-ring-inner"></div>
          <v-icon
            name="fc-sms"
            scale="2.2"
            class="empty-icon"
          />
        </div>
        <h4 class="empty-title">All caught up!</h4>
        <p class="empty-desc">Your notification feed is clear. When new activities happen, they'll appear here.</p>
      </div>

      <div
        v-else
        class="notification-list"
      >
        <div
          v-for="item in notificationStore.items"
          :key="item.id"
          class="notification-item"
          :class="{ unread: !item.readAt }"
          @click="markNotificationRead(item.id)"
        >
          <div class="notification-avatar">
            <v-icon
              :name="item.payload?.icon || 'fc-info'"
              scale="1.3"
            />
            <div
              v-if="!item.readAt"
              class="unread-dot"
            />
          </div>
          <div class="notification-content">
            <div class="notification-title">
              {{ item.title }}
            </div>
            <div class="notification-body">
              <strong class="actor-name" v-if="item.payload?.actorName">{{ item.payload.actorName }}</strong>
              <span v-if="item.payload?.actorName">&nbsp;</span>
              <span class="body-text">{{ getFormattedBody(item) }}</span>
            </div>
            <div class="notification-meta">
              <span class="meta-type" :class="getTypeClass(item.type)">{{ getTypeLabel(item.type) }}</span>
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
  </Drawer>
</template>

<style scoped lang="scss">
:deep(.p-drawer) {
  background: var(--ui-bg-page, #FAF8F6) !important;
  border-left: 1px solid var(--ui-border, #E7E1DB) !important;
  box-shadow: -4px 0 24px rgba(31, 26, 23, 0.04) !important;
}

:deep(.p-drawer-header) {
  padding: 16px 20px !important;
  border-bottom: 1px solid var(--ui-divider, #E7E1DB) !important;
  background: var(--ui-bg-surface, #FFFDFB) !important;

  .p-drawer-close-button {
    width: 30px !important;
    height: 30px !important;
    border-radius: 8px !important;
    color: var(--ui-text-muted, #8E8883) !important;
    transition: all var(--ui-duration-fast, 150ms) var(--ui-ease, ease-out) !important;

    &:hover {
      background: var(--gray-100, #F1ECE6) !important;
      color: var(--ui-text, #1F1A17) !important;
      transform: rotate(90deg);
    }
  }
}

:deep(.p-drawer-content) {
  padding: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--ui-bg-page, #FAF8F6);
}

.drawer-header-custom {
  display: flex;
  align-items: center;
  gap: 8px;
}

.drawer-title {
  font-size: 17px;
  font-weight: 800;
  color: var(--ui-text, #1F1A17);
  margin: 0;
  letter-spacing: -0.01em;
}

.unread-badge {
  font-size: 11px;
  font-weight: 700;
  background: var(--primary-500, #E95C47);
  color: #FFFDFB;
  padding: 1px 7px;
  border-radius: 20px;
  box-shadow: 0 2px 6px rgba(233, 92, 71, 0.2);
  animation: float-badge 3s ease-in-out infinite;
}

@keyframes float-badge {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-2px);
  }
}

.notification-panel-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.notification-panel-toolbar {
  display: flex;
  justify-content: flex-end;
  padding: 12px 18px 8px;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(231, 225, 219, 0.4);
  background: linear-gradient(to bottom, var(--ui-bg-surface), rgba(250, 248, 246, 0.4));

  .mark-all-btn {
    border: 1px solid var(--ui-border, #E7E1DB);
    background: var(--ui-bg-surface, #FFFDFB);
    color: var(--ui-text-muted, #8E8883);
    cursor: pointer;
    border-radius: 8px;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 6px;
    box-shadow: 0 1px 2px rgba(31, 26, 23, 0.02);
    transition: all var(--ui-duration-fast, 150ms) var(--ui-ease, ease-out);

    i {
      font-size: 13px;
      color: var(--ui-text-muted, #8E8883);
      transition: transform 0.4s var(--ui-ease), color 0.15s;
    }

    &:not(:disabled):hover {
      background: var(--primary-500, #E95C47);
      color: #FFFDFB;
      border-color: var(--primary-500, #E95C47);
      box-shadow: 0 4px 12px rgba(233, 92, 71, 0.15);

      i {
        color: #FFFDFB;
        transform: rotate(360deg);
      }
    }

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      background: rgba(241, 236, 230, 0.4);
      border-color: rgba(231, 225, 219, 0.6);
      box-shadow: none;
    }
  }
}

.notification-loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--ui-text-hint, #8E8883);
  font-size: 12.5px;
  font-weight: 500;
  
  .elegant-spinner {
    display: flex;
    gap: 6px;
    
    .spinner-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--primary-500, #E95C47);
      animation: dot-bounce 1.2s infinite ease-in-out both;
      
      &:nth-child(1) { animation-delay: -0.32s; }
      &:nth-child(2) { animation-delay: -0.16s; }
    }
  }
}

@keyframes dot-bounce {
  0%, 80%, 100% { 
    transform: scale(0);
    opacity: 0.3;
  } 
  40% { 
    transform: scale(1.0);
    opacity: 1;
  }
}

.notification-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 32px;
  text-align: center;
  color: var(--gray-700, #5F5A56);

  .empty-illustration {
    position: relative;
    width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
    
    .illustration-ring {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: rgba(233, 92, 71, 0.02);
      border: 1px dashed rgba(233, 92, 71, 0.12);
      animation: spin-slow 25s linear infinite;
    }
    
    .illustration-ring-inner {
      position: absolute;
      width: 72%;
      height: 72%;
      border-radius: 50%;
      background: rgba(233, 92, 71, 0.04);
      border: 1px solid rgba(233, 92, 71, 0.06);
    }

    .empty-icon {
      position: relative;
      z-index: 2;
      animation: float-icon 4s ease-in-out infinite;
    }
  }

  .empty-title {
    font-size: 15px;
    font-weight: 750;
    color: var(--ui-text, #1F1A17);
    margin: 0 0 6px 0;
  }

  .empty-desc {
    font-size: 12.5px;
    color: var(--ui-text-hint, #8E8883);
    margin: 0;
    line-height: 1.5;
    max-width: 260px;
  }
}

@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes float-icon {
  0%, 100% {
    transform: translateY(0) rotate(0);
  }
  50% {
    transform: translateY(-4px) rotate(3deg);
  }
}

.notification-list {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 10px 0 24px;
  flex: 1;
  min-height: 0;
  
  // Smooth scrollbar
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--gray-200, #E7E1DB);
    border-radius: 20px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: var(--gray-300, #D0C9C2);
  }
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin: 6px 16px;
  padding: 14px 16px;
  background: var(--ui-bg-surface, #FFFDFB);
  border: 2px solid var(--ui-border, #E7E1DB);
  border-radius: 12px;
  cursor: pointer;
  box-shadow: var(--ui-shadow-card, 0 1px 2px rgba(31, 26, 23, 0.02));
  transition: all var(--ui-duration, 0.2s) var(--ui-ease, ease-out);
  position: relative;
  
  // Staggered list entries
  animation: slide-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
  
  @for $i from 1 through 10 {
    &:nth-child(#{$i}) {
      animation-delay: #{$i * 0.04}s;
    }
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(31, 26, 23, 0.05), 0 0 1px rgba(233, 92, 71, 0.1);
    border-color: var(--primary-200, #F2C8BC);
    
    .actor-name {
      color: var(--primary-600, #D94B35);
    }
    
    .notification-avatar {
      transform: scale(1.03);
      border-color: var(--primary-200, #F2C8BC);
      box-shadow: 0 2px 6px rgba(233, 92, 71, 0.06);
    }
  }

  &.unread {
    background: linear-gradient(to right, rgba(233, 92, 71, 0.035), rgba(233, 92, 71, 0.005));
    border-color: rgba(233, 92, 71, 0.14);
    border-left: 3px solid var(--primary-500, #E95C47);
    border-radius: 4px 12px 12px 4px;

    &:hover {
      background: linear-gradient(to right, rgba(233, 92, 71, 0.05), rgba(233, 92, 71, 0.01));
      border-color: rgba(233, 92, 71, 0.25);
      border-left-color: var(--primary-600, #D94B35);
    }
  }
}

@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.notification-avatar {
  position: relative;
  width: 42px;
  height: 42px;
  border-radius: 10px; // squircle
  background: var(--ui-bg-page, #FAF8F6);
  border: 1px solid var(--ui-border, #E7E1DB);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: inset 0 1px 2px rgba(31, 26, 23, 0.01);
  transition: all 0.2s ease;
  
  .unread-dot {
    position: absolute;
    top: -2px;
    right: -2px;
    width: 9px;
    height: 9px;
    background: var(--primary-500, #E95C47);
    border: 2px solid var(--ui-bg-surface, #FFFDFB);
    border-radius: 50%;
    box-shadow: 0 0 6px rgba(233, 92, 71, 0.6);
    animation: pulse-glow 2.2s infinite ease-in-out;
  }
}

@keyframes pulse-glow {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(233, 92, 71, 0.7);
  }
  70% {
    transform: scale(1.15);
    box-shadow: 0 0 0 5px rgba(233, 92, 71, 0);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(233, 92, 71, 0);
  }
}

.notification-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 1px;
}

.notification-title {
  font-size: 13.5px;
  font-weight: 750;
  color: var(--ui-text, #1F1A17);
  line-height: 1.3;
}

.notification-body {
  font-size: 12.8px;
  color: var(--gray-700, #5F5A56);
  line-height: 1.45;

  .actor-name {
    color: var(--ui-text, #1F1A17);
    font-weight: 650;
    transition: color 0.15s ease;
  }
  
  .body-text {
    word-break: break-word;
  }
}

.notification-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--ui-text-hint, #8E8883);
  margin-top: 2px;

  .meta-type {
    font-weight: 750;
    text-transform: uppercase;
    font-size: 9px;
    letter-spacing: 0.05em;
    padding: 1.5px 5.5px;
    border-radius: 5px;
    transition: all 0.2s ease;
    
    &.type-task {
      color: var(--primary-600, #D94B35);
      background: rgba(233, 92, 71, 0.06);
      border: 1px solid rgba(233, 92, 71, 0.1);
    }
    &.type-channel {
      color: #3b7a57;
      background: rgba(59, 122, 87, 0.06);
      border: 1px solid rgba(59, 122, 87, 0.1);
    }
    &.type-workspace {
      color: #b25e00;
      background: rgba(217, 119, 6, 0.06);
      border: 1px solid rgba(217, 119, 6, 0.1);
    }
    &.type-system {
      color: var(--gray-700);
      background: rgba(142, 136, 131, 0.06);
      border: 1px solid rgba(142, 136, 131, 0.1);
    }
    &.type-activity {
      color: var(--primary-500);
      background: rgba(233, 92, 71, 0.04);
      border: 1px solid rgba(233, 92, 71, 0.08);
    }
  }

  .meta-dot {
    opacity: 0.4;
  }
}

.notification-actions {
  flex-shrink: 0;
  align-self: center;

  .more-btn {
    border: none;
    background: transparent;
    cursor: pointer;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    color: var(--ui-text-hint, #8E8883);
    transition: all 0.15s ease;

    i {
      font-size: 11px;
    }

    &:hover {
      background: var(--gray-100, #F1ECE6);
      color: var(--ui-text, #1F1A17);
    }
  }
}
</style>
