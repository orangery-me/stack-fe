<template>
  <div class="huddle-system-msg" :class="statusClass">
    <span class="huddle-icon">
      <PhoneCall v-if="isEndedMessage" :size="16" />
      <Volume2 v-else :size="16" />
    </span>
    <span class="huddle-text">{{ statusText }}</span>
    <button
      v-if="showJoinButton"
      class="join-btn"
      @click="$emit('join')"
    >
      Join Call
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Volume2, PhoneCall } from 'lucide-vue-next';
import { useHuddleStore } from '../stores/huddle.store';

const store = useHuddleStore();

defineEmits<{
  (e: 'join'): void;
}>();

const props = defineProps<{
  messageContent: string;
}>();

const isEndedMessage = computed(() => props.messageContent === 'Huddle ended' || !store.hasActiveHuddle);

const statusText = computed(() => {
  if (props.messageContent === 'Huddle ended') {
    return 'Huddle đã kết thúc';
  }
  if (store.isActive) {
    return `Huddle đang diễn ra — ${store.participantCount} người`;
  }
  if (!store.hasActiveHuddle) {
    return 'Huddle đã kết thúc';
  }
  return 'Có huddle đang diễn ra. Tham gia ngay';
});

const statusClass = computed(() => ({
  'system-msg--active': !isEndedMessage.value,
  'system-msg--ended': isEndedMessage.value,
}));

const showJoinButton = computed(() => props.messageContent === 'Huddle started' && store.hasActiveHuddle && !store.isActive);
</script>

<style scoped>
.huddle-system-msg {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 8px;
  margin: 8px 0;
  font-size: 14px;
}
.system-msg--active {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
}
.system-msg--ended {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  color: #64748b;
}
.huddle-icon {
  font-size: 16px;
}
.huddle-text {
  flex: 1;
}
.join-btn {
  padding: 6px 14px;
  border-radius: 6px;
  border: none;
  background: #22c55e;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}
.join-btn:hover {
  background: #16a34a;
}
</style>
