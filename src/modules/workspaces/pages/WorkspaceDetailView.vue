<script setup>
import { ref, onBeforeUnmount, onMounted, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "@/composables/useToast.js";
import { useLoading } from "@/composables/useLoading.js";
import { useAuthStore } from "@/modules/auth/stores/auth.store.js";
import { useWorkspaceStore } from "@/modules/workspaces/stores/workspace.store.js";
import { useChannelStore } from "@/modules/channels/stores/channel.store.js";
import { useNotificationStore } from "@/modules/notifications/stores/notification.store.js";
import { useUiStore } from "@/stores/ui.store.js";
import CreateChannelModal from "@/modules/channels/components/CreateChannelModal.vue";
import ChannelDetailView from "@/modules/channels/pages/ChannelDetailView.vue";
import WorkspaceIconMenu from "@/modules/workspaces/components/WorkspaceIconMenu.vue";
import AiChatSidebar from "@/components/ai/AiChatSidebar.vue";
import NotificationPanel from "@/modules/notifications/components/NotificationPanel.vue";
import WorkspaceMyTasksContent from "@/modules/workspaces/components/WorkspaceMyTasksContent.vue";

const { success } = useToast();
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const workspaceStore = useWorkspaceStore();
const channelStore = useChannelStore();
const notificationStore = useNotificationStore();
const uiStore = useUiStore();
const { showFullscreen, hideFullscreen } = useLoading();

const currentUser = computed(() => authStore.user);
const workspaceId = route.params.id;

// Computed values from store
const workspace = computed(() => workspaceStore.workspaceDetail);
const members = computed(() => workspaceStore.members);
const channels = computed(() => channelStore.channels);
const selectedChannel = computed(() => channelStore.selectedChannel);
const notifications = computed(() => notificationStore.items);
const unreadCount = computed(() => notificationStore.unreadCount);

const shouldFullscreenLoading = computed(() => {
  return (
    workspaceStore.workspaceDetailLoading ||
    channelStore.channelsLoading ||
    workspaceStore.membersLoading
  );
});

const fullscreenLabel = computed(() => {
  return "";
});

watch(
  shouldFullscreenLoading,
  (active) => {
    if (active) {
      showFullscreen({ label: fullscreenLabel.value });
      return;
    }
    hideFullscreen();
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  hideFullscreen();
  notificationStore.disconnectRealtime();
  window.removeEventListener("mousemove", handleResizeMenuBar);
  window.removeEventListener("mouseup", stopResizeMenuBar);
  window.removeEventListener("resize", handleWindowResize);
  stopResizeMenuBar();
});

const channelsExpanded = ref(true);
const directMessagesExpanded = ref(true);
const isCreateChannelModalOpen = ref(false);
const menuBarWidth = ref(280);
const isResizingMenuBar = ref(false);
const resizeStartX = ref(0);
const resizeStartWidth = ref(280);
const MENU_BAR_MIN_WIDTH = 220;

const getMenuBarMaxWidth = () => {
  const maxByScreen = Math.floor(window.innerWidth * 0.35);
  return Math.max(MENU_BAR_MIN_WIDTH, maxByScreen);
};

const clampMenuBarWidth = (width) => {
  return Math.min(Math.max(width, MENU_BAR_MIN_WIDTH), getMenuBarMaxWidth());
};

const startResizeMenuBar = (event) => {
  isResizingMenuBar.value = true;
  resizeStartX.value = event.clientX;
  resizeStartWidth.value = menuBarWidth.value;
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
};

const stopResizeMenuBar = () => {
  if (!isResizingMenuBar.value) return;
  isResizingMenuBar.value = false;
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
};

const handleResizeMenuBar = (event) => {
  if (!isResizingMenuBar.value) return;
  const deltaX = event.clientX - resizeStartX.value;
  menuBarWidth.value = clampMenuBarWidth(resizeStartWidth.value + deltaX);
};

const handleWindowResize = () => {
  menuBarWidth.value = clampMenuBarWidth(menuBarWidth.value);
};

// Get workspace initials for logo
const getWorkspaceInitials = (name) => {
  if (!name) return "W";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name[0].toUpperCase();
};

const workspaceInitials = computed(() =>
  getWorkspaceInitials(workspace.value?.name)
);
const isMyTasksView = computed(() => route.name === "myTasks");

// Get workspace display name (truncated if too long)
const workspaceDisplayName = computed(() => {
  const name = workspace.value?.name || "Workspace";
  return name.length > 20 ? `${name.substring(0, 17)}...` : name;
});

const getUserInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name[0].toUpperCase();
};

const selectChannel = (channelId) => {
  if (isMyTasksView.value) {
    router
      .push({
        name: "workspaceDetail",
        params: { id: workspaceId },
      })
      .finally(() => {
        channelStore.selectChannel(channelId);
      });
    return;
  }
  channelStore.selectChannel(channelId);
};

const openCreateChannelModal = () => {
  isCreateChannelModalOpen.value = true;
};

const handleChannelCreated = async () => {
  // Refresh channels list
  try {
    await channelStore.fetchUserChannels(workspaceId);
    success("Channel created successfully!");
  } catch {
    // Toast is shown by the global axios interceptor
  }
};

const toggleChannels = () => {
  channelsExpanded.value = !channelsExpanded.value;
};

const toggleDirectMessages = () => {
  directMessagesExpanded.value = !directMessagesExpanded.value;
};

const goToWorkspaceFiles = () => {
  router.push({
    name: "workspaceFiles",
    params: { id: workspaceId },
  });
};

const goToMyTasks = () => {
  router.push({
    name: "myTasks",
    params: { id: workspaceId },
  });
};

const goToMessages = () => {
  router.push({
    name: "workspaceDetail",
    params: { id: workspaceId },
  });
};

const toggleActivityPanel = async () => {
  if (notificationStore.isPanelOpen) {
    notificationStore.closePanel();
    return;
  }
  await notificationStore.openPanel(workspaceId);
};

const markNotificationRead = async (notificationId) => {
  await notificationStore.markRead(notificationId, workspaceId);
};

const markAllNotificationsRead = async () => {
  await notificationStore.markAllRead(workspaceId);
};

onMounted(async () => {
  window.addEventListener("mousemove", handleResizeMenuBar);
  window.addEventListener("mouseup", stopResizeMenuBar);
  window.addEventListener("resize", handleWindowResize);
  menuBarWidth.value = clampMenuBarWidth(menuBarWidth.value);

  try {
    await Promise.all([
      workspaceStore.fetchWorkspaceById(workspaceId),
      workspaceStore.fetchMembers(workspaceId),
      channelStore.fetchUserChannels(workspaceId),
      notificationStore.fetchUnreadCount(workspaceId),
    ]);
    await notificationStore.connectRealtime(workspaceId);

    // Automatically select default channel
    const defaultChannel = channelStore.channels.find(
      (channel) => channel.isDefault === true
    );
    if (defaultChannel) {
      channelStore.selectChannel(defaultChannel.id);
    } else if (channelStore.channels.length > 0) {
      channelStore.selectChannel(channelStore.channels[0].id);
    }
  } catch {
    // Toast is shown by the global axios interceptor
  }
});
</script>

<template>
  <div
    class="workspace-detail-page"
    :style="{
      paddingRight: uiStore.isAiOpen ? uiStore.aiSidebarWidth + 'px' : '0',
      '--workspace-sidebar-width': `${menuBarWidth}px`,
    }"
  >
    <WorkspaceIconMenu
      :workspace-initials="workspaceInitials"
      :current-user-initials="getUserInitials(currentUser?.name || 'U')"
      :unread-count="unreadCount"
      :is-ai-open="uiStore.isAiOpen"
      :active-route-name="String(route.name || '')"
      @files="goToWorkspaceFiles"
      @activity="toggleActivityPanel"
      @ai="uiStore.toggleAi"
    />

    <!-- Sidebar -->
    <div class="sidebar">
      <div class="sidebar-header">
        <div class="workspace-name">
          <span>{{ workspaceDisplayName }}</span>
          <i
            class="pi pi-angle-down workspace-arrow-icon"
            aria-hidden="true"
          />
        </div>
      </div>

      <div class="sidebar-content">
        <div
          v-if="workspaceStore.workspaceDetailLoading"
          class="sidebar-loading"
        >
          <!-- fullscreen loading -->
        </div>

        <div
          v-else-if="workspaceStore.workspaceDetailError"
          class="sidebar-loading"
        >
          <span>Error: Failed to load workspace details</span>
        </div>

        <div
          v-else-if="!workspace"
          class="sidebar-loading"
        >
          <span>Workspace not found</span>
        </div>

        <template v-else>
          <!-- Draft & Sent -->
          <div class="sidebar-section">
            <button class="sidebar-item">
              <i
                class="pi pi-send sidebar-icon"
                aria-hidden="true"
              />
              <span>Drafts & sent</span>
            </button>
          </div>

          <!-- Directories -->
          <div class="sidebar-section">
            <button class="sidebar-item">
              <i
                class="pi pi-folder-open sidebar-icon"
                aria-hidden="true"
              />
              <span>Directories</span>
            </button>
            <button
              class="sidebar-item"
              :class="{ active: isMyTasksView }"
              @click="goToMyTasks"
            >
              <i
                class="pi pi-list-check sidebar-icon"
                aria-hidden="true"
              />
              <span>My Tasks</span>
            </button>
          </div>

          <!-- Channels -->
          <div class="sidebar-section">
            <button
              class="sidebar-section-header"
              @click="toggleChannels"
            >
              <i
                class="pi pi-angle-down sidebar-arrow-icon"
                aria-hidden="true"
              />
              <i
                class="pi pi-hashtag sidebar-section-icon"
                aria-hidden="true"
              />
              <span>Channels</span>
            </button>

            <div
              v-if="channelsExpanded"
              class="sidebar-section-content"
            >
              <div
                v-if="channelStore.channelsLoading"
                class="sidebar-loading"
              >
                <!-- fullscreen loading -->
              </div>
              <template v-else-if="channels && channels.length > 0">
                <button
                  v-for="channel in channels"
                  :key="channel.id"
                  class="sidebar-channel-item"
                  :class="{ active: !isMyTasksView && selectedChannel?.id === channel.id }"
                  @click="selectChannel(channel.id)"
                >
                  <i
                    class="pi pi-hashtag channel-prefix-icon"
                    aria-hidden="true"
                  />
                  <span class="channel-name">{{
                    channel.name || "Unnamed"
                  }}</span>
                </button>
              </template>
              <div
                v-else
                class="sidebar-loading"
              >
                <span>No channels yet</span>
              </div>
              <button
                class="sidebar-add-item"
                @click="openCreateChannelModal"
              >
                <i
                  class="pi pi-plus sidebar-add-icon"
                  aria-hidden="true"
                />
                <span>Add channels</span>
              </button>
            </div>
          </div>

          <!-- Direct Messages -->
          <div class="sidebar-section">
            <button
              class="sidebar-section-header"
              @click="toggleDirectMessages"
            >
              <i
                class="pi pi-angle-down sidebar-arrow-icon"
                aria-hidden="true"
              />
              <i
                class="pi pi-users sidebar-section-icon"
                aria-hidden="true"
              />
              <span>Direct messages</span>
            </button>

            <div
              v-if="directMessagesExpanded"
              class="sidebar-section-content"
            >
              <div
                v-if="workspaceStore.membersLoading"
                class="sidebar-loading"
              >
                <!-- fullscreen loading -->
              </div>
              <template v-else-if="members && members.length > 0">
                <button
                  v-for="member in members"
                  :key="member.id"
                  class="sidebar-user-item"
                >
                  <div class="user-avatar">
                    {{ getUserInitials(member.name) }}
                  </div>
                  <span class="user-name">{{ member.name }}</span>
                  <span
                    v-if="member.userId === currentUser?.id"
                    class="user-badge"
                  >you</span>
                </button>
                <button class="sidebar-add-item">
                  <i
                    class="pi pi-user-plus sidebar-add-icon"
                    aria-hidden="true"
                  />
                  <span>Invite people</span>
                </button>
              </template>
              <div
                v-else
                class="sidebar-loading"
              >
                <span>No members found</span>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <div
      class="sidebar-resize-handle"
      role="separator"
      aria-label="Resize menu bar"
      aria-orientation="vertical"
      @mousedown="startResizeMenuBar"
    />

    <!-- Main Content Area -->
    <div class="workspace-main-content">
      <div
        v-if="workspaceStore.workspaceDetailLoading"
        class="sidebar-loading"
      >
        <!-- fullscreen loading -->
      </div>
      <div
        v-else-if="workspaceStore.workspaceDetailError"
        class="sidebar-loading"
      >
        <span>Error: Failed to load workspace details</span>
      </div>
      <div
        v-else-if="!workspace"
        class="sidebar-loading"
      >
        <span>Workspace not found</span>
      </div>
      <WorkspaceMyTasksContent
        v-else-if="isMyTasksView"
        :workspace-id="workspaceId"
        @go-messages="goToMessages"
      />
      <ChannelDetailView v-else />
    </div>

    <CreateChannelModal
      v-model:open="isCreateChannelModalOpen"
      :workspace-id="workspaceId"
      @created="handleChannelCreated"
    />

    <AiChatSidebar v-model:open="uiStore.isAiOpen" />

    <NotificationPanel
      v-if="notificationStore.isPanelOpen"
      :workspace-id="workspaceId"
      @close="notificationStore.closePanel()"
    />
  </div>
</template>

<style scoped lang="scss" src="./WorkspaceDetailView.scss"></style>
