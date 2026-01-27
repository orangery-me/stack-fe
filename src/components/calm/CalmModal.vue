<script setup>
import { onBeforeUnmount, watch } from "vue";

defineOptions({ name: "CalmModal" });

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: "",
  },
  closeOnBackdrop: {
    type: Boolean,
    default: true,
  },
  closeOnEsc: {
    type: Boolean,
    default: true,
  },
  busy: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["update:open"]);

const close = () => {
  if (props.busy) return;
  emit("update:open", false);
};

const onKeyDown = (e) => {
  if (!props.open) return;
  if (!props.closeOnEsc) return;
  if (props.busy) return;
  if (e.key === "Escape") close();
};

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) window.addEventListener("keydown", onKeyDown);
    else window.removeEventListener("keydown", onKeyDown);
  },
  { immediate: true }
);

onBeforeUnmount(() => window.removeEventListener("keydown", onKeyDown));
</script>

<template>
  <div
    v-if="open"
    class="calm-modal"
    role="dialog"
    aria-modal="true"
  >
    <div
      class="calm-modal__backdrop"
      @click="closeOnBackdrop ? close() : undefined"
    />
    <div class="calm-modal__dialog">
      <header class="calm-modal__header">
        <div class="calm-modal__title">
          <slot name="title">
            {{ title }}
          </slot>
        </div>
        <button
          type="button"
          class="calm-modal__close"
          :disabled="busy"
          aria-label="Close"
          @click="close"
        >
          ×
        </button>
      </header>

      <div class="calm-modal__body">
        <slot />
      </div>

      <footer
        v-if="$slots.actions"
        class="calm-modal__actions"
      >
        <slot name="actions" />
      </footer>
    </div>
  </div>
</template>

<style scoped lang="scss">
.calm-modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-24);
}

.calm-modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(17, 24, 39, 0.45);
}

.calm-modal__dialog {
  position: relative;
  width: 100%;
  max-width: 720px;
  background: var(--ui-bg-surface);
  border-radius: var(--ui-radius-modal);
  border: 1px solid var(--ui-divider);
  box-shadow: var(--ui-shadow-modal);
  overflow: hidden;
}

.calm-modal__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-16);
  padding: var(--space-24);
  border-bottom: 1px solid var(--ui-divider);
}

.calm-modal__title {
  font-size: 18px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--ui-text);
}

.calm-modal__close {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  border: 1px solid var(--ui-divider);
  background: #ffffff;
  color: var(--ui-text-muted);
  cursor: pointer;
  transition: background var(--ui-duration) var(--ui-ease),
    border-color var(--ui-duration) var(--ui-ease),
    color var(--ui-duration) var(--ui-ease),
    box-shadow var(--ui-duration) var(--ui-ease);

  &:hover:not(:disabled) {
    background: var(--gray-50);
    border-color: var(--ui-border);
    color: var(--ui-text);
  }

  &:focus-visible {
    outline: none;
    box-shadow: var(--ui-focus-ring);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.calm-modal__body {
  padding: var(--space-24);
}

.calm-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-12);
  padding: var(--space-16) var(--space-24);
  border-top: 1px solid var(--ui-divider);
  background: var(--gray-50);
}

@media (max-width: 640px) {
  .calm-modal {
    padding: var(--space-16);
  }

  .calm-modal__header,
  .calm-modal__body {
    padding: var(--space-16);
  }
}
</style>

