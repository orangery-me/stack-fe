<script setup>
import { computed, ref } from "vue";
import { useWorkspaceStore } from "@/modules/workspaces/stores/workspace.store.js";
import { useChannelStore } from "@/modules/channels/stores/channel.store.js";
import MessageTabView from "@/modules/channels/components/messages/MessageTabView.vue";

const workspaceStore = useWorkspaceStore();
const channelStore = useChannelStore();

const workspace = computed(() => workspaceStore.workspaceDetail);
const selectedChannel = computed(() => channelStore.selectedChannel);

const activeTab = ref("messages");

const setActiveTab = (tab) => {
  activeTab.value = tab;
};
</script>

<template>
  <div class="channel-detail-view">
    <div class="main-content-header">
      <!-- channel header -->
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
      <!-- list of tabs -->
      <div
        v-if="selectedChannel"
        class="channel-tabs"
      >
        <button
          class="channel-tab"
          :class="{ active: activeTab === 'messages' }"
          @click="setActiveTab('messages')"
        >
          Messages
        </button>
        <button
          class="channel-tab"
          :class="{ active: activeTab === 'canvas' }"
          @click="setActiveTab('canvas')"
        >
          Add canvas
        </button>
      </div>
    </div>

    <MessageTabView v-if="activeTab === 'messages'" />
    <div
      v-else
      class="main-content-body"
    >
      <div class="content-placeholder">
        <p class="placeholder-text">
          Workspace: {{ workspace?.name }}
        </p>
        <p class="placeholder-description">
          Canvas content will be available soon.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss" src="./ChannelDetailView.scss"></style>
