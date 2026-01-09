<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "@/composables/useToast.js";
import { useAuthStore } from "@/modules/auth/stores/auth.store.js";
import { useWorkspaceStore } from "@/modules/workspaces/stores/workspace.store.js";
import { useChannelStore } from "@/modules/channels/stores/channel.store.js";
import CreateChannelModal from "@/modules/channels/components/CreateChannelModal.vue";
import ChannelDetailView from "@/modules/channels/pages/ChannelDetailView.vue";

const { error, success } = useToast();
const route = useRoute();
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
  <div
    v-if="workspaceStore.workspaceDetailLoading"
    class="loading-container"
  >
    <span>Loading workspace details...</span>
  </div>

  <div
    v-else-if="workspaceStore.workspaceDetailError"
    class="error-container"
  >
    <span>Error: {{ workspaceStore.workspaceDetailError }}</span>
  </div>

  <div
    v-else-if="!workspace"
    class="error-container"
  >
    <span>Workspace not found</span>
  </div>

  <div
    v-else
    class="workspace-detail-page"
  >
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
          title="Home"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M9 22V12H15V22"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>

        <button
          class="icon-menu-item"
          title="DMs"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span class="notification-badge">1</span>
        </button>

        <button
          class="icon-menu-item"
          title="Activity"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M18 8A6 6 0 0 0 6 8C6 11 3 13 3 16H21C21 13 18 11 18 8Z"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>

        <button
          class="icon-menu-item"
          title="Files"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M14 2V8H20"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>

        <button
          class="icon-menu-item"
          title="More"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="12"
              cy="12"
              r="1"
              fill="currentColor"
            />
            <circle
              cx="19"
              cy="12"
              r="1"
              fill="currentColor"
            />
            <circle
              cx="5"
              cy="12"
              r="1"
              fill="currentColor"
            />
          </svg>
        </button>

        <button
          class="icon-menu-item"
          title="Admin"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 15C15.866 15 19 11.866 19 8C19 4.13401 15.866 1 12 1C8.13401 1 5 4.13401 5 8C5 11.866 8.13401 15 12 15Z"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M8.21 13.89L7 23L12 20L17 23L15.79 13.88"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
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
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 9L12 15L18 9"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
      </div>

      <div class="sidebar-content">
        <!-- Draft & Sent -->
        <div class="sidebar-section">
          <button class="sidebar-item">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <span>Drafts & sent</span>
          </button>
        </div>

        <!-- Directories -->
        <div class="sidebar-section">
          <button class="sidebar-item">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5 19C5 19.5304 5.21071 20.0391 5.58579 20.4142C5.96086 20.7893 6.46957 21 7 21H19C19.5304 21 20.0391 20.7893 20.4142 20.4142C20.7893 20.0391 21 19.5304 21 19V9C21 8.46957 20.7893 7.96086 20.4142 7.58579C20.0391 7.21071 19.5304 7 19 7H12L10 5H7C6.46957 5 5.96086 5.21071 5.58579 5.58579C5.21071 5.96086 5 6.46957 5 7V19Z"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <span>Directories</span>
          </button>
        </div>

        <!-- Channels -->
        <div class="sidebar-section">
          <button
            class="sidebar-section-header"
            @click="toggleChannels"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6 9L12 15L18 9"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
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
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6 9L12 15L18 9"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <span>Direct messages</span>
          </button>

          <div
            v-if="directMessagesExpanded"
            class="sidebar-section-content"
          >
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
                >you</span>
              </button>
              <button class="sidebar-add-item">
                <span>+ Invite people</span>
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
      </div>
    </div>

    <!-- Main Content Area -->
    <ChannelDetailView />

    <CreateChannelModal
      v-model:open="isCreateChannelModalOpen"
      :workspace-id="workspaceId"
      @created="handleChannelCreated"
    />
  </div>
</template>

<style scoped lang="scss" src="./WorkspaceDetailView.scss"></style>
