<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { sendCanvasAiWriteStream } from "@/services/agent.service.js";

type Phase = "idle" | "streaming" | "preview";
type EditMode = "replace" | "append";

const props = defineProps<{
  anchorRect: DOMRect | null;
  canvasContent: string;
  selectedText: string;
}>();

const emit = defineEmits<{
  previewStart: [];
  previewChunk: [chunk: string];
  previewDone: [];
  accept: [editMode: EditMode];
  reject: [];
  close: [];
}>();

const inputRef = ref<HTMLTextAreaElement | null>(null);
const userRequest = ref("");
const phase = ref<Phase>("idle");
const editMode = ref<EditMode>("replace");
let abortController: AbortController | null = null;

// ======== Position =========

const barStyle = computed(() => {
  const rect = props.anchorRect;
  if (!rect) return { display: "none" };

  const BAR_HEIGHT = 60;
  const top = rect.top - BAR_HEIGHT - 8;
  const left = rect.left;
  const width = Math.min(Math.max(rect.width, 360), 580);

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
    selectedText: props.selectedText,
    editMode: editMode.value,
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
      console.error("[AiSelectionBar] stream error:", err);
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
  emit("accept", editMode.value);
  phase.value = "idle";
  userRequest.value = "";
  emit("close");
}

function handleReject() {
  abortController = null;
  emit("reject");
  phase.value = "idle";
  userRequest.value = "";
  nextTick(() => inputRef.value?.focus());
}

function handleRegenerate() {
  emit("reject");
  startStream();
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
    <div v-if="anchorRect" class="ai-sel-bar" :style="barStyle">
      <!-- Badge: selected text preview -->
      <div class="ai-sel-bar__selected-preview">
        <span class="ai-sel-bar__sel-icon">✦</span>
        <span class="ai-sel-bar__sel-text">{{ selectedText.slice(0, 60) }}{{ selectedText.length > 60 ? "…" : "" }}</span>
      </div>

      <!-- Divider -->
      <div class="ai-sel-bar__divider" />

      <!-- Main row -->
      <div class="ai-sel-bar__main">
        <!-- Idle: input + mode toggle + send/close -->
        <template v-if="phase === 'idle'">
          <textarea
            ref="inputRef"
            v-model="userRequest"
            class="ai-sel-bar__input"
            placeholder="Yêu cầu AI chỉnh sửa… (Enter để gửi)"
            rows="1"
            @keydown="handleKeydown"
          />
          <!-- Mode toggle -->
          <div class="ai-sel-bar__mode">
            <button
              class="ai-sel-bar__mode-btn"
              :class="{ 'ai-sel-bar__mode-btn--active': editMode === 'replace' }"
              title="Thay thế đoạn đã chọn"
              @click="editMode = 'replace'"
            >
              Replace
            </button>
            <button
              class="ai-sel-bar__mode-btn"
              :class="{ 'ai-sel-bar__mode-btn--active': editMode === 'append' }"
              title="Chèn sau đoạn đã chọn"
              @click="editMode = 'append'"
            >
              Append
            </button>
          </div>
          <div class="ai-sel-bar__actions">
            <button
              class="ai-sel-bar__btn ai-sel-bar__btn--send"
              :disabled="!userRequest.trim()"
              title="Gửi (Enter)"
              @click="handleSubmit"
            >
              ↑
            </button>
            <button
              class="ai-sel-bar__btn ai-sel-bar__btn--cancel"
              title="Đóng (Esc)"
              @click="handleClose"
            >
              ✕
            </button>
          </div>
        </template>

        <!-- Streaming -->
        <template v-else-if="phase === 'streaming'">
          <span class="ai-sel-bar__status-text">Đang chỉnh sửa…</span>
          <div class="ai-sel-bar__actions">
            <button
              class="ai-sel-bar__btn ai-sel-bar__btn--stop"
              title="Dừng"
              @click="handleStop"
            >
              <span class="ai-sel-bar__spinner" />
            </button>
          </div>
        </template>

        <!-- Preview: accept / regenerate / reject -->
        <template v-else>
          <span class="ai-sel-bar__status-text ai-sel-bar__status-text--ready">
            Preview sẵn sàng
            <span class="ai-sel-bar__mode-label">({{ editMode === 'replace' ? 'Thay thế' : 'Chèn thêm' }})</span>
          </span>
          <div class="ai-sel-bar__actions">
            <button
              class="ai-sel-bar__btn ai-sel-bar__btn--accept"
              title="Chấp nhận"
              @click="handleAccept"
            >
              ✓ Accept
            </button>
            <button
              class="ai-sel-bar__btn ai-sel-bar__btn--regen"
              title="Tạo lại"
              @click="handleRegenerate"
            >
              ↺
            </button>
            <button
              class="ai-sel-bar__btn ai-sel-bar__btn--cancel"
              title="Bỏ qua"
              @click="handleReject"
            >
              ✕
            </button>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.ai-sel-bar {
  position: fixed;
  z-index: 1002;
  display: flex;
  flex-direction: column;
  gap: 0;
  background: #fff;
  border: 1.5px solid #8b5cf6;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(139, 92, 246, 0.18);
  overflow: hidden;

  &__selected-preview {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    background: #f5f3ff;
  }

  &__sel-icon {
    font-size: 12px;
    color: #8b5cf6;
    flex-shrink: 0;
  }

  &__sel-text {
    font-size: 11px;
    color: #6d28d9;
    font-style: italic;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    min-width: 0;
  }

  &__divider {
    height: 1px;
    background: #ede9fe;
  }

  &__main {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    min-height: 44px;
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
      color: #7c3aed;
      font-style: normal;
      font-weight: 500;
    }
  }

  &__mode-label {
    font-size: 11px;
    font-weight: 400;
    color: #8b5cf6;
    margin-left: 4px;
  }

  &__mode {
    display: flex;
    gap: 2px;
    flex-shrink: 0;
  }

  &__mode-btn {
    height: 24px;
    padding: 0 8px;
    border: 1px solid #ddd6fe;
    border-radius: 4px;
    background: #fff;
    color: #6b7280;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;

    &--active {
      background: #8b5cf6;
      border-color: #8b5cf6;
      color: #fff;
    }

    &:hover:not(&--active) {
      background: #f5f3ff;
      border-color: #a78bfa;
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
      background: #8b5cf6;
      color: #fff;
      width: 28px;
      padding: 0;

      &:hover:not(:disabled) {
        background: #7c3aed;
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
    animation: ai-sel-spin 0.7s linear infinite;
  }
}

@keyframes ai-sel-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
