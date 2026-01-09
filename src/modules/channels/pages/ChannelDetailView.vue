<script setup>
import { computed } from "vue";
import { useWorkspaceStore } from "@/modules/workspaces/stores/workspace.store.js";
import { useChannelStore } from "@/modules/channels/stores/channel.store.js";

const workspaceStore = useWorkspaceStore();
const channelStore = useChannelStore();

const workspace = computed(() => workspaceStore.workspaceDetail);
const selectedChannel = computed(() => channelStore.selectedChannel);
const members = computed(() => workspaceStore.members);

// Get creator name from channel
const getChannelCreator = (channel) => {
  if (!channel || !channel.createdById) return null;
  const creator = members.value.find((m) => m.id === channel.createdById);
  return creator?.name || "Unknown";
};

// Format date
const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const options = { month: "long", day: "numeric", year: "numeric" };
  return date.toLocaleDateString("en-US", options);
};
</script>

<template>
  <div class="channel-detail-view">
    <div class="main-content-header">
      <div class="channel-header">
        <div class="channel-header-left">
          <span class="channel-title">
            # {{ selectedChannel?.name || "Select a channel" }}
          </span>
          <span
            v-if="selectedChannel"
            class="channel-star"
          >
            <img
              src="/icons/star.svg"
              alt="Star channel"
              class="channel-star-icon"
            >
          </span>
        </div>
        <div class="channel-header-right">
          <button
            v-if="selectedChannel"
            class="header-button"
            title="Invite teammates"
          >
            Invite teammates
          </button>
          <button
            class="header-button"
            title="More options"
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
        </div>
      </div>
      <div
        v-if="selectedChannel"
        class="channel-tabs"
      >
        <button class="channel-tab active">
          Messages
        </button>
        <button class="channel-tab">
          Add canvas
        </button>
      </div>
    </div>

    <div class="main-content-body">
      <div
        v-if="!selectedChannel"
        class="content-placeholder"
      >
        <p class="placeholder-text">
          Workspace: {{ workspace?.name }}
        </p>
        <p class="placeholder-description">
          Select a channel from the sidebar to start chatting.
        </p>
      </div>
      <div
        v-else
        class="channel-welcome"
      >
        <h1 class="channel-welcome-title">
          # {{ selectedChannel.name }}
        </h1>
        <p class="channel-welcome-message">
          <span class="channel-creator">
            {{ getChannelCreator(selectedChannel) || "Someone" }}
          </span>
          created this channel on
          <span class="channel-date">
            {{ formatDate(selectedChannel.createdAt) }} </span>. This is the very beginning of the
          <span class="channel-name-highlight">#{{ selectedChannel.name }}</span>
          channel.
        </p>
        <div class="channel-action-cards">
          <div class="action-card action-card--purple">
            <div class="action-card-icon">
              <img
                src="/icons/message-circle-dot.svg"
                alt="Add people icon"
              >
            </div>
            <h3 class="action-card-title">
              Add people to channel
            </h3>
          </div>
          <div class="action-card action-card--blue">
            <div class="action-card-icon">
              <img
                src="/icons/file.svg"
                alt="Channel description icon"
              >
            </div>
            <h3 class="action-card-title">
              Add channel description
            </h3>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss" src="./ChannelDetailView.scss"></style>
