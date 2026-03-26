<script setup>
import { ref, watch, nextTick, onBeforeUnmount } from 'vue';
import { Sparkles, X, Send, Bot } from 'lucide-vue-next';
import { askAgentStream } from '@/services/agent.service.js';

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:open']);

// ======== State ========

const DEFAULT_WIDTH = 380;
const MIN_WIDTH = 260;
const MAX_WIDTH = 700;

const sidebarWidth = ref(DEFAULT_WIDTH);
const inputValue = ref('');
const isStreaming = ref(false);
const messages = ref([]);
const messagesEl = ref(null);
const textareaEl = ref(null);

let abortController = null;
let msgIdCounter = 0;

const DEFAULT_PROVIDER = 'openai';
const DEFAULT_MODEL = 'gpt-5.3-codex';

// ======== Close ========

function close() {
  abortStream();
  emit('update:open', false);
}

// ======== Abort streaming ========

function abortStream() {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  isStreaming.value = false;
}

// ======== Send message ========

async function sendMessage() {
  const text = inputValue.value.trim();
  if (!text || isStreaming.value) return;

  abortStream();

  messages.value.push({
    id: ++msgIdCounter,
    role: 'user',
    content: text,
  });

  const assistantId = ++msgIdCounter;
  messages.value.push({
    id: assistantId,
    role: 'assistant',
    content: '',
    streaming: true,
  });

  inputValue.value = '';
  isStreaming.value = true;
  scrollToBottom();

  abortController = new AbortController();

  await askAgentStream({
    message: text,
    provider: DEFAULT_PROVIDER,
    model: DEFAULT_MODEL,
    signal: abortController.signal,
    onChunk: (chunk) => {
      const msg = messages.value.find((m) => m.id === assistantId);
      if (msg) {
        msg.content += chunk;
        scrollToBottom();
      }
    },
    onDone: () => {
      const msg = messages.value.find((m) => m.id === assistantId);
      if (msg) msg.streaming = false;
      isStreaming.value = false;
      abortController = null;
    },
    onError: (err) => {
      const msg = messages.value.find((m) => m.id === assistantId);
      if (msg) {
        msg.content = msg.content || `(Lỗi: ${err?.message ?? 'Không rõ'})`;
        msg.streaming = false;
        msg.error = true;
      }
      isStreaming.value = false;
      abortController = null;
    },
  });
}

function handleKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

// ======== Auto-scroll ========

async function scrollToBottom() {
  await nextTick();
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
  }
}

watch(() => props.open, (opened) => {
  if (opened) {
    nextTick(() => textareaEl.value?.focus());
  } else {
    abortStream();
  }
});

// ======== Resize logic ========

let resizing = false;
let startX = 0;
let startWidth = 0;

function startResize(e) {
  resizing = true;
  startX = e.clientX;
  startWidth = sidebarWidth.value;
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', stopResize);
  document.body.style.userSelect = 'none';
  document.body.style.cursor = 'ew-resize';
}

function onMouseMove(e) {
  if (!resizing) return;
  const delta = startX - e.clientX;
  const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta));
  sidebarWidth.value = newWidth;
}

function stopResize() {
  resizing = false;
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', stopResize);
  document.body.style.userSelect = '';
  document.body.style.cursor = '';
}

onBeforeUnmount(() => {
  abortStream();
  stopResize();
});

// ======== Text formatting ========

function formatContent(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}
</script>

<template>
  <Transition name="ai-sidebar-slide">
    <div
      v-if="open"
      class="ai-chat-sidebar"
      :style="{ width: sidebarWidth + 'px' }"
    >
      <!-- Drag resize handle (left edge) -->
      <div
        class="ai-chat-resize-handle"
        title="Kéo để thay đổi kích thước"
        @mousedown.prevent="startResize"
      />

      <!-- Header -->
      <div class="ai-chat-header">
        <div class="ai-chat-header-title">
          <Sparkles :size="16" class="ai-chat-header-icon" />
          <span>AI Assistant</span>
        </div>
        <button
          type="button"
          class="ai-chat-close-btn"
          title="Đóng"
          @click="close"
        >
          <X :size="16" />
        </button>
      </div>

      <!-- Messages list -->
      <div ref="messagesEl" class="ai-chat-messages">
        <div
          v-if="messages.length === 0"
          class="ai-chat-empty"
        >
          <Bot :size="32" class="ai-chat-empty-icon" />
          <p>Chào! Tôi là AI Assistant.<br>Hãy hỏi bất cứ điều gì.</p>
        </div>

        <template v-else>
          <div
            v-for="msg in messages"
            :key="msg.id"
            class="ai-chat-msg"
            :class="{
              'ai-chat-msg--user': msg.role === 'user',
              'ai-chat-msg--assistant': msg.role === 'assistant',
              'ai-chat-msg--error': msg.error,
            }"
          >
            <div class="ai-chat-msg-avatar">
              <Bot v-if="msg.role === 'assistant'" :size="14" />
              <span v-else>U</span>
            </div>
            <div class="ai-chat-msg-bubble">
              <span
                class="ai-chat-msg-text"
                v-html="formatContent(msg.content)"
              />
              <span
                v-if="msg.streaming"
                class="ai-chat-cursor"
              >▌</span>
            </div>
          </div>
        </template>
      </div>

      <!-- Input area -->
      <div class="ai-chat-input-area">
        <textarea
          ref="textareaEl"
          v-model="inputValue"
          class="ai-chat-textarea"
          placeholder="Nhập câu hỏi... (Enter để gửi)"
          rows="3"
          :disabled="isStreaming"
          @keydown="handleKeydown"
        />
        <button
          type="button"
          class="ai-chat-send-btn"
          :disabled="isStreaming || !inputValue.trim()"
          title="Gửi (Enter)"
          @click="sendMessage"
        >
          <Send :size="16" />
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped lang="scss">
.ai-chat-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 300;
  background: #ffffff;
  border-left: 1px solid var(--ui-divider, #e5e7eb);
  box-shadow: -4px 0 24px rgba(15, 23, 42, 0.12);
  display: flex;
  flex-direction: column;
  min-width: 260px;
  max-width: 700px;
  overflow: hidden;
}

// Slide animation
.ai-sidebar-slide-enter-active,
.ai-sidebar-slide-leave-active {
  transition: transform 0.22s ease, opacity 0.22s ease;
}

.ai-sidebar-slide-enter-from,
.ai-sidebar-slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

// Resize handle
.ai-chat-resize-handle {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 5px;
  cursor: ew-resize;
  z-index: 10;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(37, 99, 235, 0.2);
  }

  &:active {
    background: rgba(37, 99, 235, 0.35);
  }
}

// Header
.ai-chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px 12px 18px;
  border-bottom: 1px solid var(--ui-divider, #e5e7eb);
  background: rgba(37, 99, 235, 0.04);
  flex-shrink: 0;
}

.ai-chat-header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
  color: var(--ui-text, #0f172a);
}

.ai-chat-header-icon {
  color: var(--primary-600, #2563eb);
}

.ai-chat-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 6px;
  color: var(--ui-text-muted, #64748b);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;

  &:hover {
    background: rgba(15, 23, 42, 0.06);
    color: var(--ui-text, #0f172a);
  }
}

// Messages
.ai-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  scroll-behavior: smooth;
}

.ai-chat-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--ui-text-muted, #64748b);
  font-size: 13px;
  text-align: center;
  padding: 32px 16px;
}

.ai-chat-empty-icon {
  color: var(--primary-400, #60a5fa);
  opacity: 0.7;
}

// Message bubble
.ai-chat-msg {
  display: flex;
  gap: 8px;
  align-items: flex-start;

  &--user {
    flex-direction: row-reverse;

    .ai-chat-msg-bubble {
      background: var(--primary-600, #2563eb);
      color: #ffffff;
      border-radius: 14px 14px 4px 14px;
    }

    .ai-chat-msg-avatar {
      background: var(--primary-100, #dbeafe);
      color: var(--primary-700, #1d4ed8);
    }
  }

  &--assistant {
    .ai-chat-msg-bubble {
      background: var(--gray-50, #f8fafc);
      border: 1px solid var(--ui-divider, #e5e7eb);
      border-radius: 14px 14px 14px 4px;
    }
  }

  &--error {
    .ai-chat-msg-bubble {
      background: #fef2f2;
      border-color: #fecaca;
      color: #b91c1c;
    }
  }
}

.ai-chat-msg-avatar {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--gray-100, #f1f5f9);
  color: var(--ui-text-muted, #64748b);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  margin-top: 2px;
}

.ai-chat-msg-bubble {
  max-width: calc(100% - 40px);
  padding: 9px 12px;
  font-size: 13.5px;
  line-height: 1.6;
  word-break: break-word;
  color: var(--ui-text, #0f172a);
}

.ai-chat-msg-text {
  display: inline;
}

.ai-chat-cursor {
  display: inline-block;
  animation: blink 1s step-end infinite;
  color: var(--primary-600, #2563eb);
  margin-left: 1px;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

// Input area
.ai-chat-input-area {
  flex-shrink: 0;
  display: flex;
  gap: 8px;
  padding: 12px 12px 14px;
  border-top: 1px solid var(--ui-divider, #e5e7eb);
  background: #ffffff;
  align-items: flex-end;
}

.ai-chat-textarea {
  flex: 1;
  resize: none;
  border: 1px solid var(--ui-divider, #e5e7eb);
  border-radius: 10px;
  padding: 9px 12px;
  font-size: 13.5px;
  font-family: inherit;
  line-height: 1.5;
  color: var(--ui-text, #0f172a);
  background: var(--gray-50, #f8fafc);
  outline: none;
  transition: border-color 0.15s ease, background 0.15s ease;

  &:focus {
    border-color: var(--primary-400, #60a5fa);
    background: #ffffff;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &::placeholder {
    color: var(--ui-text-hint, #94a3b8);
    font-size: 13px;
  }
}

.ai-chat-send-btn {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: none;
  background: var(--primary-600, #2563eb);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s ease, opacity 0.15s ease;

  &:hover:not(:disabled) {
    background: var(--primary-700, #1d4ed8);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}
</style>
