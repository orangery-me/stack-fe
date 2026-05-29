<template>
  <div class="participant-list">
    <div class="list-header">
      <span>Người tham gia ({{ participants.length }})</span>
    </div>
    <div class="tiles-grid" v-if="participants.length > 0">
      <ParticipantTile
        v-for="participant in participants"
        :key="participant.id"
        :participant="participant"
      />
    </div>
    <div v-else class="empty-state">
      Chưa có ai tham gia
    </div>
  </div>
</template>

<script setup lang="ts">
import type { HuddleParticipantInfo } from '../types/huddle.types';
import ParticipantTile from './ParticipantTile.vue';

defineProps<{
  participants: HuddleParticipantInfo[];
}>();
</script>

<style scoped>
.participant-list {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}
.list-header {
  padding: 12px 16px;
  font-size: 14px;
  color: #a0aec0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.tiles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
  padding: 16px;
}
.empty-state {
  text-align: center;
  padding: 32px;
  color: #a0aec0;
}
</style>
