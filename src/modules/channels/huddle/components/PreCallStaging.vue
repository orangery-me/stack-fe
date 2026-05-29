<template>
  <div class="precall-page">
    <div class="precall-container">
      
      <!-- Left Column: Video Preview -->
      <div class="precall-left">
        <div class="video-wrapper">
          <video
            v-show="previewStream && cameraEnabled"
            ref="previewVideoEl"
            class="preview-video"
            autoplay
            muted
            playsinline
          />
          <div v-show="!cameraEnabled" class="video-placeholder">
            <span class="placeholder-text">Do you want people to see you in the meeting?</span>
            <button class="allow-cam-btn" @click="toggleCamera">Allow camera</button>
          </div>
          
          <!-- Bottom overlay controls -->
          <div class="video-controls">
            <button
              class="control-btn"
              :class="{ 'control-btn--off': !micEnabled }"
              @click="toggleMic"
            >
              <Mic v-if="micEnabled" :size="24" class="icon" />
              <MicOff v-else :size="24" class="icon icon-off" />
            </button>
            <button
              class="control-btn"
              :class="{ 'control-btn--off': !cameraEnabled }"
              @click="toggleCamera"
            >
              <Video v-if="cameraEnabled" :size="24" class="icon" />
              <VideoOff v-else :size="24" class="icon icon-off" />
            </button>
          </div>
        </div>
      </div>

      <!-- Right Column: Join Actions -->
      <div class="precall-right">
        <h1 class="ready-title">Ready to join?</h1>
        <p class="ready-subtitle">
          <span v-if="participantCount === 0">No one else is here</span>
          <span v-else>{{ participantCount }} {{ participantCount === 1 ? 'person' : 'people' }} in call</span>
        </p>
        
        <button
          class="join-btn"
          :disabled="isJoining"
          @click="handleJoin"
        >
          {{ isJoining ? 'Joining...' : 'Join now' }}
        </button>
        
        <p v-if="!hasMediaSupport" class="support-warning">
          Browser doesn't support WebRTC.
        </p>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watchEffect } from 'vue';
import { Mic, MicOff, Video, VideoOff } from 'lucide-vue-next';

const props = defineProps<{
  title: string;
  subtitle?: string;
  userName: string;
  isCreator: boolean;
  participantCount: number;
}>();

const emit = defineEmits<{
  join: [config: { micEnabled: boolean; cameraEnabled: boolean }];
  cancel: [];
}>();

const micEnabled = ref(true);
const cameraEnabled = ref(false);
const isJoining = ref(false);
const hasMediaSupport = ref(true);
const previewStream = ref<MediaStream | null>(null);
const previewVideoEl = ref<HTMLVideoElement | null>(null);

async function startPreview() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    previewStream.value = stream;
    micEnabled.value = true;
    cameraEnabled.value = false;
  } catch {
    hasMediaSupport.value = false;
    micEnabled.value = false;
    cameraEnabled.value = false;
  }
}

watchEffect(() => {
  if (previewStream.value && previewVideoEl.value && cameraEnabled.value) {
    previewVideoEl.value.srcObject = previewStream.value;
  }
});

onMounted(() => {
  startPreview();
});

onUnmounted(() => {
  if (previewStream.value) {
    previewStream.value.getTracks().forEach((track) => track.stop());
    previewStream.value = null;
  }
});

function toggleMic() {
  micEnabled.value = !micEnabled.value;
  if (previewStream.value) {
    previewStream.value.getAudioTracks().forEach(
      (track) => (track.enabled = micEnabled.value),
    );
  }
}

async function toggleCamera() {
  if (!cameraEnabled.value) {
    // Turning on
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (!previewStream.value) {
        previewStream.value = new MediaStream();
      }
      const videoTrack = videoStream.getVideoTracks()[0];
      previewStream.value.addTrack(videoTrack);
      cameraEnabled.value = true;
    } catch (err) {
      console.error("Failed to turn on camera:", err);
    }
  } else {
    // Turning off
    cameraEnabled.value = false;
    if (previewStream.value) {
      const videoTracks = previewStream.value.getVideoTracks();
      videoTracks.forEach(track => {
        track.stop();
        previewStream.value!.removeTrack(track);
      });
    }
  }
}

function handleJoin() {
  isJoining.value = true;
  // Stop preview tracks before joining (LiveKit will take over)
  if (previewStream.value) {
    previewStream.value.getTracks().forEach((track) => track.stop());
    previewStream.value = null;
  }
  emit('join', {
    micEnabled: micEnabled.value,
    cameraEnabled: cameraEnabled.value,
  });
}

function handleCancel() {
  if (previewStream.value) {
    previewStream.value.getTracks().forEach((track) => track.stop());
    previewStream.value = null;
  }
  emit('cancel');
}

const joinLabel = props.isCreator ? 'Bắt đầu cuộc gọi' : 'Tham gia';
</script>

<style scoped>
.precall-page {
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #ffffff;
  font-family: 'Google Sans', Roboto, Arial, sans-serif;
  color: #3c4043;
}
.precall-container {
  display: flex;
  width: 100%;
  max-width: 1200px;
  gap: 40px;
  align-items: center;
  padding: 0 40px;
}
.precall-left {
  flex: 2;
  display: flex;
  justify-content: center;
}
.video-wrapper {
  position: relative;
  width: 100%;
  max-width: 740px;
  aspect-ratio: 16/9;
  background-color: #202124;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px 0 rgba(60,64,67,0.3), 0 4px 8px 3px rgba(60,64,67,0.15);
}
.preview-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
}
.video-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}
.placeholder-text {
  color: #fff;
  font-size: 18px;
}
.allow-cam-btn {
  background-color: #1a73e8;
  color: #fff;
  border: none;
  padding: 10px 24px;
  border-radius: 4px;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}
.allow-cam-btn:hover {
  background-color: #1b66c9;
}
.video-controls {
  position: absolute;
  bottom: 24px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 16px;
}
.control-btn {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.4);
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}
.control-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}
.control-btn--off {
  background: #ea4335;
  border-color: #ea4335;
}
.control-btn--off:hover {
  background: #d93025;
  border-color: #d93025;
}
.icon {
  color: #fff;
}

.precall-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.ready-title {
  font-size: 36px;
  font-weight: 400;
  margin: 0 0 8px 0;
  color: #202124;
}
.ready-subtitle {
  font-size: 16px;
  color: #5f6368;
  margin: 0 0 32px 0;
}
.join-btn {
  background-color: #1a73e8;
  color: #fff;
  border: none;
  padding: 0 32px;
  height: 48px;
  border-radius: 24px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: box-shadow 0.2s, background-color 0.2s;
}
.join-btn:hover:not(:disabled) {
  background-color: #1b66c9;
  box-shadow: 0 1px 3px 0 rgba(60,64,67,0.3), 0 4px 8px 3px rgba(60,64,67,0.15);
}
.join-btn:disabled {
  background-color: #e8eaed;
  color: #9aa0a6;
  cursor: not-allowed;
}
.support-warning {
  margin-top: 16px;
  color: #ea4335;
  font-size: 14px;
}

@media (max-width: 900px) {
  .precall-container {
    flex-direction: column;
    padding: 20px;
  }
  .precall-left, .precall-right {
    width: 100%;
  }
}
</style>
