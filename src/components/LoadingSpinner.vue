<script setup>
import { computed } from "vue";

const props = defineProps({
  loading: { type: Boolean, default: false },
  label: { type: String, default: "Loading..." },
  size: { type: Number, default: 18 },
  center: { type: Boolean, default: true },
});

const sizePx = computed(() => `${props.size}px`);
</script>

<template>
  <div
    v-if="loading"
    class="loading-spinner"
    :class="{ 'loading-spinner--center': center }"
    role="status"
    aria-live="polite"
  >
    <span
      class="loading-spinner__spinner"
      aria-hidden="true"
    />
    <span class="loading-spinner__label">
      {{ label }}
    </span>
  </div>
</template>

<style scoped>
.loading-spinner {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--ui-divider);
  border-radius: 999px;
  background: #ffffff;
  color: var(--ui-text-muted);
  font-size: 13px;
}

.loading-spinner--center {
  display: flex;
  justify-content: center;
  width: 100%;
}

.loading-spinner__spinner {
  width: v-bind(sizePx);
  height: v-bind(sizePx);
  border-radius: 999px;
  border: 2px solid rgba(107, 114, 128, 0.25);
  border-top-color: rgba(107, 114, 128, 0.85);
  animation: loading-spinner-rotate 0.9s linear infinite;
}

.loading-spinner__label {
  line-height: 1;
  white-space: nowrap;
}

@keyframes loading-spinner-rotate {
  to {
    transform: rotate(360deg);
  }
}
</style>
