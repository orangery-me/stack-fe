<script setup>
import { computed, onMounted } from "vue";

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    default: "info",
    validator: (value) =>
      ["success", "error", "warning", "info"].includes(value),
  },
  message: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
    default: 5000,
  },
});

const emit = defineEmits(["dismiss"]);

const typeConfig = computed(() => {
  const configs = {
    success: {
      icon: "✓",
      accentColor: "var(--success)",
    },
    error: {
      icon: "✕",
      accentColor: "var(--error)",
    },
    warning: {
      icon: "⚠",
      accentColor: "var(--warning)",
    },
    info: {
      icon: "ℹ",
      accentColor: "var(--info)",
    },
  };
  return configs[props.type] || configs.info;
});

let timeoutId = null;

onMounted(() => {
  if (props.duration > 0) {
    timeoutId = setTimeout(() => {
      emit("dismiss", props.id);
    }, props.duration);
  }
});

const handleDismiss = () => {
  if (timeoutId) {
    clearTimeout(timeoutId);
  }
  emit("dismiss", props.id);
};
</script>

<template>
  <div
    :class="['toast', `toast--${type}`, 'show']"
    :style="{
      '--toast-accent': typeConfig.accentColor,
    }"
  >
    <div class="toast__content">
      <span class="toast__icon">{{ typeConfig.icon }}</span>
      <p class="toast__message">
        {{ message }}
      </p>
    </div>
    <button
      class="toast__close"
      aria-label="Đóng"
      @click="handleDismiss"
    >
      ×
    </button>
  </div>
</template>

<style scoped lang="scss">
.toast {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1rem 1rem 1.25rem;
  padding-right: 2.75rem;
  border: none;
  border-left: 4px solid var(--toast-accent);
  border-radius: 12px;
  background: var(--ui-bg-surface);
  color: var(--ui-text);
  min-width: 320px;
  max-width: 420px;
  animation: slideIn 0.3s ease-out;
  position: relative;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -2px rgba(0, 0, 0, 0.1),
    0 0 0 1px rgba(0, 0, 0, 0.05);
  transition: transform var(--ui-duration) var(--ui-ease), box-shadow var(--ui-duration) var(--ui-ease);
  pointer-events: auto;

  &:hover {
    transform: translateY(-2px);
    box-shadow:
      0 10px 15px -3px rgba(0, 0, 0, 0.1),
      0 4px 6px -4px rgba(0, 0, 0, 0.1),
      0 0 0 1px rgba(0, 0, 0, 0.05);
  }
}

.toast__content {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
}

.toast__icon {
  font-size: 1.125rem;
  font-weight: 600;
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.06);
  color: var(--toast-accent);
}

.toast__message {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  flex: 1;
}

.toast__close {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--ui-text-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.125rem;
  line-height: 1;
  transition: background var(--ui-duration) var(--ui-ease), color var(--ui-duration) var(--ui-ease);

  &:hover {
    background: rgba(0, 0, 0, 0.06);
    color: var(--ui-text);
  }

  &:focus-visible {
    outline: none;
    box-shadow: var(--ui-focus-ring);
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@media (max-width: 768px) {
  .toast {
    min-width: 280px;
    max-width: calc(100vw - 2rem);
    padding: 1rem 1rem 1rem 1.25rem;
    padding-right: 2.75rem;
  }

  .toast__message {
    font-size: 0.875rem;
  }
}
</style>
