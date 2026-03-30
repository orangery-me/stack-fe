<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { sendCanvasAiWriteStream } from "@/services/agent.service.js";

const props = defineProps<{
  anchorRect: DOMRect | null;
  canvasContent: string;
}>();

const emit = defineEmits<{
  insert: [content: string];
  close: [];
}>();

const inputRef = ref<HTMLTextAreaElement | null>(null);
const userRequest = ref("");
const isStreaming = ref(false);
const streamedContent = ref("");
let abortController: AbortController | null = null;

const barStyle = computed(() => {
  const rect = props.anchorRect;
  if (!rect) return { display: "none" };

  const BAR_HEIGHT = 56;
  const top = rect.top + window.scrollY - BAR_HEIGHT - 8;
  const left = rect.left + window.scrollX;
  const width = Math.min(Math.max(rect.width, 340), 560);

  return {
    top: `${top}px`,
    left: `${left}px`,
    width: `${width}px`,
  };
});

watch(
  () => props.anchorRect,
  (rect) => {
    if (rect) {
      nextTick(() => inputRef.value?.focus());
    }
  },
  { immediate: true }
);

async function handleSubmit() {
  const request = userRequest.value.trim();
  if (!request || isStreaming.value) return;

  isStreaming.value = true;
  streamedContent.value = "";
  abortController = new AbortController();

  await sendCanvasAiWriteStream({
    canvasContent: props.canvasContent,
    userRequest: request,
    signal: abortController.signal,
    onChunk: (chunk: string) => {
      streamedContent.value += chunk;
    },
    onDone: () => {
      isStreaming.value = false;
      emit("insert", streamedContent.value);
      handleClose();
    },
    onError: (err: Error) => {
      if (err?.name === "AbortError") return;
      console.error("[AiWriterBar] stream error:", err);
      isStreaming.value = false;
      handleClose();
    },
  });
}

function handleClose() {
  abortController?.abort();
  abortController = null;
  isStreaming.value = false;
  userRequest.value = "";
  streamedContent.value = "";
  emit("close");
}


function handleKeydown(e: KeyboardEvent) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSubmit();
  }
  if (e.key === "Escape") {
    handleClose();
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="anchorRect" class="ai-writer-bar" :style="barStyle">
      <span class="ai-writer-bar__icon">✦</span>
      <textarea
        ref="inputRef"
        v-model="userRequest"
        class="ai-writer-bar__input"
        :placeholder="isStreaming ? 'Đang tạo nội dung…' : 'Yêu cầu AI viết gì? (Enter để gửi)'"
        :disabled="isStreaming"
        rows="1"
        @keydown="handleKeydown"
      />
      <div class="ai-writer-bar__actions">
        <button
          v-if="isStreaming"
          class="ai-writer-bar__btn ai-writer-bar__btn--stop"
          title="Dừng"
          @click="handleClose"
        >
          <span class="ai-writer-bar__spinner" />
        </button>
        <template v-else>
          <button
            class="ai-writer-bar__btn ai-writer-bar__btn--send"
            :disabled="!userRequest.trim()"
            title="Gửi (Enter)"
            @click="handleSubmit"
          >
            ↑
          </button>
          <button
            class="ai-writer-bar__btn ai-writer-bar__btn--cancel"
            title="Đóng (Esc)"
            @click="handleClose"
          >
            ✕
          </button>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.ai-writer-bar {
  position: absolute;
  z-index: 1001;
  display: flex;
  align-items: center;
  gap: 6px;
  background: #fff;
  border: 1.5px solid #6366f1;
  border-radius: 8px;
  padding: 6px 8px;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.15);

  &__icon {
    font-size: 14px;
    color: #6366f1;
    flex-shrink: 0;
    user-select: none;
  }

  &__input {
    flex: 1;
    border: none;
    outline: none;
    resize: none;
    font-size: 13px;
    line-height: 1.5;
    color: #111827;
    background: transparent;
    font-family: inherit;
    overflow: hidden;

    &::placeholder {
      color: #9ca3af;
    }

    &:disabled {
      color: #9ca3af;
    }
  }

  &__actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }

  &__btn {
    width: 26px;
    height: 26px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 600;
    transition: background 0.15s, opacity 0.15s;

    &--send {
      background: #6366f1;
      color: #fff;

      &:hover:not(:disabled) {
        background: #4f46e5;
      }

      &:disabled {
        opacity: 0.4;
        cursor: default;
      }
    }

    &--cancel {
      background: #f3f4f6;
      color: #6b7280;

      &:hover {
        background: #e5e7eb;
      }
    }

    &--stop {
      background: #fef2f2;
      color: #ef4444;

      &:hover {
        background: #fee2e2;
      }
    }
  }

  &__spinner {
    width: 12px;
    height: 12px;
    border: 2px solid #ef4444;
    border-top-color: transparent;
    border-radius: 50%;
    display: inline-block;
    animation: spin 0.7s linear infinite;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
