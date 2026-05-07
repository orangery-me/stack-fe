<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { sendCanvasAiWriteStream } from "@/services/agent.service.js";

type Phase = "idle" | "streaming" | "preview";

const props = defineProps<{
  anchorRect: DOMRect | null;
  canvasContent: string;
}>();

const emit = defineEmits<{
  previewStart: [];
  previewChunk: [chunk: string];
  previewDone: [];
  accept: [];
  reject: [];
  close: [];
}>();

const inputRef = ref<HTMLTextAreaElement | null>(null);
const userRequest = ref("");
const phase = ref<Phase>("idle");
let abortController: AbortController | null = null;

const barStyle = computed(() => {
  const rect = props.anchorRect;
  if (!rect) return { display: "none" };

  const BAR_HEIGHT = 56;
  // Use viewport coordinates directly (position: fixed, not absolute)
  const top = rect.top - BAR_HEIGHT - 8;
  const left = rect.left;
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
    if (rect) nextTick(() => inputRef.value?.focus());
  },
  { immediate: true }
);

// ======== Streaming core =========

async function startStream() {
  phase.value = "streaming";
  abortController = new AbortController();
  emit("previewStart");

  await sendCanvasAiWriteStream({
    canvasContent: props.canvasContent,
    userRequest: userRequest.value,
    signal: abortController.signal,
    onChunk: (chunk: string) => {
      emit("previewChunk", chunk);
    },
    onDone: () => {
      phase.value = "preview";
      emit("previewDone");
    },
    onError: (err: Error) => {
      if (err?.name === "AbortError") return;
      console.error("[AiWriterBar] stream error:", err);
      emit("reject");
      phase.value = "idle";
    },
  });
}

// ======== User actions =========

function handleSubmit() {
  if (!userRequest.value.trim() || phase.value !== "idle") return;
  startStream();
}

function handleStop() {
  abortController?.abort();
  abortController = null;
  emit("reject");
  phase.value = "idle";
}

function handleAccept() {
  abortController = null;
  emit("accept");
  // Close after accept without emitting reject
  phase.value = "idle";
  userRequest.value = "";
  emit("close");
}

function handleReject() {
  abortController = null;
  emit("reject");
  // Return to idle so user can try a different request
  phase.value = "idle";
  userRequest.value = "";
  nextTick(() => inputRef.value?.focus());
}

function handleRegenerate() {
  emit("reject"); // clear current preview decoration
  startStream(); // re-stream with same request
}

function handleClose() {
  abortController?.abort();
  abortController = null;
  if (phase.value !== "idle") emit("reject");
  phase.value = "idle";
  userRequest.value = "";
  emit("close");
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSubmit();
  }
  if (e.key === "Escape") handleClose();
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="anchorRect"
      class="ai-bar"
      :style="barStyle"
    >
      <!-- Idle: input + send/close -->
      <template v-if="phase === 'idle'">
        <span class="ai-bar__icon">✦</span>
        <textarea
          ref="inputRef"
          v-model="userRequest"
          class="ai-bar__input"
          placeholder="Yêu cầu AI viết gì? (Enter để gửi)"
          rows="1"
          @keydown="handleKeydown"
        />
        <div class="ai-bar__actions">
          <button
            class="ai-bar__btn ai-bar__btn--send"
            :disabled="!userRequest.trim()"
            title="Gửi (Enter)"
            @click="handleSubmit"
          >
            ↑
          </button>
          <button
            class="ai-bar__btn ai-bar__btn--cancel"
            title="Đóng (Esc)"
            @click="handleClose"
          >
            ✕
          </button>
        </div>
      </template>

      <!-- Streaming: disabled input + stop button -->
      <template v-else-if="phase === 'streaming'">
        <span class="ai-bar__icon">✦</span>
        <span class="ai-bar__status-text">Đang tạo nội dung…</span>
        <div class="ai-bar__actions">
          <button
            class="ai-bar__btn ai-bar__btn--stop"
            title="Dừng"
            @click="handleStop"
          >
            <span class="ai-bar__spinner" />
          </button>
        </div>
      </template>

      <!-- Preview: accept / regenerate / reject -->
      <template v-else>
        <span class="ai-bar__icon ai-bar__icon--ready">✦</span>
        <span class="ai-bar__status-text ai-bar__status-text--ready">
          Preview sẵn sàng
        </span>
        <div class="ai-bar__actions">
          <button
            class="ai-bar__btn ai-bar__btn--accept"
            title="Chấp nhận (nhập vào canvas)"
            @click="handleAccept"
          >
            ✓ Accept
          </button>
          <button
            class="ai-bar__btn ai-bar__btn--regen"
            title="Tạo lại"
            @click="handleRegenerate"
          >
            ↺
          </button>
          <button
            class="ai-bar__btn ai-bar__btn--cancel"
            title="Bỏ qua"
            @click="handleReject"
          >
            ✕
          </button>
        </div>
      </template>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.ai-bar {
  position: fixed;
  z-index: 1001;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border: 1.5px solid #6366f1;
  border-radius: 8px;
  padding: 6px 10px;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.15);
  min-height: 44px;

  &__icon {
    font-size: 14px;
    color: #6366f1;
    flex-shrink: 0;
    user-select: none;

    &--ready {
      color: #22c55e;
    }
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
  }

  &__status-text {
    flex: 1;
    font-size: 13px;
    color: #6b7280;
    font-style: italic;

    &--ready {
      color: #16a34a;
      font-style: normal;
      font-weight: 500;
    }
  }

  &__actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }

  &__btn {
    height: 28px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 600;
    padding: 0 8px;
    transition: background 0.15s, opacity 0.15s;

    &--send {
      background: #6366f1;
      color: #fff;
      width: 28px;
      padding: 0;

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
      width: 28px;
      padding: 0;

      &:hover {
        background: #e5e7eb;
      }
    }

    &--stop {
      background: #fef2f2;
      color: #ef4444;
      width: 28px;
      padding: 0;

      &:hover {
        background: #fee2e2;
      }
    }

    &--accept {
      background: #dcfce7;
      color: #15803d;
      gap: 4px;

      &:hover {
        background: #bbf7d0;
      }
    }

    &--regen {
      background: #f3f4f6;
      color: #374151;
      width: 28px;
      padding: 0;
      font-size: 15px;

      &:hover {
        background: #e5e7eb;
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
    animation: ai-spin 0.7s linear infinite;
  }
}

@keyframes ai-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
