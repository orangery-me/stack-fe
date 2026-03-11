<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "@/composables/useToast.js";
import { useAuthStore } from "@/modules/auth/stores/auth.store.js";
import { useWorkspaceStore } from "@/modules/workspaces/stores/workspace.store.js";
import { useChannelStore } from "@/modules/channels/stores/channel.store.js";
import CreateChannelModal from "@/modules/channels/components/CreateChannelModal.vue";
import ChannelDetailView from "@/modules/channels/pages/ChannelDetailView.vue";

const { error, success } = useToast();
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const workspaceStore = useWorkspaceStore();
const channelStore = useChannelStore();

const currentUser = computed(() => authStore.user);
const workspaceId = route.params.id;

// Computed values from store
const workspace = computed(() => workspaceStore.workspaceDetail);
const members = computed(() => workspaceStore.members);
const channels = computed(() => channelStore.channels);
const selectedChannel = computed(() => channelStore.selectedChannel);

const channelsExpanded = ref(true);
const directMessagesExpanded = ref(true);
const isCreateChannelModalOpen = ref(false);

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
  } catch (err) {
    console.error("Error refreshing channels:", err);
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

onMounted(async () => {
  try {
    await Promise.all([
      workspaceStore.fetchWorkspaceById(workspaceId),
      workspaceStore.fetchMembers(workspaceId),
      channelStore.fetchUserChannels(workspaceId),
    ]);

    // Automatically select default channel
    const defaultChannel = channelStore.channels.find(
      (channel) => channel.isDefault === true
    );
    if (defaultChannel) {
      channelStore.selectChannel(defaultChannel.id);
    } else if (channelStore.channels.length > 0) {
      channelStore.selectChannel(channelStore.channels[0].id);
    }
  } catch (err) {
    error("Failed to load workspace details");
    console.error("Error loading workspace:", err);
  }
});
</script>

<template>
  <div class="workspace-detail-page">
    <!-- Left Icon Menu Bar -->
    <div class="icon-menu-bar">
      <div class="icon-menu-header">
        <div class="workspace-logo">
          <span>{{ workspaceInitials }}</span>
        </div>
      </div>

      <div class="icon-menu-items">
        <button
          class="icon-menu-item"
          :class="{ active: route.name === 'workspaceDetail' }"
          title="Home"
          type="button"
        >
          <img src="/icons/home.svg" alt="Home" class="icon-menu-svg" />
          <span class="icon-menu-label">Home</span>
        </button>

        <button class="icon-menu-item" title="DMs" type="button">
          <img
            src="/icons/message-circle-dot.svg"
            alt="DMs"
            class="icon-menu-svg"
          />
          <span class="notification-badge">1</span>
          <span class="icon-menu-label">DMs</span>
        </button>

        <button class="icon-menu-item" title="Activity" type="button">
          <img
            src="/icons/notification.svg"
            alt="Activity"
            class="icon-menu-svg"
          />
          <span class="icon-menu-label">Activity</span>
        </button>

        <button
          class="icon-menu-item"
          :class="{ active: route.name === 'workspaceFiles' }"
          title="Files"
          type="button"
          @click="goToWorkspaceFiles"
        >
          <img src="/icons/file.svg" alt="Files" class="icon-menu-svg" />
          <span class="icon-menu-label">Files</span>
        </button>

        <button class="icon-menu-item" title="More" type="button">
          <img
            src="/icons/more-horizontal.svg"
            alt="More"
            class="icon-menu-svg"
          />
          <span class="icon-menu-label">More</span>
        </button>

        <button class="icon-menu-item" title="Admin" type="button">
          <img src="/icons/setting.svg" alt="Admin" class="icon-menu-svg" />
          <span class="icon-menu-label">Admin</span>
        </button>
      </div>

      <div class="icon-menu-footer">
        <div class="profile-icon">
          {{ getUserInitials(currentUser?.name || "U") }}
        </div>
      </div>
    </div>

    <!-- Sidebar -->
    <div class="sidebar">
      <div class="sidebar-header">
        <div class="workspace-name">
          <span>{{ workspaceDisplayName }}</span>
          <img
            src="/icons/arrow-down.svg"
            alt="Toggle workspace menu"
            class="workspace-arrow-icon"
          />
        </div>
      </div>

      <div class="sidebar-content">
        <div
          v-if="workspaceStore.workspaceDetailLoading"
          class="sidebar-loading"
        >
          <span>Loading workspace details...</span>
        </div>

        <div
          v-else-if="workspaceStore.workspaceDetailError"
          class="sidebar-loading"
        >
          <span>Error: Failed to load workspace details</span>
        </div>

        <div v-else-if="!workspace" class="sidebar-loading">
          <span>Workspace not found</span>
        </div>

        <template v-else>
          <!-- Draft & Sent -->
          <div class="sidebar-section">
            <button class="sidebar-item">
              <img
                src="/icons/paperplane.svg"
                alt="Drafts & sent"
                class="sidebar-icon"
              />
              <span>Drafts & sent</span>
            </button>
          </div>

          <!-- Directories -->
          <div class="sidebar-section">
            <button class="sidebar-item">
              <img
                src="/icons/directory.svg"
                alt="Directories"
                class="sidebar-icon"
              />
              <span>Directories</span>
            </button>
          </div>

          <!-- Channels -->
          <div class="sidebar-section">
            <button class="sidebar-section-header" @click="toggleChannels">
              <img
                src="/icons/arrow-down.svg"
                alt="Toggle channels"
                class="sidebar-arrow-icon"
              />
              <span>Channels</span>
            </button>

            <div v-if="channelsExpanded" class="sidebar-section-content">
              <div v-if="channelStore.channelsLoading" class="sidebar-loading">
                <span>Loading channels...</span>
              </div>
              <template v-else-if="channels && channels.length > 0">
                <button
                  v-for="channel in channels"
                  :key="channel.id"
                  class="sidebar-channel-item"
                  :class="{ active: selectedChannel?.id === channel.id }"
                  @click="selectChannel(channel.id)"
                >
                  <span class="channel-prefix">#</span>
                  <span class="channel-name">{{
                    channel.name || "Unnamed"
                  }}</span>
                </button>
              </template>
              <div v-else class="sidebar-loading">
                <span>No channels yet</span>
              </div>
              <button class="sidebar-add-item" @click="openCreateChannelModal">
                <span>+ Add channels</span>
              </button>
            </div>
          </div>

          <!-- Direct Messages -->
          <div class="sidebar-section">
            <button
              class="sidebar-section-header"
              @click="toggleDirectMessages"
            >
              <img
                src="/icons/arrow-down.svg"
                alt="Toggle direct messages"
                class="sidebar-arrow-icon"
              />
              <span>Direct messages</span>
            </button>

            <div v-if="directMessagesExpanded" class="sidebar-section-content">
              <div
                v-if="workspaceStore.workspaceMembersLoading"
                class="sidebar-loading"
              >
                <span>Loading...</span>
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
                    >you</span
                  >
                </button>
                <button class="sidebar-add-item">
                  <span>+ Invite people</span>
                </button>
              </template>
              <div v-else class="sidebar-loading">
                <span>No members found</span>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="workspace-main-content">
      <div v-if="workspaceStore.workspaceDetailLoading" class="sidebar-loading">
        <span>Loading workspace details...</span>
      </div>
      <div
        v-else-if="workspaceStore.workspaceDetailError"
        class="sidebar-loading"
      >
        <span>Error: Failed to load workspace details</span>
      </div>
      <div v-else-if="!workspace" class="sidebar-loading">
        <span>Workspace not found</span>
      </div>
      <ChannelDetailView v-else />
    </div>

    <CreateChannelModal
      v-model:open="isCreateChannelModalOpen"
      :workspace-id="workspaceId"
      @created="handleChannelCreated"
    />
  </div>
</template>

<style scoped lang="scss" src="./WorkspaceDetailView.scss"></style>
