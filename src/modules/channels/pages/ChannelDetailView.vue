<script setup>
import { computed, ref, watch } from "vue";
import { useWorkspaceStore } from "@/modules/workspaces/stores/workspace.store.js";
import { useChannelStore } from "@/modules/channels/stores/channel.store.js";
import { useCanvasStore } from "@/modules/channels/stores/canvas.store";
import MessageTabView from "@/modules/channels/components/messages/MessageTabView.vue";
import CanvasTabView from "@/modules/channels/components/canvas/CanvasTabView.vue";

const workspaceStore = useWorkspaceStore();
const channelStore = useChannelStore();
const canvasStore = useCanvasStore();

const selectedChannel = computed(() => channelStore.selectedChannel);
const workspace = computed(() => workspaceStore.workspaceDetail);

const activeTab = ref("messages");

const canvases = computed(() => canvasStore.canvases);
const selectedCanvas = computed(() => canvasStore.selectedCanvas);

const setActiveTab = (tab) => {
  activeTab.value = tab;
};

const handleSelectCanvasTab = async (canvasId) => {
  if (!workspace.value || !selectedChannel.value) return;
  activeTab.value = canvasId;
  await canvasStore.selectCanvas(
    workspace.value.id,
    selectedChannel.value.id,
    canvasId
  );
};

const handleAddCanvas = async () => {
  if (!workspace.value || !selectedChannel.value) return;
  const title = "New page";
  const created = await canvasStore.createCanvas(
    selectedChannel.value.id,
    {
      title,
      initialContent: {
        version: 1,
        blocks: [
          {
            type: "heading1",
            content: "",
          },
        ],
      },
    }
  );
  if (created?.id) {
    activeTab.value = created.id;
  }
};

watch(
  () => selectedChannel.value?.id,
  async (newChannelId, oldChannelId) => {
    if (!workspace.value) return;

    // Clear state when switching channels
    if (newChannelId !== oldChannelId) {
      canvasStore.clearCanvases();
      activeTab.value = "messages";
    }

    if (newChannelId) {
      await canvasStore.fetchCanvases(newChannelId);
    }
  },
  { immediate: true }
);
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

        <template
          v-for="canvas in canvases"
          :key="canvas.id"
        >
          <button
            class="channel-tab"
            :class="{ active: activeTab === canvas.id }"
            @click="handleSelectCanvasTab(canvas.id)"
          >
            {{ canvas.title || "Untitled" }}
          </button>
        </template>

        <button
          class="channel-tab channel-tab-add"
          type="button"
          @click="handleAddCanvas"
        >
          +
        </button>
      </div>
    </div>

    <MessageTabView v-show="activeTab === 'messages'" />

    <CanvasTabView
      v-if="activeTab !== 'messages'"
      :key="activeTab"
      :canvas-id="activeTab"
      :channel-id="selectedChannel?.id"
      :selected-canvas="selectedCanvas"
    />
  </div>
</template>

<style scoped lang="scss" src="./ChannelDetailView.scss"></style>
