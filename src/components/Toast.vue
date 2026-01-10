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
      borderColor: "rgba(16, 185, 129, 0.5)",
      bgColor: "rgba(0, 0, 0, 0.75)",
      textColor: "#ffffff",
      glowColor: "rgba(16, 185, 129, 0.3)",
    },
    error: {
      icon: "✕",
      borderColor: "rgba(239, 68, 68, 0.5)",
      bgColor: "rgba(0, 0, 0, 0.75)",
      textColor: "#ef4444",
      glowColor: "rgba(239, 68, 68, 0.3)",
    },
    warning: {
      icon: "⚠",
      borderColor: "rgba(245, 158, 11, 0.5)",
      bgColor: "rgba(0, 0, 0, 0.75)",
      textColor: "#f59e0b",
      glowColor: "rgba(245, 158, 11, 0.3)",
    },
    info: {
      icon: "ℹ",
      borderColor: "#b8a7ff",
      bgColor: "#b8a7ff",
      textColor: "#ffffff",
      glowColor: "rgba(184, 167, 255, 0.3)",
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
      borderColor: typeConfig.borderColor,
      backgroundColor: typeConfig.bgColor,
      color: typeConfig.textColor,
      boxShadow: `0 0 20px ${typeConfig.glowColor}, 0 0 40px ${typeConfig.glowColor}`,
      opacity: '1',
    }"
  >
    <div class="toast__content">
      <span class="toast__icon">{{ typeConfig.icon }}</span>
      <p class="toast__message">
        {{ message }}
      </p>
    </div>
    <button class="toast__close" aria-label="Đóng" @click="handleDismiss" />
  </div>
</template>

<style scoped lang="scss">
.toast {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border: 1px solid;
  border-radius: 2px;
  min-width: 300px;
  max-width: 500px;
  animation: slideIn 0.3s ease-out;
  position: relative;
  font-family: "Merriweather", serif;
  font-weight: 300;
  transition: all 0.3s ease;
  // backdrop-filter: blur(12px);
  opacity: 1 !important;

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
    transform: translateX(-4px);
    box-shadow: 0 0 30px currentColor, 0 0 60px currentColor;
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
}

.toast__message {
  margin: 0;
  font-size: 0.9375rem;
  line-height: 1.5;
}

// .toast__close {
//   background: none;
//   border: none;
//   color: rgba(241, 245, 249, 0.6);
//   cursor: pointer;
//   font-size: 1.125rem;
//   padding: 0;
//   width: 20px;
//   height: 20px;
//   display: flex;
//   align-items: center;
//   justify-content: center;
//   flex-shrink: 0;
//   transition: all 0.2s ease;
//   border-radius: 2px;

//   &:hover {
//     color: #f1f5f9;
//     background: rgba(255, 255, 255, 0.1);
//   }
// }

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
    padding: 0.875rem 1rem;
  }

  .toast__message {
    font-size: 0.875rem;
  }
}
</style>
