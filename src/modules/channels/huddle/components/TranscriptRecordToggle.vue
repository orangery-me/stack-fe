<template>
  <button
    class="transcript-record-btn"
    :class="{
      'transcript-record-btn--idle': !recording,
      'transcript-record-btn--recording': recording,
    }"
    type="button"
    :disabled="recording || loading"
    :title="recording ? 'Đang lưu transcript' : 'Bắt đầu lưu transcript'"
    :aria-label="recording ? 'Đang lưu transcript' : 'Bắt đầu lưu transcript'"
    @click="handleClick"
  >
    <span class="transcript-record-btn-label">
      <Loader2
        v-if="loading"
        class="spinner"
        :size="17"
      />
      <FileText
        v-else-if="recording"
        :size="17"
      />
      <span>{{ buttonText }}</span>
    </span>
    <span class="transcript-record-btn-menu" aria-hidden="true">
      <ChevronDown :size="18" />
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ChevronDown, FileText, Loader2 } from 'lucide-vue-next';

const props = defineProps<{
  recording: boolean;
  loading: boolean;
}>();

const emit = defineEmits<{
  start: [];
}>();

function handleClick() {
  if (props.recording || props.loading) return;
  emit('start');
}

const buttonText = computed(() => {
  if (props.loading) return 'Starting...';
  if (props.recording) return 'Transcribing';
  return 'Start transcribing';
});
</script>

<style scoped>
.transcript-record-btn {
  min-width: 188px;
  height: 40px;
  padding: 0;
  border-radius: 14px;
  border: 1px solid rgba(29, 78, 216, 0.18);
  background: #3b82f6;
  color: #ffffff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  overflow: hidden;
  font-size: 14px;
  font-weight: 700;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
  transition:
    background 0.15s,
    box-shadow 0.15s,
    color 0.15s,
    border-color 0.15s,
    opacity 0.15s;
}

.transcript-record-btn:hover {
  background: #2563eb;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.18);
}

.transcript-record-btn--idle {
  background: #3b82f6;
  color: #ffffff;
  border-color: rgba(29, 78, 216, 0.2);
}

.transcript-record-btn--idle:hover {
  background: #2563eb;
}

.transcript-record-btn--recording {
  cursor: default;
  background: #1d4ed8;
}

.transcript-record-btn:disabled {
  opacity: 0.9;
}

.transcript-record-btn-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 0;
  flex: 1 1 auto;
  height: 100%;
  padding: 0 18px 0 22px;
  white-space: nowrap;
}

.transcript-record-btn-menu {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 44px;
  height: 100%;
  border-left: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(29, 78, 216, 0.18);
}

.spinner {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 640px) {
  .transcript-record-btn {
    min-width: 44px;
    width: 44px;
    height: 38px;
    border-radius: 12px;
  }

  .transcript-record-btn-label {
    padding: 0;
  }

  .transcript-record-btn-label span {
    display: none;
  }

  .transcript-record-btn-label::before {
    content: 'T';
    font-size: 14px;
  }

  .transcript-record-btn-menu {
    display: none;
  }
}
</style>
