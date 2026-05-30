<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { FileText, ListTodo, X } from "lucide-vue-next";

const emit = defineEmits<{
  dismissed: [];
}>();

const visible = ref(true);
let timer: ReturnType<typeof setTimeout> | undefined;

function dismiss() {
  visible.value = false;
  emit("dismissed");
}

onMounted(() => {
  timer = setTimeout(dismiss, 4500);
});

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
});
</script>

<template>
  <Transition name="transcript-banner">
    <div
      v-if="visible"
      class="transcript-banner"
    >
      <div class="transcript-banner__content">
        <span class="transcript-banner__item">
          <FileText :size="15" />
          AI Summary
        </span>
        <span class="transcript-banner__item">
          <ListTodo :size="15" />
          AI Task Generation
        </span>
      </div>
      <button
        type="button"
        class="transcript-banner__close"
        title="Close"
        aria-label="Close"
        @click="dismiss"
      >
        <X :size="15" />
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.transcript-banner {
  position: absolute;
  top: 64px;
  left: 50%;
  z-index: 30;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: calc(100% - 32px);
  padding: 9px 10px 9px 12px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
  color: #1e3a8a;
}

.transcript-banner__content {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.transcript-banner__item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.transcript-banner__close {
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #1e40af;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.transcript-banner__close:hover {
  background: #dbeafe;
}

.transcript-banner-enter-active,
.transcript-banner-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.transcript-banner-enter-from,
.transcript-banner-leave-to {
  opacity: 0;
  transform: translate(-50%, -6px);
}
</style>
