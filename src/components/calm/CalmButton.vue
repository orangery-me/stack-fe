<script setup>
defineOptions({ name: "CalmButton" });

defineProps({
  variant: {
    type: String,
    default: "primary", // primary | secondary | ghost
  },
  size: {
    type: String,
    default: "md", // sm | md | lg
  },
  type: {
    type: String,
    default: undefined, // let parent decide; if undefined, browser default applies
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
});
</script>

<template>
  <button
    :type="type"
    :class="[
      'calm-button',
      `calm-button--${variant}`,
      `calm-button--${size}`,
      { 'calm-button--disabled': disabled || loading },
    ]"
    :disabled="disabled || loading"
  >
    <span
      v-if="loading"
      class="calm-button__spinner"
      aria-hidden="true"
    />
    <span class="calm-button__label">
      <slot />
    </span>
  </button>
</template>

<style scoped lang="scss">
.calm-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-8);
  border-radius: var(--ui-radius-button);
  border: 1px solid transparent;
  padding: 0 var(--space-16);
  cursor: pointer;
  user-select: none;
  transition: background var(--ui-duration) var(--ui-ease),
    border-color var(--ui-duration) var(--ui-ease),
    color var(--ui-duration) var(--ui-ease),
    box-shadow var(--ui-duration) var(--ui-ease);

  &:focus-visible {
    outline: none;
    box-shadow: var(--ui-focus-ring);
  }

  &--sm {
    height: 36px;
    font-size: 14px;
  }

  &--md {
    height: 38px;
    font-size: 14px;
  }

  &--lg {
    height: 40px;
    font-size: 15px;
  }

  &--primary {
    background: var(--primary-500);
    border-color: var(--primary-500);
    color: #ffffff;

    &:hover:not(:disabled) {
      background: var(--primary-600);
      border-color: var(--primary-600);
    }
  }

  &--secondary {
    background: #ffffff;
    border-color: var(--ui-border);
    color: var(--ui-text);

    &:hover:not(:disabled) {
      background: var(--gray-50);
      border-color: var(--gray-300);
    }
  }

  &--ghost {
    background: transparent;
    border-color: transparent;
    color: var(--ui-text);

    &:hover:not(:disabled) {
      background: var(--gray-100);
    }
  }

  &--disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.calm-button__spinner {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 2px solid rgba(255, 255, 255, 0.55);
  border-top-color: rgba(255, 255, 255, 0);
  animation: spin 0.8s linear infinite;
}

.calm-button--secondary .calm-button__spinner,
.calm-button--ghost .calm-button__spinner {
  border-color: rgba(17, 24, 39, 0.35);
  border-top-color: rgba(17, 24, 39, 0);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

