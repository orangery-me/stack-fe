<script setup lang="ts">
import { computed } from "vue";
import LottiePlayer from "./LottiePlayer.vue";

import loadingElement from "@/assets/lottie/loading_element.json";
import loadingFullscreen from "@/assets/lottie/loading.json";

type LoadingVariant = "inline" | "fullscreen";
type LoadingSize = "sm" | "md" | "lg";

const props = withDefaults(
  defineProps<{
    active: boolean;
    variant?: LoadingVariant;
    label?: string;
    size?: LoadingSize;
    minHeight?: string;
    /** If true, blocks pointer events for inline variant too. */
    block?: boolean;
  }>(),
  {
    variant: "inline",
    label: "",
    size: "md",
    minHeight: "96px",
    block: false,
  }
);

const isFullscreen = computed(() => props.variant === "fullscreen");

const inlineWidth = computed(() => {
  if (props.size === "sm") return 88;
  if (props.size === "lg") return 160;
  return 120;
});

const fullscreenWidth = computed(() => 220);
const fullscreenHeight = computed(() => 150);

const wrapperStyle = computed(() => {
  if (isFullscreen.value) return undefined;
  return {
    minHeight: props.minHeight,
  };
});
</script>

<template>
  <div
    v-if="active && isFullscreen"
    class="app-loading app-loading--fullscreen"
    role="status"
    aria-live="polite"
  >
    <div class="app-loading__backdrop" />
    <div class="app-loading__dialog">
      <div class="app-loading__animFrame">
        <LottiePlayer
          :animation-data="loadingFullscreen"
          :width="fullscreenWidth"
          :height="fullscreenHeight"
          preserve-aspect-ratio="xMidYMid slice"
        />
      </div>
      <div
        v-if="label"
        class="app-loading__label"
      >
        {{ label }}
      </div>
    </div>
  </div>

  <div
    v-else-if="active"
    class="app-loading app-loading--inline"
    :class="{ 'app-loading--block': block }"
    :style="wrapperStyle"
    role="status"
    aria-live="polite"
  >
    <div class="app-loading__inlineInner">
      <LottiePlayer
        :animation-data="loadingElement"
        :width="inlineWidth"
      />
      <div
        v-if="label"
        class="app-loading__label app-loading__label--inline"
      >
        {{ label }}
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.app-loading--inline {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ui-text-muted);
}

.app-loading__inlineInner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-8);
}

.app-loading__label {
  font-size: 14px;
  line-height: 1.45;
  text-align: center;
  color: var(--ui-text-muted);
}

.app-loading--fullscreen .app-loading__label {
  margin-top: var(--space-4);
  font-size: 15px;
  line-height: 1.5;
  font-weight: 500;
  color: var(--ui-text);
  width: 100%;
  max-width: 52ch;
  letter-spacing: -0.01em;
}

.app-loading__label--inline {
  max-width: 42ch;
}

.app-loading--block {
  pointer-events: none;
}

.app-loading--fullscreen {
  position: fixed;
  inset: 0;
  z-index: 10050;
  display: grid;
  place-items: center;
}

.app-loading__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(17, 24, 39, 0.35);
}

.app-loading__dialog {
  position: relative;
  z-index: 1;
  width: min(380px, calc(100vw - 32px));
  padding: var(--space-16) var(--space-16);
  border-radius: var(--ui-radius-modal);
  background: var(--ui-bg-surface);
  border: 1px solid var(--ui-divider);
  box-shadow: var(--ui-shadow-modal);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-8);
}

.app-loading__animFrame {
  width: 100%;
  display: grid;
  place-items: center;
  overflow: hidden;
}
</style>
