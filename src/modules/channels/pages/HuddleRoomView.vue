<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "@/modules/auth/stores/auth.store.js";
import { useChannelStore } from "@/modules/channels/stores/channel.store.js";
import { useWorkspaceStore } from "@/modules/workspaces/stores/workspace.store.js";
import { huddleService } from "@/modules/channels/huddle/services/huddle.service";
import PreCallStaging from "@/modules/channels/huddle/components/PreCallStaging.vue";
import CallWindow from "@/modules/channels/huddle/components/CallWindow.vue";
import AppLoading from "@/components/loading/AppLoading.vue";

const route = useRoute();
const authStore = useAuthStore();
const channelStore = useChannelStore();
const workspaceStore = useWorkspaceStore();

const workspaceId = String(route.params.workspaceId || "");
const channelId = String(route.params.channelId || "");

const isLoading = ref(true);
const huddleIsCreator = ref(false);
const showPreCallStaging = ref(false);
const showCallOverlay = ref(false);
const huddleCallData = ref(null);
const huddleParticipantCount = ref(0);
const joinConfig = ref({ micEnabled: true, cameraEnabled: false });

const huddleChannelName = computed(() => {
  const channel =
    channelStore.getChannelById(channelId) ||
    (channelStore.selectedChannel?.id === channelId ? channelStore.selectedChannel : null);
  return channel?.name || "Huddle Call";
});

const huddleUserName = computed(() => authStore.user?.name || authStore.user?.email || "Unknown");

onMounted(async () => {
  try {
    const preloadRequests = [];
    const shouldRefreshWorkspace = workspaceStore.workspaceDetail?.id !== workspaceId;

    if (shouldRefreshWorkspace) {
      preloadRequests.push(workspaceStore.fetchWorkspaceById(workspaceId));
    }

    if (shouldRefreshWorkspace || !workspaceStore.members.length) {
      preloadRequests.push(workspaceStore.fetchMembers(workspaceId));
    }

    if (!channelStore.getChannelById(channelId) && channelStore.selectedChannel?.id !== channelId) {
      await channelStore.fetchChannelById(workspaceId, channelId);
    }

    if (preloadRequests.length) {
      await Promise.all(preloadRequests);
    }
    
    const status = await huddleService.getStatus(channelId);
    if (status.active) {
      huddleIsCreator.value = false;
      huddleParticipantCount.value = status.participantCount || status.call?.participantCount || 0;
    } else {
      huddleIsCreator.value = true;
      huddleParticipantCount.value = 0;
    }
    showPreCallStaging.value = true;
  } catch (err) {
    console.error("Failed to fetch huddle status:", err);
    huddleIsCreator.value = true;
    showPreCallStaging.value = true;
  } finally {
    isLoading.value = false;
  }
});

async function handlePreCallJoin(config) {
  try {
    isLoading.value = true;
    joinConfig.value = config;
    if (huddleIsCreator.value) {
      const response = await huddleService.createHuddle(channelId);
      huddleCallData.value = response;
    } else {
      const sessionId = `session_${Date.now()}`;
      const response = await huddleService.joinHuddle(channelId, sessionId);
      huddleCallData.value = response;
    }
    showPreCallStaging.value = false;
    showCallOverlay.value = true;
  } catch (err) {
    console.error("Failed to join huddle:", err);
    alert(err?.response?.data?.message || "Không thể tham gia cuộc gọi");
  } finally {
    isLoading.value = false;
  }
}

function handlePreCallCancel() {
  window.close(); // Close the tab if they cancel
}

async function handleCallLeave() {
  showCallOverlay.value = false;
  try {
    await huddleService.leaveHuddle(channelId);
  } catch (err) {
    console.error("Failed to leave huddle:", err);
  }
  huddleCallData.value = null;
  window.close(); // Close the tab after leaving
}
</script>

<template>
  <div class="huddle-room-view">
    <div
      v-if="isLoading && !showPreCallStaging && !showCallOverlay"
      class="loading-overlay"
    >
      <AppLoading :active="true" />
    </div>

    <!-- PreCall Staging -->
    <PreCallStaging
      v-if="showPreCallStaging"
      :title="huddleChannelName"
      :user-name="huddleUserName"
      :is-creator="huddleIsCreator"
      :participant-count="huddleParticipantCount"
      @join="handlePreCallJoin"
      @cancel="handlePreCallCancel"
    />

    <!-- Main Call Window -->
    <CallWindow
      v-if="showCallOverlay && huddleCallData"
      :livekit-url="huddleCallData.livekitUrl"
      :livekit-token="huddleCallData.livekitToken"
      :call-title="`#${huddleChannelName} — Huddle`"
      :workspace-id="workspaceId"
      :channel-id="channelId"
      :channel-name="huddleChannelName"
      :call-id="huddleCallData.callId || huddleCallData.livekitRoomName || 'N/A'"
      :current-user-name="huddleUserName"
      :initial-mic-enabled="joinConfig.micEnabled"
      :initial-camera-enabled="joinConfig.cameraEnabled"
      @leave="handleCallLeave"
    />
  </div>
</template>

<style scoped>
.huddle-room-view {
  width: 100vw;
  height: 100vh;
  background-color: var(--gray-50, #f9fafb);
  overflow: hidden;
  position: relative;
}
.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
