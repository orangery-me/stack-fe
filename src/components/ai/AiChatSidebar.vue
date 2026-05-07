<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from "vue";
import { useQueryClient } from "@tanstack/vue-query";
import {
  Sparkles,
  X,
  Send,
  Bot,
  Plus,
  ChevronDown,
  History,
} from "lucide-vue-next";
import { useUiStore } from "@/stores/ui.store.js";
import AiChatHistoryModal from "./AiChatHistoryModal.vue";
import {
  getActiveSession,
  listSessions,
  createSession,
  getSessionMessages,
  sendMessageStream,
  sendCanvasSessionMessageStream,
  sendTaskSessionMessageStream,
  updateSession,
  applyCanvasAction,
  applyTaskAction,
} from "@/services/agent.service.js";

const uiStore = useUiStore();
const queryClient = useQueryClient();

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  context: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(["update:open"]);

// ======== State ========

const MIN_WIDTH = 260;
const MAX_WIDTH = 700;
const inputValue = ref("");
const isStreaming = ref(false);
const isLoadingSession = ref(false);
const messages = ref([]);
const messagesEl = ref(null);
const textareaEl = ref(null);

// Session state
const activeSession = ref(null);
const sessions = ref([]);
const showSessionDropdown = ref(false);
const showHistoryModal = ref(false);

let abortController = null;
let msgIdCounter = 0;

const DEFAULT_PROVIDER = "openai";
const DEFAULT_MODEL = "gpt-5.3-codex";
const isCanvasMode = computed(() => props.context?.kind === "canvas");
const hasTaskContext = computed(() => Boolean(props.context?.workspaceId));

// ======== Session loading ========

async function loadActiveSession() {
  if (isLoadingSession.value) return;
  isLoadingSession.value = true;
  try {
    const session = await getActiveSession();
    activeSession.value = session;

    const result = await getSessionMessages(session.id);
    const rawMessages = Array.isArray(result)
      ? result
      : (result?.messages ?? []);
    messages.value = rawMessages.map((m) => {
      const parsed =
        m.role === "assistant"
          ? parseStoredAssistantMessage(m.content)
          : { content: m.content, actions: [] };
      return {
        id: m.id,
        role: m.role,
        content: parsed.content,
        actions: parsed.actions,
        streaming: false,
      };
    });
    await scrollToBottom();
  } catch {
    // Toast shown by global interceptor
  } finally {
    isLoadingSession.value = false;
  }
}

async function loadSessionList() {
  try {
    const data = await listSessions();
    sessions.value = Array.isArray(data) ? data : (data?.sessions ?? []);
  } catch {
    // ignore
  }
}

async function switchSession(session) {
  if (session.id === activeSession.value?.id) {
    showSessionDropdown.value = false;
    return;
  }
  abortStream();
  activeSession.value = session;
  showSessionDropdown.value = false;
  try {
    const result = await getSessionMessages(session.id);
    const rawMessages = Array.isArray(result)
      ? result
      : (result?.messages ?? []);
    messages.value = rawMessages.map((m) => {
      const parsed =
        m.role === "assistant"
          ? parseStoredAssistantMessage(m.content)
          : { content: m.content, actions: [] };
      return {
        id: m.id,
        role: m.role,
        content: parsed.content,
        actions: parsed.actions,
        streaming: false,
      };
    });
    await scrollToBottom();
  } catch {
    // ignore
  }
}

async function handleNewChat() {
  abortStream();
  showSessionDropdown.value = false;
  try {
    const session = await createSession();
    activeSession.value = session;
    messages.value = [];
    await loadSessionList();
  } catch {
    // Toast shown by global interceptor
  }
}

// ======== Close ========

function close() {
  abortStream();
  showSessionDropdown.value = false;
  emit("update:open", false);
}

// ======== Abort streaming ========

function abortStream() {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  isStreaming.value = false;
}

function focusTextareaToEnd() {
  nextTick(() => {
    if (!textareaEl.value) return;
    textareaEl.value.focus();
    const cursorPosition = textareaEl.value.value.length;
    textareaEl.value.setSelectionRange(cursorPosition, cursorPosition);
  });
}

function applyPendingDraft() {
  if (!uiStore.aiDraft) return;
  inputValue.value = uiStore.aiDraft;
  uiStore.clearAiDraft();
  focusTextareaToEnd();
}

// ======== Send message ========

async function sendMessage() {
  const text = inputValue.value.trim();
  if (!text || isStreaming.value || !activeSession.value) return;

  abortStream();

  const userMsgId = ++msgIdCounter;
  messages.value.push({ id: userMsgId, role: "user", content: text });

  const assistantId = ++msgIdCounter;
  messages.value.push({
    id: assistantId,
    role: "assistant",
    content: "",
    streaming: true,
  });

  inputValue.value = "";
  isStreaming.value = true;
  scrollToBottom();

  abortController = new AbortController();
  const onDoneCommon = async () => {
    const msg = messages.value.find((m) => m.id === assistantId);
    if (msg) msg.streaming = false;
    isStreaming.value = false;
    abortController = null;

    if (activeSession.value?.title === "New chat") {
      const newTitle = text.slice(0, 50);
      try {
        await updateSession(activeSession.value.id, newTitle);
        activeSession.value.title = newTitle;
        const s = sessions.value.find((x) => x.id === activeSession.value.id);
        if (s) s.title = newTitle;
      } catch {
        // Non-critical
      }
    }
  };

  const onErrorCommon = (err) => {
    const msg = messages.value.find((m) => m.id === assistantId);
    if (msg) {
      msg.content = msg.content || `(Lỗi: ${err?.message ?? "Không rõ"})`;
      msg.streaming = false;
      msg.error = true;
    }
    isStreaming.value = false;
    abortController = null;
  };

  const useTaskFlow = shouldUseTaskFlow(text);
  if (useTaskFlow) {
    const ctx = props.context || {};
    await sendTaskSessionMessageStream(activeSession.value.id, {
      workspaceId: ctx.workspaceId,
      channelId: ctx.channelId,
      taskListId: ctx.taskListId,
      canvasId: ctx.canvasId,
      canvasContent: ctx.canvasPlainText ?? "",
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
      onEvent: (event) => {
        const msg = messages.value.find((m) => m.id === assistantId);
        if (!msg || !event?.type) return;
        if (event.type === "status" && event.message) {
          msg.content += `${msg.content ? "\n" : ""}[${event.message}]`;
        }
        if (event.type === "assistant" && event.content) {
          msg.content += `${msg.content ? "\n" : ""}${event.content}`;
        }
        if (event.type === "actions" && Array.isArray(event.actions)) {
          msg.actions = event.actions.map((a) => ({
            ...a,
            status: a.status || "pending",
          }));
        }
        scrollToBottom();
      },
      onDone: onDoneCommon,
      onError: onErrorCommon,
    });
  } else if (isCanvasMode.value) {
    const ctx = props.context || {};
    await sendCanvasSessionMessageStream(activeSession.value.id, {
      canvasId: ctx.canvasId,
      canvasContent: ctx.canvasPlainText ?? "",
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
      onEvent: (event) => {
        const msg = messages.value.find((m) => m.id === assistantId);
        if (!msg || !event?.type) return;
        if (event.type === "status" && event.message) {
          msg.content += `${msg.content ? "\n" : ""}[${event.message}]`;
        }
        if (event.type === "assistant" && event.content) {
          msg.content += `${msg.content ? "\n" : ""}${event.content}`;
        }
        if (event.type === "actions" && Array.isArray(event.actions)) {
          msg.actions = event.actions.map((a) => ({
            ...a,
            status: a.status || "pending",
          }));
        }
        scrollToBottom();
      },
      onDone: onDoneCommon,
      onError: onErrorCommon,
    });
  } else {
    await sendMessageStream(activeSession.value.id, {
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
      onDone: onDoneCommon,
      onError: onErrorCommon,
    });
  }
}

async function handleAcceptAction(messageId, action) {
  if (!action?.name) return;
  const msg = messages.value.find((m) => m.id === messageId);
  if (!msg?.actions) return;
  action.status = "applying";
  try {
    const isTaskAction =
      action.name === "create_task" ||
      action.name === "create_tasks_batch" ||
      action.name === "list_task_lists" ||
      action.name === "search_workspace_members";
    const result = isTaskAction
      ? await applyTaskAction({
          workspaceId: props.context?.workspaceId,
          channelId: props.context?.channelId,
          taskListId: props.context?.taskListId,
          actionName: action.name,
          actionArgs: action.arguments || {},
        })
      : await applyCanvasAction({
          canvasId: props.context?.canvasId,
          actionName: action.name,
          actionArgs: action.arguments || {},
        });
    action.status = result?.ok ? "accepted" : "failed";
    if (!result?.ok) {
      action.error = result?.error || "Apply thất bại";
    }
    if (result?.ok && isTaskAction && props.context?.workspaceId) {
      const workspaceId = props.context.workspaceId;
      queryClient.invalidateQueries({ queryKey: ["my-tasks", workspaceId] });
      if (props.context?.taskListId) {
        queryClient.invalidateQueries({
          queryKey: ["tasks", workspaceId, props.context.taskListId],
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
      }
    }
  } catch (err) {
    action.status = "failed";
    action.error = err?.message || "Apply thất bại";
  }
}

async function handleAcceptAllActions(messageId) {
  const msg = messages.value.find((m) => m.id === messageId);
  if (!msg?.actions?.length) return;
  for (const action of msg.actions) {
    if (action.status === "pending") {
      // Keep sequential apply to avoid race conditions in server-side ordering.
       
      await handleAcceptAction(messageId, action);
    }
  }
}

function handleRejectAction(messageId, action) {
  const msg = messages.value.find((m) => m.id === messageId);
  if (!msg?.actions) return;
  action.status = "rejected";
}

function handleKeydown(e) {
  if (e.key === "Enter" && !e.shiftKey) {
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

watch(
  () => props.open,
  async (opened) => {
    if (opened) {
      await loadActiveSession();
      await loadSessionList();
      applyPendingDraft();
      if (!inputValue.value) {
        focusTextareaToEnd();
      }
    } else {
      abortStream();
      showSessionDropdown.value = false;
    }
  },
);

watch(
  () => uiStore.aiDraft,
  () => {
    if (!props.open) return;
    applyPendingDraft();
  },
);

// ======== Resize logic ========

let resizing = false;
let startX = 0;
let startWidth = 0;

function startResize(e) {
  resizing = true;
  startX = e.clientX;
  startWidth = uiStore.aiSidebarWidth;
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", stopResize);
  document.body.style.userSelect = "none";
  document.body.style.cursor = "ew-resize";
}

function onMouseMove(e) {
  if (!resizing) return;
  const delta = startX - e.clientX;
  const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta));
  uiStore.setAiSidebarWidth(newWidth);
}

function stopResize() {
  resizing = false;
  document.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("mouseup", stopResize);
  document.body.style.userSelect = "";
  document.body.style.cursor = "";
}

onBeforeUnmount(() => {
  abortStream();
  stopResize();
});

// ======== Text formatting ========

function formatContent(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

function sessionLabel(session) {
  return session?.title || "New chat";
}

const recentSessions = computed(() => sessions.value.slice(0, 5));

function shouldUseTaskFlow(text) {
  if (!hasTaskContext.value) return false;
  if (isCanvasMode.value && !hasTaskKeywords(text)) return false;
  return hasTaskKeywords(text) || props.context?.kind === "task-list";
}

function hasTaskKeywords(text) {
  const normalized = String(text || "").toLowerCase();
  return (
    normalized.includes("task") ||
    normalized.includes("todo") ||
    normalized.includes("to-do") ||
    normalized.includes("action item") ||
    normalized.includes("việc cần làm")
  );
}

function parseStoredAssistantMessage(content) {
  if (typeof content !== "string") return { content: "", actions: [] };
  const marker = "\n\n[ACTIONS]\n";
  const idx = content.indexOf(marker);
  if (idx < 0) return { content, actions: [] };
  const text = content.slice(0, idx);
  const jsonPart = content.slice(idx + marker.length);
  try {
    const parsed = JSON.parse(jsonPart);
    return { content: text, actions: Array.isArray(parsed) ? parsed : [] };
  } catch {
    return { content, actions: [] };
  }
}

function openHistory() {
  showSessionDropdown.value = false;
  showHistoryModal.value = true;
}

function handleHistorySelect(session) {
  switchSession(session);
}
</script>

<template>
  <Transition name="ai-sidebar-slide">
    <div
      v-if="open"
      class="ai-chat-sidebar"
      :style="{ width: uiStore.aiSidebarWidth + 'px' }"
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
          <Sparkles
            :size="16"
            class="ai-chat-header-icon"
          />
          <span>AI Assistant</span>
          <span
            v-if="isCanvasMode"
            class="ai-mode-chip"
          >Canvas mode</span>
        </div>
        <div class="ai-chat-header-actions">
          <!-- Session switcher -->
          <div class="ai-session-switcher">
            <button
              type="button"
              class="ai-session-btn"
              :title="
                activeSession ? sessionLabel(activeSession) : 'Chọn session'
              "
              @click="showSessionDropdown = !showSessionDropdown"
            >
              <span class="ai-session-label">{{
                activeSession ? sessionLabel(activeSession) : "..."
              }}</span>
              <ChevronDown :size="12" />
            </button>
            <div
              v-if="showSessionDropdown"
              class="ai-session-dropdown"
            >
              <button
                type="button"
                class="ai-session-dropdown-item ai-session-dropdown-item--new"
                @click="handleNewChat"
              >
                <Plus :size="13" />
                <span>New chat</span>
              </button>
              <div
                v-if="recentSessions.length > 0"
                class="ai-session-dropdown-divider"
              />
              <button
                v-for="s in recentSessions"
                :key="s.id"
                type="button"
                class="ai-session-dropdown-item"
                :class="{
                  'ai-session-dropdown-item--active':
                    s.id === activeSession?.id,
                }"
                @click="switchSession(s)"
              >
                <span class="ai-session-dropdown-label">{{
                  sessionLabel(s)
                }}</span>
              </button>
              <div class="ai-session-dropdown-divider" />
              <button
                type="button"
                class="ai-session-dropdown-item ai-session-dropdown-item--history"
                @click="openHistory"
              >
                <History :size="13" />
                <span>See all chat history</span>
              </button>
            </div>
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
      </div>

      <!-- Loading state -->
      <div
        v-if="isLoadingSession"
        class="ai-chat-loading"
      >
        <span class="ai-chat-loading-dot" />
        <span class="ai-chat-loading-dot" />
        <span class="ai-chat-loading-dot" />
      </div>

      <!-- Messages list -->
      <div
        v-else
        ref="messagesEl"
        class="ai-chat-messages"
      >
        <div
          v-if="messages.length === 0"
          class="ai-chat-empty"
        >
          <Bot
            :size="32"
            class="ai-chat-empty-icon"
          />
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
              <Bot
                v-if="msg.role === 'assistant'"
                :size="14"
              />
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
              <div
                v-if="
                  msg.role === 'assistant' &&
                    Array.isArray(msg.actions) &&
                    msg.actions.length > 0
                "
                class="ai-action-list"
              >
                <div class="ai-action-batch-controls">
                  <button
                    type="button"
                    class="ai-action-btn ai-action-btn--accept"
                    @click="handleAcceptAllActions(msg.id)"
                  >
                    Accept all
                  </button>
                </div>
                <div
                  v-for="action in msg.actions"
                  :key="action.id"
                  class="ai-action-item"
                >
                  <div class="ai-action-main">
                    <span class="ai-action-name">{{ action.name }}</span>
                    <span
                      class="ai-action-status"
                      :class="`is-${action.status}`"
                    >{{ action.status }}</span>
                  </div>
                  <div class="ai-action-args">
                    {{ JSON.stringify(action.arguments || {}) }}
                  </div>
                  <div
                    v-if="action.error"
                    class="ai-action-error"
                  >
                    {{ action.error }}
                  </div>
                  <div
                    v-if="action.status === 'pending'"
                    class="ai-action-buttons"
                  >
                    <button
                      type="button"
                      class="ai-action-btn ai-action-btn--accept"
                      @click="handleAcceptAction(msg.id, action)"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      class="ai-action-btn ai-action-btn--reject"
                      @click="handleRejectAction(msg.id, action)"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
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
          :disabled="isStreaming || isLoadingSession"
          @keydown="handleKeydown"
        />
        <button
          type="button"
          class="ai-chat-send-btn"
          :disabled="isStreaming || isLoadingSession || !inputValue.trim()"
          title="Gửi (Enter)"
          @click="sendMessage"
        >
          <Send :size="16" />
        </button>
      </div>
    </div>
  </Transition>

  <AiChatHistoryModal
    v-model:open="showHistoryModal"
    :sessions="sessions"
    @select="handleHistorySelect"
  />
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
  transition:
    transform 0.22s ease,
    opacity 0.22s ease;
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
  gap: 8px;
}

.ai-chat-header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
  color: var(--ui-text, #0f172a);
  flex-shrink: 0;
}

.ai-chat-header-icon {
  color: var(--primary-600, #2563eb);
}

.ai-mode-chip {
  font-size: 10px;
  font-weight: 600;
  color: #1d4ed8;
  background: #dbeafe;
  border: 1px solid #bfdbfe;
  border-radius: 999px;
  padding: 2px 6px;
}

.ai-chat-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
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
  transition:
    background 0.15s ease,
    color 0.15s ease;
  flex-shrink: 0;

  &:hover {
    background: rgba(15, 23, 42, 0.06);
    color: var(--ui-text, #0f172a);
  }
}

// Session switcher
.ai-session-switcher {
  position: relative;
  min-width: 0;
  flex: 1;
}

.ai-session-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 1px solid var(--ui-divider, #e5e7eb);
  border-radius: 6px;
  background: transparent;
  color: var(--ui-text-muted, #64748b);
  font-size: 12px;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
  max-width: 160px;
  width: 100%;

  &:hover {
    background: rgba(15, 23, 42, 0.04);
    border-color: var(--primary-300, #93c5fd);
  }
}

.ai-session-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
  text-align: left;
}

.ai-session-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 400;
  background: #ffffff;
  border: 1px solid var(--ui-divider, #e5e7eb);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
  min-width: 180px;
  max-width: 240px;
  overflow: hidden;
  padding: 4px;
}

.ai-session-dropdown-divider {
  height: 1px;
  background: var(--ui-divider, #e5e7eb);
  margin: 4px 0;
}

.ai-session-dropdown-item {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 7px 10px;
  border: none;
  background: transparent;
  border-radius: 6px;
  color: var(--ui-text, #0f172a);
  font-size: 13px;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s ease;

  &:hover {
    background: rgba(15, 23, 42, 0.06);
  }

  &--new {
    color: var(--primary-600, #2563eb);
    font-weight: 500;
  }

  &--active {
    background: rgba(37, 99, 235, 0.06);
    color: var(--primary-700, #1d4ed8);
    font-weight: 500;
  }

  &--history {
    color: var(--ui-text-muted, #64748b);
    font-size: 12px;
  }
}

.ai-session-dropdown-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// Loading state
.ai-chat-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.ai-chat-loading-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary-400, #60a5fa);
  animation: loading-bounce 1.2s infinite ease-in-out;

  &:nth-child(2) {
    animation-delay: 0.2s;
  }

  &:nth-child(3) {
    animation-delay: 0.4s;
  }
}

@keyframes loading-bounce {
  0%,
  80%,
  100% {
    transform: scale(0.7);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
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

.ai-action-list {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ai-action-item {
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  padding: 8px;
  background: #fff;
}

.ai-action-main {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.ai-action-name {
  font-weight: 600;
  font-size: 12px;
}

.ai-action-status {
  font-size: 11px;
  text-transform: uppercase;
}

.ai-action-status.is-pending {
  color: #92400e;
}

.ai-action-status.is-applying {
  color: #1d4ed8;
}

.ai-action-status.is-accepted {
  color: #166534;
}

.ai-action-status.is-rejected {
  color: #991b1b;
}

.ai-action-status.is-failed {
  color: #b91c1c;
}

.ai-action-args {
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
    "Courier New", monospace;
  font-size: 11px;
  color: #334155;
  background: #f8fafc;
  border-radius: 6px;
  padding: 6px;
  overflow-x: auto;
}

.ai-action-error {
  font-size: 11px;
  color: #b91c1c;
  margin-top: 4px;
}

.ai-action-buttons {
  margin-top: 6px;
  display: flex;
  gap: 6px;
}

.ai-action-btn {
  border: none;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 11px;
  cursor: pointer;
}

.ai-action-btn--accept {
  background: #dcfce7;
  color: #166534;
}

.ai-action-btn--reject {
  background: #fee2e2;
  color: #991b1b;
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
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
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
  transition:
    border-color 0.15s ease,
    background 0.15s ease;

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
  transition:
    background 0.15s ease,
    opacity 0.15s ease;

  &:hover:not(:disabled) {
    background: var(--primary-700, #1d4ed8);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}
</style>
