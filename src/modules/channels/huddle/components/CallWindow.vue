<template>
  <div class="call-window">
    <header class="call-header">
      <div class="call-header-info">
        <h1>{{ callTitle }}</h1>
        <p>{{ currentTime }} · Call ID: {{ callId || 'N/A' }}</p>
      </div>
      <div class="call-header-actions">
        <button
          class="call-header-action"
          type="button"
          title="Thông tin chi tiết"
          aria-label="Thông tin chi tiết"
        >
          <Info :size="19" />
        </button>
        <button
          class="call-header-action"
          :class="{ 'call-header-action--active': isChatOpen }"
          type="button"
          title="Chat"
          aria-label="Chat"
          @click="toggleChat"
        >
          <MessageCircle :size="19" />
        </button>
      </div>
    </header>

    <div class="call-body">
      <!-- Content -->
      <main
        class="call-content"
        :class="{ 'call-content--with-chat': isChatOpen }"
      >
        <div
          v-if="isConnected"
          class="participants-grid"
          :class="{ 'single-participant': huddleState.participants.length === 0 }"
        >
          <!-- Self tile -->
          <div class="participant-tile self-tile">
            <div class="video-container">
              <div
                v-if="localCameraEnabled"
                class="video-placeholder"
              >
                <video
                  ref="localVideoEl"
                  class="preview-video"
                  autoplay
                  muted
                  playsinline
                />
              </div>
              <div
                v-else
                class="avatar-placeholder"
              >
                {{ currentUserName?.charAt(0)?.toUpperCase() || '?' }}
              </div>
            </div>
            <div class="participant-meta">
              <span class="participant-name">{{ currentUserName }} (Bạn)</span>
              <span class="participant-status">
                <MicOff
                  v-if="!localMicEnabled"
                  :size="14"
                  class="text-red-500"
                />
              </span>
            </div>
          </div>

          <!-- Remote participants -->
          <div
            v-for="participant in huddleState.participants"
            :key="participant.id"
            class="participant-tile"
          >
            <div class="video-container">
              <div
                v-if="participant.cameraEnabled"
                class="video-placeholder"
              >
                <video
                  :ref="(el) => bindRemoteVideo(el, participant.id)"
                  class="preview-video"
                  autoplay
                  playsinline
                />
              </div>
              <div
                v-else
                class="avatar-placeholder"
              >
                {{ participant.displayName?.charAt(0)?.toUpperCase() || '?' }}
              </div>
            </div>
            <div class="participant-meta">
              <span class="participant-name">{{ participant.displayName }}</span>
              <span class="participant-status">
                <MicOff
                  v-if="!participant.micEnabled"
                  :size="14"
                  class="text-red-500"
                />
              </span>
            </div>
          </div>
        </div>

        <!-- Error state -->
        <div
          v-else-if="errorMessage"
          class="call-state"
        >
          <p class="call-state-text error">
            {{ errorMessage }}
          </p>
          <button
            class="retry-btn"
            @click="retryConnection"
          >
            Thử lại
          </button>
        </div>

        <!-- Connecting state -->
        <div
          v-else
          class="call-state"
        >
          <p class="call-state-text">
            Đang kết nối...
          </p>
        </div>
      </main>

      <HuddleChatSidebar
        v-if="hasOpenedChat"
        v-show="isChatOpen"
        :workspace-id="workspaceId"
        :channel-id="channelId"
        :channel-name="channelName"
        @close="isChatOpen = false"
      />
    </div>

    <!-- Controls -->
    <div
      v-if="isConnected"
      class="call-controls"
    >
      <button
        class="ctrl-btn"
        :class="{ 'ctrl-btn--off': !localMicEnabled }"
        title="Microphone"
        @click="toggleMic"
      >
        <Mic
          v-if="localMicEnabled"
          :size="20"
        />
        <MicOff
          v-else
          :size="20"
        />
      </button>
      <button
        class="ctrl-btn"
        :class="{ 'ctrl-btn--off': !localCameraEnabled }"
        title="Camera"
        @click="toggleCamera"
      >
        <Video
          v-if="localCameraEnabled"
          :size="20"
        />
        <VideoOff
          v-else
          :size="20"
        />
      </button>
      <button
        class="ctrl-btn ctrl-btn--leave"
        @click="handleLeave"
      >
        <PhoneOff
          class="leave-icon"
          :size="16"
        />
        <span>Rời</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watchEffect } from 'vue';
import { Track } from 'livekit-client';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Info, MessageCircle } from 'lucide-vue-next';
import { useHuddle } from '../composables/useHuddle';
import HuddleChatSidebar from './HuddleChatSidebar.vue';

const props = defineProps<{
  livekitUrl: string;
  livekitToken: string;
  callTitle: string;
  workspaceId: string;
  channelId: string;
  channelName: string;
  callId: string;
  currentUserName: string;
  initialMicEnabled: boolean;
  initialCameraEnabled: boolean;
}>();

const emit = defineEmits<{
  leave: [];
  error: [error: Error];
  retry: [];
}>();

const { state: huddleState, connect, disconnect, getRoom } = useHuddle();

const isConnected = ref(false);
const errorMessage = ref('');
const localMicEnabled = ref(props.initialMicEnabled);
const localCameraEnabled = ref(props.initialCameraEnabled);
const localVideoEl = ref<HTMLVideoElement | null>(null);
const isChatOpen = ref(false);
const hasOpenedChat = ref(false);
const currentTime = ref('');
let timeIntervalId: number | undefined;

function updateCurrentTime() {
  currentTime.value = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

watchEffect(() => {
  if (localVideoEl.value && localCameraEnabled.value) {
    const room = getRoom();
    if (room && room.localParticipant) {
      const trackPub = room.localParticipant.getTrackPublication(Track.Source.Camera);
      if (trackPub && trackPub.videoTrack) {
        trackPub.videoTrack.attach(localVideoEl.value);
      }
    }
  }
});

function bindRemoteVideo(el: any, participantId: string) {
  if (!el) return;
  const room = getRoom();
  if (room) {
    const remoteP = room.remoteParticipants.get(participantId);
    if (remoteP) {
      const trackPub = remoteP.getTrackPublication(Track.Source.Camera);
      if (trackPub && trackPub.videoTrack) {
        trackPub.videoTrack.attach(el);
      }
    }
  }
}

async function connectToRoom() {
  try {
    errorMessage.value = '';
    await connect(props.livekitUrl, props.livekitToken);

    const room = getRoom();
    if (room) {
      if (props.initialMicEnabled) {
        await room.localParticipant.setMicrophoneEnabled(true);
        localMicEnabled.value = true;
      } else {
        await room.localParticipant.setMicrophoneEnabled(false);
        localMicEnabled.value = false;
      }
      
      if (props.initialCameraEnabled) {
        await room.localParticipant.setCameraEnabled(true);
        localCameraEnabled.value = true;
      } else {
        await room.localParticipant.setCameraEnabled(false);
        localCameraEnabled.value = false;
      }
    }

    isConnected.value = true;
  } catch (err: any) {
    errorMessage.value = err.message || 'Connection failed';
    emit('error', err);
  }
}

async function retryConnection() {
  await connectToRoom();
}

onMounted(() => {
  updateCurrentTime();
  timeIntervalId = window.setInterval(updateCurrentTime, 60000);
  connectToRoom();
});

onUnmounted(() => {
  if (timeIntervalId) {
    window.clearInterval(timeIntervalId);
  }
  disconnect();
});

async function toggleMic() {
  const room = getRoom();
  if (!room) return;
  localMicEnabled.value = !localMicEnabled.value;
  await room.localParticipant.setMicrophoneEnabled(localMicEnabled.value);
}

async function toggleCamera() {
  const room = getRoom();
  if (!room) return;
  localCameraEnabled.value = !localCameraEnabled.value;
  await room.localParticipant.setCameraEnabled(localCameraEnabled.value);
}

function toggleChat() {
  isChatOpen.value = !isChatOpen.value;
  if (isChatOpen.value) {
    hasOpenedChat.value = true;
  }
}

function handleLeave() {
  disconnect();
  emit('leave');
}
</script>

<style scoped>
.call-window {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--gray-50, #f9fafb);
  color: var(--ui-text, #111827);
  font-family: inherit;
  overflow: hidden;
}
.call-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 68px;
  padding: 12px 20px;
  background: #ffffff;
  border-bottom: 1px solid var(--primary-100, #dbeafe);
  box-shadow: 0 1px 8px rgba(15, 23, 42, 0.04);
}
.call-header-info {
  min-width: 0;
}
.call-header-info h1 {
  margin: 0;
  color: var(--ui-text, #111827);
  font-size: 17px;
  font-weight: 700;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.call-header-info p {
  margin: 3px 0 0;
  color: var(--ui-text-muted, #374151);
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.call-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.call-header-action {
  width: 38px;
  height: 38px;
  border: 1px solid var(--ui-divider, #e5e7eb);
  border-radius: 8px;
  background: #ffffff;
  color: var(--ui-text-muted, #374151);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background var(--ui-duration-fast, 150ms) var(--ui-ease, ease-out),
    border-color var(--ui-duration-fast, 150ms) var(--ui-ease, ease-out),
    color var(--ui-duration-fast, 150ms) var(--ui-ease, ease-out);
}
.call-header-action:hover,
.call-header-action--active {
  background: var(--primary-100, #dbeafe);
  border-color: var(--primary-500, #2563eb);
  color: var(--primary-600, #1d4ed8);
}
.call-body {
  position: relative;
  display: flex;
  flex: 1;
  min-height: 0;
}
.call-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-y: auto;
  min-width: 0;
  background:
    linear-gradient(180deg, rgba(219, 234, 254, 0.56), rgba(249, 250, 251, 0.92)),
    var(--gray-50, #f9fafb);
}
.call-content--with-chat .participants-grid {
  width: 94%;
}
.participants-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 14px;
  padding: 20px;
  width: 90%;
  max-width: 1200px;
  align-content: center;
}
.participants-grid.single-participant {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}
.participants-grid.single-participant .participant-tile {
  width: 100%;
  max-width: 800px;
}
.participant-tile {
  background: #ffffff;
  border-radius: var(--ui-radius-card, 8px);
  overflow: hidden;
  border: 1px solid var(--ui-divider, #e5e7eb);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
}
.self-tile {
  border-color: rgba(37, 99, 235, 0.45);
  box-shadow: 0 12px 32px rgba(37, 99, 235, 0.14);
}
.video-container {
  aspect-ratio: 16/9;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0f172a;
}
.avatar-placeholder {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-500, #2563eb), var(--primary-600, #1d4ed8));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 700;
  color: #fff;
}
.video-placeholder {
  width: 100%;
  height: 100%;
}
.preview-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.participant-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  font-size: 13px;
  color: var(--ui-text, #111827);
}
.participant-name {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.participant-status {
  font-size: 11px;
  flex-shrink: 0;
}
.call-state {
  text-align: center;
  padding: 40px;
  background: #ffffff;
  border: 1px solid var(--primary-100, #dbeafe);
  border-radius: var(--ui-radius-modal, 12px);
  box-shadow: var(--ui-shadow-card, 0 1px 2px rgba(0, 0, 0, 0.04));
}
.call-state-text {
  font-size: 15px;
  color: var(--ui-text-muted, #374151);
  margin: 0 0 16px 0;
}
.call-state-text.error {
  color: var(--error, #dc2626);
}
.retry-btn {
  padding: 8px 24px;
  border-radius: var(--ui-radius-button, 6px);
  border: 1px solid var(--primary-500, #2563eb);
  background: #ffffff;
  color: var(--primary-600, #1d4ed8);
  font-size: 14px;
  cursor: pointer;
}
.retry-btn:hover {
  background: var(--primary-100, #dbeafe);
}
.call-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 14px 20px;
  background: #ffffff;
  border-top: 1px solid var(--primary-100, #dbeafe);
  box-shadow: 0 -1px 8px rgba(15, 23, 42, 0.04);
}
.ctrl-btn {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  border: none;
  background: var(--primary-100, #dbeafe);
  color: var(--primary-600, #1d4ed8);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.ctrl-btn:hover {
  background: #bfdbfe;
}
.ctrl-btn--off {
  background: var(--error, #dc2626);
  color: #ffffff;
}
.ctrl-btn--off:hover {
  background: #b91c1c;
}
.ctrl-btn--leave {
  width: auto;
  padding: 0 22px;
  border-radius: 24px;
  background: var(--error, #dc2626);
  color: #ffffff;
  gap: 6px;
  font-size: 14px;
}
.ctrl-btn--leave:hover {
  background: #b91c1c;
}
.leave-icon {
  font-size: 14px;
}

@media (max-width: 860px) {
  .call-header {
    align-items: flex-start;
    padding: 10px 12px;
  }

  .call-header-info h1 {
    font-size: 15px;
  }

  .call-header-info p {
    font-size: 12px;
  }

  .participants-grid {
    width: 100%;
    padding: 12px;
    grid-template-columns: 1fr;
  }
}
</style>
