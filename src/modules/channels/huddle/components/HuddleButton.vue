<template>
  <button
    class="huddle-btn"
    :class="btnClass"
    :disabled="disabled"
    @click="handleClick"
  >
    <span class="huddle-icon">{{ icon }}</span>
    <span class="huddle-label">{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { huddleService } from '../services/huddle.service';

const props = defineProps<{
  channelId: string;
  isActive: boolean;
  userInCall: boolean;
}>();

const emit = defineEmits<{
  (e: 'join', response: any): void;
  (e: 'error', error: Error): void;
}>();

const icon = computed(() => (props.isActive ? '🔊' : '📞'));
const label = computed(() => {
  if (props.userInCall) return 'Đang trong cuộc gọi';
  if (props.isActive) return 'Join Call';
  return 'Huddle';
});
const disabled = computed(() => props.userInCall && !props.isActive);

const btnClass = computed(() => ({
  'huddle-btn--active': props.isActive,
  'huddle-btn--in-call': props.userInCall,
}));

async function handleClick() {
  try {
    if (props.userInCall) {
      // Already in call — do nothing (or could open existing popup)
      return;
    }

    if (props.isActive) {
      // Join existing huddle
      const sessionId = `session_${Date.now()}`;
      const response = await huddleService.joinHuddle(props.channelId, sessionId);
      emit('join', response);
    } else {
      // Create new huddle
      const response = await huddleService.createHuddle(props.channelId);
      emit('join', response);
    }
  } catch (err: any) {
    emit('error', err);
  }
}
</script>

<style scoped>
.huddle-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid var(--border-color, #e2e8f0);
  background: var(--bg-surface, #fff);
  color: var(--text-primary, #1a202c);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.huddle-btn:hover:not(:disabled) {
  background: var(--bg-hover, #f7fafc);
}
.huddle-btn:disabled {
  opacity: 0.6;
  cursor: default;
}
.huddle-btn--active {
  border-color: #22c55e;
  color: #16a34a;
  background: #f0fdf4;
}
.huddle-btn--in-call {
  border-color: #3b82f6;
  color: #2563eb;
  background: #eff6ff;
}
.huddle-icon {
  font-size: 16px;
}
</style>
