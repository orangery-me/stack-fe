<template>
  <button
    class="ctrl-btn"
    :class="{ 'ctrl-btn--off': !enabled }"
    type="button"
    :title="enabled ? 'Tắt subtitle' : 'Bật subtitle'"
    :aria-label="enabled ? 'Tắt subtitle' : 'Bật subtitle'"
    @click="handleClick"
  >
    <Captions
      v-if="enabled"
      :size="20"
    />
    <CaptionsOff
      v-else
      :size="20"
    />
  </button>
</template>

<script setup lang="ts">
import { Captions, CaptionsOff } from 'lucide-vue-next';

const props = defineProps<{
  enabled: boolean;
}>();

const emit = defineEmits<{
  toggle: [enabled: boolean];
}>();

function handleClick() {
  emit('toggle', !props.enabled);
}
</script>

<style scoped>
.ctrl-btn {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  border: none;
  background: var(--primary-100, #dbeafe);
  color: var(--primary-600, #1d4ed8);
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
  background: #f3f4f6;
  color: var(--ui-text-muted, #374151);
  border: 1px solid var(--ui-divider, #e5e7eb);
}

.ctrl-btn--off:hover {
  background: #e5e7eb;
}
</style>
