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
    :class="['toast', `toast--${type}`]"
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
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 0.9rem;
  border: 1px solid var(--ui-divider);
  border-left: 4px solid var(--toast-accent);
  border-radius: var(--ui-radius-card);
  background: #ffffff;
  color: var(--ui-text);
  min-width: 300px;
  max-width: 500px;
  animation: slideIn 0.3s ease-out;
  position: relative;
  box-shadow: var(--ui-shadow-modal);
  transition: transform var(--ui-duration) var(--ui-ease);
  pointer-events: auto;

  // &::before {
  // content: "";
  // position: absolute;
  // top: 0;
  // left: 0;
  // right: 0;
  // height: 1px;
  // background: linear-gradient(90deg, transparent, currentColor, transparent);
  // opacity: 0.5;
  // }

  &:hover {
    transform: translateY(-1px);
  }
}

.toast__content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.toast__icon {
  font-size: 1.25rem;
  font-weight: bold;
  flex-shrink: 0;
  color: var(--toast-accent);
}

.toast__message {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}

.toast__close {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 1px solid var(--ui-divider);
  background: #ffffff;
  color: var(--ui-text-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background var(--ui-duration) var(--ui-ease),
    border-color var(--ui-duration) var(--ui-ease),
    color var(--ui-duration) var(--ui-ease),
    box-shadow var(--ui-duration) var(--ui-ease);

  &:hover {
    background: var(--gray-50);
    border-color: var(--ui-border);
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
    padding: 0.75rem 0.9rem;
  }

  .toast__message {
    font-size: 0.875rem;
  }
}
</style>
