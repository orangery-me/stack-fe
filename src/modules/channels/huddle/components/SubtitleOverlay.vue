<template>
  <Transition name="subtitle-fade">
    <div
      v-if="enabled && segments.length"
      class="subtitle-overlay"
      aria-live="polite"
    >
      <div
        v-for="segment in visibleSegments"
        :key="segment.segment_id"
        class="subtitle-line"
        :class="{ 'subtitle-line--partial': !segment.is_final }"
      >
        <span class="subtitle-content">
          <span class="subtitle-speaker">{{ segment.speaker_name }}:</span>
          <span class="subtitle-text">{{ segment.displayText }}</span>
        </span>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { SubtitleSegment } from '../types/subtitle.types';

const MAX_SUBTITLE_TEXT_LENGTH = 220;

const props = defineProps<{
  enabled: boolean;
  segments: SubtitleSegment[];
}>();

const visibleSegments = computed(() =>
  props.segments.map((segment) => ({
    ...segment,
    displayText: compactSubtitleText(segment.text),
  })),
);

function compactSubtitleText(text: string) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= MAX_SUBTITLE_TEXT_LENGTH) {
    return normalized;
  }

  const tail = normalized.slice(-MAX_SUBTITLE_TEXT_LENGTH);
  const firstSpaceIndex = tail.search(/\s/);
  const trimmedTail = firstSpaceIndex > 0 ? tail.slice(firstSpaceIndex + 1) : tail;
  return `... ${trimmedTail}`;
}
</script>

<style scoped>
.subtitle-overlay {
  position: absolute;
  left: 50%;
  bottom: 18px;
  z-index: 8;
  width: min(760px, calc(100% - 32px));
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  max-height: 126px;
  overflow: hidden;
  pointer-events: none;
}

.subtitle-line {
  max-width: 100%;
  box-sizing: border-box;
  padding: 7px 12px;
  border-radius: 8px;
  background: rgba(17, 24, 39, 0.86);
  color: #ffffff;
  font-size: 14px;
  line-height: 1.45;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.24);
}

.subtitle-content {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  max-width: 100%;
  overflow: hidden;
  overflow-wrap: anywhere;
  max-height: calc(1.45em * 2);
}

.subtitle-speaker {
  font-weight: 700;
  margin-right: 5px;
}

@media (max-width: 640px) {
  .subtitle-overlay {
    bottom: 12px;
    width: calc(100% - 20px);
    max-height: 116px;
  }

  .subtitle-line {
    font-size: 13px;
    padding: 6px 10px;
  }
}

.subtitle-line--partial {
  color: rgba(255, 255, 255, 0.88);
}

.subtitle-fade-enter-active,
.subtitle-fade-leave-active {
  transition: opacity 160ms ease-out, transform 160ms ease-out;
}

.subtitle-fade-enter-from,
.subtitle-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
</style>
