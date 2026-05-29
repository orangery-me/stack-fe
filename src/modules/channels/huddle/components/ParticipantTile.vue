<template>
  <div class="participant-tile">
    <div class="video-container">
      <div v-if="participant.cameraEnabled" class="video-placeholder">
        <Video class="lucide-icon" :size="32" />
      </div>
      <div v-else class="avatar-placeholder">
        {{ participant.displayName?.charAt(0)?.toUpperCase() || '?' }}
      </div>
    </div>
    <div class="participant-info">
      <span class="participant-name">{{ participant.displayName }}</span>
      <span class="status-icons">
        <MicOff v-if="!participant.micEnabled" title="Mic off" :size="14" class="text-red-500" />
        <Mic v-else title="Mic on" class="status-on" :size="14" />
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Video, Mic, MicOff } from 'lucide-vue-next';
import type { HuddleParticipantInfo } from '../types/huddle.types';

defineProps<{
  participant: HuddleParticipantInfo;
}>();
</script>

<style scoped>
.participant-tile {
  background: #16213e;
  border-radius: 12px;
  overflow: hidden;
  min-width: 200px;
}
.video-container {
  aspect-ratio: 16/10;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0f3460;
}
.avatar-placeholder {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #533483;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 600;
  color: #fff;
}
.video-placeholder {
  font-size: 32px;
  color: rgba(255, 255, 255, 0.6);
}
.participant-info {
  padding: 8px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: #e2e8f0;
}
.status-icons {
  display: flex;
  gap: 4px;
  font-size: 12px;
}
.status-on {
  opacity: 0.5;
}
</style>
