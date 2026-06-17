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
import AutoComplete from "primevue/autocomplete";

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

const getUserIdFromAccessToken = () => {
  const token = authStore.accessToken;
  if (!token) return "";
  try {
    const base64Url = token.split(".")[1] || "";
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const payload = JSON.parse(atob(padded));
    return payload?.sub || "";
  } catch {
    return "";
  }
};

const currentUserId = computed(() => currentUser.value?.id || getUserIdFromAccessToken());

// Computed values from store
const workspace = computed(() => workspaceStore.workspaceDetail);
const workspacePermissions = computed(() => workspace.value?.permissions || {});
const canInviteWorkspaceMembers = computed(
  () => workspacePermissions.value.canInviteMembers === true
);
const canCreateWorkspaceChannel = computed(
  () => workspacePermissions.value.canCreateChannel === true
);
const members = computed(() => workspaceStore.members || []);
const allChannels = computed(() => channelStore.channels);
const channels = computed(() =>
  allChannels.value.filter((channel) => !["dm", "group_dm"].includes(channel.type))
);
const directMessageChannels = computed(() =>
  allChannels.value.filter((channel) => channel.type === "dm")
);
const selectedChannel = computed(() => channelStore.selectedChannel);
const unreadCount = computed(() => notificationStore.unreadCount);
const aiWorkspaceContext = computed(() => ({
  kind: "workspace",
  workspaceId: workspaceId,
}));

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
const isDmSidebarOpen = ref(false);
const previousChannelBeforeDm = ref("");
const isCreateChannelModalOpen = ref(false);
const selectedDirectMessageMember = ref(null);
const directMessageSearchSuggestions = ref([]);
const openingDirectMessageUserId = ref("");
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

const directMessageThreads = computed(() => {
  return directMessageChannels.value
    .map((channel) => {
      const partner = getDirectMessagePartner(channel);
      const displayName =
        partner?.name || partner?.email || channel.name || "Direct message";
      return {
        channel,
        partner,
        displayName,
        subtitle: partner?.email || "One-to-one conversation",
        updatedAt: channel.createdAt ? new Date(channel.createdAt) : null,
      };
    })
    .sort((a, b) => {
      const timeA = a.updatedAt?.getTime?.() || 0;
      const timeB = b.updatedAt?.getTime?.() || 0;
      return timeB - timeA;
    });
});

const homeDirectMessageThreads = computed(() => directMessageThreads.value.slice(0, 5));
const hasMoreHomeDirectMessages = computed(() => directMessageThreads.value.length > 5);

const getSearchableWorkspaceMembers = () => {
  return members.value
    .filter((member) => member.userId)
    .map((member) => ({
      ...member,
      display: member.name || member.email || "Workspace member",
    }))
    .sort((a, b) =>
      String(a.display || "").localeCompare(String(b.display || ""))
    );
};

const searchDirectMessageMembers = (event) => {
  const query = String(event.query || "").trim().toLowerCase();
  const searchableMembers = getSearchableWorkspaceMembers();

  if (!query) {
    directMessageSearchSuggestions.value = searchableMembers;
    return;
  }

  directMessageSearchSuggestions.value = searchableMembers.filter((member) => {
    const searchable = `${member.name || ""} ${member.email || ""}`.toLowerCase();
    return searchable.includes(query);
  });
};

const openDirectMessageForMember = async (member) => {
  if (!member?.userId || !workspaceId) return;
  openingDirectMessageUserId.value = member.userId;
  try {
    const channel = await channelStore.findOrCreateDirectMessage(
      workspaceId,
      member.userId
    );
    if (channel?.id) {
      await selectDirectMessage(channel);
    }
    selectedDirectMessageMember.value = null;
    directMessageSearchSuggestions.value = [];
  } finally {
    openingDirectMessageUserId.value = "";
  }
};

const getDirectMessagePartner = (channel) => {
  const channelMembers = channelStore.getChannelMembersById(channel.id);
  const partner = channelMembers.find(
    (member) => member.userId && member.userId !== currentUserId.value
  );
  if (partner) return partner;
  return (
    channelMembers.find((member) => member.userId === currentUserId.value) ||
    null
  );
};

const ensureDirectMessageMembers = async (dmChannels = directMessageChannels.value) => {
  if (!workspaceId || !dmChannels.length) return;
  await Promise.all(
    dmChannels.map((channel) =>
      channelStore.fetchChannelMembers(workspaceId, channel.id).catch(() => {})
    )
  );
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

const selectDirectMessage = async (channel) => {
  if (!channel?.id) return;
  await channelStore.fetchChannelMembers(workspaceId, channel.id).catch(() => {});
  selectChannel(channel.id);
};

const openInvitePeople = () => {
  if (!canInviteWorkspaceMembers.value) return;
  router.push({
    name: "inviteMember",
    params: { id: workspaceId },
  });
};

const openDmInbox = async () => {
  if (selectedChannel.value?.id && selectedChannel.value.type !== "dm") {
    previousChannelBeforeDm.value = selectedChannel.value.id;
  }
  isDmSidebarOpen.value = true;
  directMessagesExpanded.value = true;
  if (directMessageChannels.value.length > 0 && selectedChannel.value?.type !== "dm") {
    await selectDirectMessage(directMessageChannels.value[0]);
    return;
  }
  if (directMessageChannels.value.length === 0) {
    channelStore.clearSelectedChannel();
  }
};

const closeDmInbox = () => {
  isDmSidebarOpen.value = false;
  if (previousChannelBeforeDm.value) {
    const restoredChannelId = previousChannelBeforeDm.value;
    previousChannelBeforeDm.value = "";
    selectChannel(restoredChannelId);
    return;
  }
  previousChannelBeforeDm.value = "";
};

const openCreateChannelModal = () => {
  if (!canCreateWorkspaceChannel.value) return;
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
  closeDmInbox();
  router.push({
    name: "workspaceFiles",
    params: { id: workspaceId },
  });
};

const goToMyTasks = () => {
  closeDmInbox();
  router.push({
    name: "myTasks",
    params: { id: workspaceId },
  });
};

const goToMessages = () => {
  closeDmInbox();
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

watch(
  directMessageChannels,
  (dmChannels) => {
    ensureDirectMessageMembers(dmChannels).catch(() => {});
  },
  { immediate: true }
);

onMounted(async () => {
  window.addEventListener("mousemove", handleResizeMenuBar);
  window.addEventListener("mouseup", stopResizeMenuBar);
  window.addEventListener("resize", handleWindowResize);
  menuBarWidth.value = clampMenuBarWidth(menuBarWidth.value);

  try {
    const workspaceDetail = await workspaceStore.fetchWorkspaceById(workspaceId);
    const initialRequests = [
      channelStore.fetchUserChannels(workspaceId),
      notificationStore.fetchUnreadCount(workspaceId),
    ];

    if (workspaceDetail?.permissions?.canViewMembers === true) {
      initialRequests.push(workspaceStore.fetchMembers(workspaceId));
    } else {
      workspaceStore.members = [];
    }

    await Promise.all(initialRequests);
    await notificationStore.connectRealtime(workspaceId);

    await ensureDirectMessageMembers();

    // Automatically select default channel unless another channel was selected before navigation.
    const currentSelectionStillAvailable = channelStore.channels.some(
      (channel) => channel.id === channelStore.selectedChannel?.id
    );
    if (currentSelectionStillAvailable) {
      return;
    }

    const defaultChannel = channels.value.find(
      (channel) => channel.isDefault === true
    );
    if (defaultChannel) {
      channelStore.selectChannel(defaultChannel.id);
    } else if (channels.value.length > 0) {
      channelStore.selectChannel(channels.value[0].id);
    } else if (directMessageChannels.value.length > 0) {
      channelStore.selectChannel(directMessageChannels.value[0].id);
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
      :is-dm-open="isDmSidebarOpen"
      :active-route-name="String(route.name || '')"
      @home="goToMessages"
      @dms="openDmInbox"
      @files="goToWorkspaceFiles"
      @activity="toggleActivityPanel"
      @ai="uiStore.toggleAi"
    />

    <!-- Sidebar -->
    <div :class="['sidebar', { 'sidebar--dm': isDmSidebarOpen }]">
      <div class="sidebar-header">
        <div
          v-if="isDmSidebarOpen"
          class="sidebar-dm-header"
        >
          <div class="sidebar-dm-header__title-row">
            <div class="workspace-name workspace-name--dm">
              <span>Direct messages</span>
              <i
                class="pi pi-angle-down workspace-arrow-icon"
                aria-hidden="true"
              />
            </div>
          </div>
          <div class="sidebar-dm-search">
            <i
              class="pi pi-search sidebar-dm-search__icon"
              aria-hidden="true"
            />
            <AutoComplete
              v-model="selectedDirectMessageMember"
              input-id="workspaceDmSearch"
              :suggestions="directMessageSearchSuggestions"
              option-label="display"
              placeholder="Find a DM"
              append-to="body"
              panel-class="sidebar-dm-autocomplete-panel"
              fluid
              @complete="searchDirectMessageMembers"
              @item-select="openDirectMessageForMember($event.value)"
            >
              <template #option="{ option }">
                <div class="sidebar-dm-autocomplete-option">
                  <div class="user-avatar">
                    {{ getUserInitials(option.name || option.email) }}
                  </div>
                  <span class="sidebar-dm-identity">
                    <span class="user-name">{{ option.name || option.email }}</span>
                    <span class="sidebar-dm-subtitle">
                      {{ option.email }}
                    </span>
                  </span>
                  <span
                    v-if="openingDirectMessageUserId === option.userId"
                    class="sidebar-dm-date"
                  >
                    Opening...
                  </span>
                </div>
              </template>
            </AutoComplete>
          </div>
        </div>
        <div
          v-else
          class="workspace-name"
        >
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
          <div
            v-if="!isDmSidebarOpen"
            class="sidebar-section"
          >
            <button class="sidebar-item">
              <i
                class="pi pi-send sidebar-icon"
                aria-hidden="true"
              />
              <span>Drafts & sent</span>
            </button>
          </div>

          <!-- Directories -->
          <div
            v-if="!isDmSidebarOpen"
            class="sidebar-section"
          >
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
          <div
            v-if="!isDmSidebarOpen"
            class="sidebar-section"
          >
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
                v-if="canCreateWorkspaceChannel"
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
          <div
            v-if="!isDmSidebarOpen"
            class="sidebar-section"
          >
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
              <button
                v-for="thread in homeDirectMessageThreads"
                :key="thread.channel.id"
                class="sidebar-user-item"
                :class="{ active: !isMyTasksView && selectedChannel?.id === thread.channel.id }"
                type="button"
                @click="selectDirectMessage(thread.channel)"
              >
                <div class="user-avatar">
                  {{ getUserInitials(thread.displayName) }}
                </div>
                <span class="user-name">{{ thread.displayName }}</span>
              </button>

              <button
                v-if="canInviteWorkspaceMembers"
                class="sidebar-add-item"
                type="button"
                @click="openInvitePeople"
              >
                <i
                  class="pi pi-user-plus sidebar-add-icon"
                  aria-hidden="true"
                />
                <span>Invite people</span>
              </button>

              <button
                v-if="hasMoreHomeDirectMessages"
                class="sidebar-more-item"
                type="button"
                @click="openDmInbox"
              >
                More
              </button>
            </div>
          </div>

          <div
            v-else
            class="sidebar-section sidebar-section--dm"
          >
            <div class="sidebar-dm-results">
              <div
                v-if="!directMessageThreads.length"
                class="sidebar-dm-empty"
              >
                No direct messages yet
              </div>

              <button
                v-for="thread in directMessageThreads"
                :key="thread.channel.id"
                class="sidebar-user-item sidebar-user-item--dm"
                :class="{ active: !isMyTasksView && selectedChannel?.id === thread.channel.id }"
                type="button"
                @click="selectDirectMessage(thread.channel)"
              >
                <div class="user-avatar">
                  {{ getUserInitials(thread.displayName) }}
                </div>
                <span class="sidebar-dm-identity">
                  <span class="user-name">{{ thread.displayName }}</span>
                  <span class="sidebar-dm-subtitle">
                    {{ thread.subtitle }}
                  </span>
                </span>
                <span class="sidebar-dm-date">
                  {{ thread.updatedAt ? thread.updatedAt.toLocaleDateString() : "" }}
                </span>
              </button>
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
      v-if="canCreateWorkspaceChannel"
      v-model:open="isCreateChannelModalOpen"
      :workspace-id="workspaceId"
      @created="handleChannelCreated"
    />

    <AiChatSidebar
      v-model:open="uiStore.isAiOpen"
      :context="aiWorkspaceContext"
    />

    <NotificationPanel
      v-if="notificationStore.isPanelOpen"
      :workspace-id="workspaceId"
      @close="notificationStore.closePanel()"
    />
  </div>
</template>

<style scoped lang="scss" src="./WorkspaceDetailView.scss"></style>
