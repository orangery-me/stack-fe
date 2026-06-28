<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from "vue";
import { useQueryClient } from "@tanstack/vue-query";
import DOMPurify from "dompurify";
import { marked } from "marked";
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
  updateMessageActionStatus,
  applyCanvasAction,
  applyTaskActionStream,
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

const emit = defineEmits(["update:open", "canvas-suggestions-updated"]);

// ======== State ========

const MIN_WIDTH = 260;
const MAX_WIDTH = 700;
const inputValue = ref("");
const isStreaming = ref(false);
const isLoadingSession = ref(false);
const messages = ref([]);
const messagesEl = ref(null);
const textareaEl = ref(null);
const taskSetup = ref(null);
const processingPendingCommandId = ref(null);

// Session state
const activeSession = ref(null);
const sessions = ref([]);
const showSessionDropdown = ref(false);
const showHistoryModal = ref(false);

let abortController = null;
let msgIdCounter = 0;
let sessionLoadSeq = 0;

const DEFAULT_PROVIDER = "deepseek";
const DEFAULT_MODEL = "deepseek-v4-pro";
marked.setOptions({
  breaks: true,
  gfm: true,
});
const isCanvasMode = computed(() => props.context?.kind === "canvas");
const sessionScope = computed(() =>
  isCanvasMode.value && props.context?.canvasId
    ? { scopeType: "canvas", scopeId: props.context.canvasId }
    : { scopeType: "general" },
);
const sessionScopeKey = computed(
  () => `${sessionScope.value.scopeType}:${sessionScope.value.scopeId || ""}`,
);
const selectedContext = computed(() => uiStore.aiSelectedContext);
const hasTaskContext = computed(() => Boolean(props.context?.workspaceId));
const CANVAS_ACTION_NAMES = new Set(["edit_canvas_blocks"]);
const visibleMessages = computed(() =>
  messages.value.filter((message) => !message.isHidden),
);

function isCanvasAction(action) {
  return CANVAS_ACTION_NAMES.has(action?.name);
}

function isActionVisibleInSidebar(action) {
  return !(isCanvasMode.value && isCanvasAction(action));
}

function canvasActionAnchorKey(action) {
  const args = action?.arguments || {};
  if (action?.name === "edit_canvas_blocks") {
    const mutations = Array.isArray(args.mutations) ? args.mutations : [];
    const ids = mutations
      .map((mutation) => {
        if (!mutation || typeof mutation !== "object") return null;
        return mutation.block_id || mutation.target_block_id || null;
      })
      .filter(Boolean);
    return ids.length ? ids.join("|") : "canvas";
  }
  return null;
}

function dedupeCanvasActionsByAnchor(actions) {
  if (!isCanvasMode.value || !Array.isArray(actions)) return actions;

  const seen = new Set();
  const deduped = [];
  for (let index = actions.length - 1; index >= 0; index--) {
    const action = actions[index];
    const anchorKey = isCanvasAction(action) ? canvasActionAnchorKey(action) : null;
    if (anchorKey && seen.has(anchorKey)) continue;
    if (anchorKey) seen.add(anchorKey);
    deduped.unshift(action);
  }
  return deduped;
}

function supersedeOlderCanvasActions(newActions, currentMessageId) {
  if (!isCanvasMode.value || !Array.isArray(newActions)) return;

  const newAnchorKeys = new Set(
    newActions
      .filter(isCanvasAction)
      .map(canvasActionAnchorKey)
      .filter(Boolean),
  );
  if (!newAnchorKeys.size) return;

  for (const msg of messages.value) {
    if (msg.id === currentMessageId || !Array.isArray(msg.actions)) continue;
    for (const action of msg.actions) {
      if (!isCanvasAction(action)) continue;
      const status = action.status || "pending";
      if (!["pending", "failed", "applying"].includes(status)) continue;
      const anchorKey = canvasActionAnchorKey(action);
      if (anchorKey && newAnchorKeys.has(anchorKey)) {
        action.status = "superseded";
        persistActionStatus(msg.id, action);
      }
    }
  }
}

function visibleActionsForSidebar(msg) {
  return Array.isArray(msg?.actions)
    ? msg.actions.filter(isActionVisibleInSidebar)
    : [];
}

function canvasActionInlineId(messageId, action, index) {
  return `${messageId}:${action?.id || `${action?.name || "action"}-${index}`}`;
}

function splitCanvasActionInlineId(inlineId) {
  const separatorIndex = String(inlineId || "").indexOf(":");
  if (separatorIndex < 0) return null;
  return {
    messageId: String(inlineId).slice(0, separatorIndex),
    actionId: String(inlineId).slice(separatorIndex + 1),
  };
}

function findActionByInlineId(inlineId) {
  const parsed = splitCanvasActionInlineId(inlineId);
  if (!parsed) return null;
  const msg = messages.value.find((m) => String(m.id) === parsed.messageId);
  if (!msg?.actions) return null;
  const action = msg.actions.find(
    (item, index) => canvasActionInlineId(msg.id, item, index) === inlineId,
  );
  return action ? { msg, action } : null;
}

function getInlineCanvasActions() {
  if (!isCanvasMode.value) return [];

  return messages.value.flatMap((msg) => {
    if (!Array.isArray(msg.actions)) return [];
    return msg.actions
      .map((action, index) => ({ action, index }))
      .filter(({ action }) => {
        const status = action.status || "pending";
        return (
          isCanvasAction(action) &&
          (status === "pending" || status === "applying" || status === "failed")
        );
      })
      .map(({ action, index }) => ({
        ...action,
        inlineId: canvasActionInlineId(msg.id, action, index),
      }));
  });
}

function syncInlineCanvasActions() {
  const suggestions = getInlineCanvasActions().flatMap((action) => {
    const items = action?.arguments?.suggestions;
    return Array.isArray(items) ? items : [];
  });
  emit("canvas-suggestions-updated", suggestions);
}

function persistedActionId(action, index = 0) {
  return action?.id || `${action?.name || "action"}-${index}`;
}

async function persistActionStatus(messageId, action) {
  if (!activeSession.value?.id || !action?.name) return;
  const actionId = persistedActionId(action);
  if (!actionId) return;

  try {
    await updateMessageActionStatus(activeSession.value.id, String(messageId), actionId, {
      status: action.status || "pending",
      error: action.error,
    });
  } catch {
    // The assistant message may not be persisted until the stream fully closes.
    // onDone retries terminal action statuses after the server has had time to save it.
  }
}

function persistTerminalActionStatuses(messageId) {
  const msg = messages.value.find((m) => m.id === messageId);
  if (!msg?.actions?.length) return;
  for (const action of msg.actions) {
    if (["accepted", "rejected", "failed", "superseded"].includes(action.status)) {
      persistActionStatus(messageId, action);
    }
  }
}

function normalizeIncomingActions(actions) {
  return dedupeCanvasActionsByAnchor(
    actions.map((a) => ({
      ...a,
      status: a.status || "pending",
      selectedTaskIndexes: getActionTasks(a).map((_, index) => index),
    })),
  );
}

// ======== Session loading ========

function normalizeStoredMessage(m) {
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
    isHidden: false,
  };
}

async function loadActiveSession() {
  const loadSeq = ++sessionLoadSeq;
  const scope = { ...sessionScope.value };
  const scopeKey = sessionScopeKey.value;
  isLoadingSession.value = true;
  try {
    const session = await getActiveSession(scope);
    if (loadSeq !== sessionLoadSeq || scopeKey !== sessionScopeKey.value) return;
    activeSession.value = session;

    const result = await getSessionMessages(session.id, {
      scope,
    });
    if (loadSeq !== sessionLoadSeq || scopeKey !== sessionScopeKey.value) return;
    const rawMessages = Array.isArray(result)
      ? result
      : (result?.messages ?? []);
    messages.value = rawMessages.map(normalizeStoredMessage);
    syncInlineCanvasActions();
    await scrollToBottom();
  } catch {
    // Toast shown by global interceptor
  } finally {
    if (loadSeq === sessionLoadSeq) {
      isLoadingSession.value = false;
    }
  }
}

async function loadSessionList() {
  try {
    const data = await listSessions(sessionScope.value);
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
    const result = await getSessionMessages(session.id, {
      scope: sessionScope.value,
    });
    const rawMessages = Array.isArray(result)
      ? result
      : (result?.messages ?? []);
    messages.value = rawMessages.map(normalizeStoredMessage);
    syncInlineCanvasActions();
    await scrollToBottom();
  } catch {
    // ignore
  }
}

async function handleNewChat() {
  abortStream();
  showSessionDropdown.value = false;
  try {
    const session = await createSession(undefined, sessionScope.value);
    activeSession.value = session;
    messages.value = [];
    syncInlineCanvasActions();
    await loadSessionList();
  } catch {
    // Toast shown by global interceptor
  }
}

// ======== Close ========

function close() {
  abortStream();
  showSessionDropdown.value = false;
  uiStore.clearAiSelectedContext();
  emit("update:open", false);
}

// ======== Abort streaming ========

function abortStream() {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  isStreaming.value = false;
  uiStore.setAiBusy(false);
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

async function sendMessage(options = {}) {
  const text = (options.message ?? inputValue.value).trim();
  if (!text || isStreaming.value || !activeSession.value) return;

  abortStream();

  const userMsgId = ++msgIdCounter;
  if (options.hiddenUserMessage) {
    messages.value.push({
      id: userMsgId,
      role: "tool",
      content: text,
      isHidden: true,
    });
  } else {
    messages.value.push({ id: userMsgId, role: "user", content: text });
  }

  const assistantId = ++msgIdCounter;
  messages.value.push({
    id: assistantId,
    role: "assistant",
    content: options.internalStatusText || "",
    streaming: true,
    isInternalProcessing: Boolean(options.internalStatusText),
  });

  if (!options.message) {
    inputValue.value = "";
  }
  isStreaming.value = true;
  uiStore.setAiBusy(true);
  scrollToBottom();

  abortController = new AbortController();
  let clearSelectedContextOnDone = false;
  const onDoneCommon = async () => {
    const msg = messages.value.find((m) => m.id === assistantId);
    if (msg) msg.streaming = false;
    isStreaming.value = false;
    uiStore.setAiBusy(false);
    abortController = null;
    if (clearSelectedContextOnDone) {
      uiStore.clearAiSelectedContext();
    }
    window.setTimeout(() => persistTerminalActionStatuses(assistantId), 600);

    if (!options.hiddenUserMessage && activeSession.value?.title === "New chat") {
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
      msg.content = msg.content || `(Error: ${err?.message ?? "Unknown"})`;
      msg.streaming = false;
      msg.error = true;
    }
    isStreaming.value = false;
    uiStore.setAiBusy(false);
    abortController = null;
  };

  const ctx = options.context || props.context || {};
  const selectedContextText =
    isCanvasMode.value && selectedContext.value?.fullText
      ? selectedContext.value.fullText.trim()
      : "";
  const useTaskFlow =
    !options.skipTaskFlow &&
    (options.kind === "canvas-task-generation" || shouldUseTaskFlow(text));
  if (useTaskFlow) {
    await sendTaskSessionMessageStream(activeSession.value.id, {
      workspaceId: ctx.workspaceId,
      channelId: ctx.channelId,
      taskListId: ctx.taskListId,
      canvasId: ctx.canvasId,
      canvasContent: ctx.canvasPlainText ?? "",
      canvasTitle: ctx.canvasTitle,
      sourceCanvasUrl: ctx.sourceCanvasUrl,
      overallDueDate: ctx.overallDueDate,
      timezone: ctx.timezone,
      message: text,
      provider: DEFAULT_PROVIDER,
      model: DEFAULT_MODEL,
      signal: abortController.signal,
      onChunk: (chunk) => {
        const msg = messages.value.find((m) => m.id === assistantId);
        if (msg) {
          if (msg.isInternalProcessing) {
            msg.content = "";
            msg.isInternalProcessing = false;
          }
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
          msg.actions = normalizeIncomingActions(event.actions);
          syncInlineCanvasActions();
        }
        scrollToBottom();
      },
      onDone: onDoneCommon,
      onError: onErrorCommon,
    });
  } else if (isCanvasMode.value) {
    clearSelectedContextOnDone = Boolean(selectedContextText);
    await sendCanvasSessionMessageStream(activeSession.value.id, {
      canvasId: ctx.canvasId,
      canvasContent: ctx.canvasPlainText ?? "",
      message: text,
      selectedContext: selectedContextText,
      mode: options.mode,
      provider: DEFAULT_PROVIDER,
      model: DEFAULT_MODEL,
      signal: abortController.signal,
      onChunk: (chunk) => {
        const msg = messages.value.find((m) => m.id === assistantId);
        if (msg) {
          if (msg.isInternalProcessing) {
            msg.content = "";
            msg.isInternalProcessing = false;
          }
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
          const nextActions = normalizeIncomingActions(event.actions);
          supersedeOlderCanvasActions(nextActions, msg.id);
          msg.actions = nextActions;
          syncInlineCanvasActions();
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
      workspaceId: ctx.workspaceId,
      channelId: ctx.channelId,
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
          msg.actions = normalizeIncomingActions(event.actions);
          syncInlineCanvasActions();
        }
        scrollToBottom();
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
  action.error = undefined;
  syncInlineCanvasActions();
  try {
    const isTaskAction =
      action.name === "create_task" ||
      action.name === "create_tasks_batch" ||
      action.name === "create_task_list_with_tasks" ||
      action.name === "send_channel_message";
    const isTaskDataMutation =
      action.name === "create_task" ||
      action.name === "create_tasks_batch" ||
      action.name === "create_task_list_with_tasks";

    if (isTaskAction) {
      await runTaskActionStream(action);
      action.status = "accepted";
      persistActionStatus(messageId, action);
    } else {
      const result = await applyCanvasAction({
          canvasId: props.context?.canvasId,
          actionName: action.name,
          actionArgs: action.arguments || {},
      });
      action.lastResult = result;
      action.status = result?.ok ? "accepted" : "failed";
      if (!result?.ok) {
        action.error = result?.error || "Apply failed";
      }
      persistActionStatus(messageId, action);
    }
    if (action.status === "accepted" && action.name === "send_channel_message" && props.context?.channelId) {
      queryClient.invalidateQueries({ queryKey: ["messages", props.context.channelId] });
    }
    if (action.status === "accepted" && isTaskDataMutation && props.context?.workspaceId) {
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
    action.error = err?.message || "Apply failed";
    persistActionStatus(messageId, action);
  } finally {
    syncInlineCanvasActions();
  }
}

async function runTaskActionStream(action) {
  if (!activeSession.value?.id || !props.context?.workspaceId) {
    throw new Error("Missing task context");
  }

  const assistantId = ++msgIdCounter;
  messages.value.push({
    id: assistantId,
    role: "assistant",
    content: "",
    actions: [],
    streaming: true,
  });
  scrollToBottom();

  abortController = new AbortController();
  isStreaming.value = true;
  uiStore.setAiBusy(true);

  let streamError = null;
  await applyTaskActionStream({
    sessionId: activeSession.value.id,
    workspaceId: props.context.workspaceId,
    channelId: props.context?.channelId,
    taskListId: props.context?.taskListId,
    canvasId: props.context?.canvasId,
    canvasContent: props.context?.canvasPlainText ?? "",
    canvasTitle: props.context?.canvasTitle,
    sourceCanvasUrl: props.context?.sourceCanvasUrl,
    overallDueDate: props.context?.overallDueDate,
    timezone: props.context?.timezone,
    actionName: action.name,
    actionArgs: action.arguments || {},
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
      const streamMsg = messages.value.find((m) => m.id === assistantId);
      if (!streamMsg || !event?.type) return;
      if (event.type === "status" && event.message) {
        streamMsg.content += `${streamMsg.content ? "\n" : ""}[${event.message}]`;
      }
      if (event.type === "assistant" && event.content) {
        streamMsg.content += `${streamMsg.content ? "\n" : ""}${event.content}`;
      }
      if (event.type === "actions" && Array.isArray(event.actions)) {
        streamMsg.actions = normalizeIncomingActions(event.actions);
        syncInlineCanvasActions();
      }
      scrollToBottom();
    },
    onDone: () => {
      const streamMsg = messages.value.find((m) => m.id === assistantId);
      if (streamMsg) streamMsg.streaming = false;
      window.setTimeout(() => persistTerminalActionStatuses(assistantId), 600);
    },
    onError: (err) => {
      streamError = err;
      const streamMsg = messages.value.find((m) => m.id === assistantId);
      if (streamMsg) {
        streamMsg.content = streamMsg.content || `(Error: ${err?.message ?? "Unknown"})`;
        streamMsg.streaming = false;
        streamMsg.error = true;
      }
    },
  });

  const streamMsg = messages.value.find((m) => m.id === assistantId);
  if (streamMsg) streamMsg.streaming = false;
  isStreaming.value = false;
  uiStore.setAiBusy(false);
  abortController = null;

  if (streamError) {
    throw streamError;
  }
}

async function handleAcceptAllVisibleActions(messageId) {
  const msg = messages.value.find((m) => m.id === messageId);
  if (!msg?.actions?.length) return;
  for (const action of msg.actions) {
    if (action.status === "pending" && isActionVisibleInSidebar(action)) {
      await handleAcceptAction(messageId, action);
    }
  }
}

function handleRejectAction(messageId, action) {
  const msg = messages.value.find((m) => m.id === messageId);
  if (!msg?.actions) return;
  action.status = "rejected";
  persistActionStatus(messageId, action);
  syncInlineCanvasActions();
}

async function acceptCanvasActionByInlineId(inlineId) {
  const match = findActionByInlineId(inlineId);
  if (!match || !isCanvasAction(match.action)) return;
  await handleAcceptAction(match.msg.id, match.action);
}

function rejectCanvasActionByInlineId(inlineId) {
  const match = findActionByInlineId(inlineId);
  if (!match || !isCanvasAction(match.action)) return;
  handleRejectAction(match.msg.id, match.action);
}

async function acceptAllInlineCanvasActions() {
  const actions = getInlineCanvasActions().filter(
    (action) => action.status === "pending",
  );
  for (const action of actions) {
    await acceptCanvasActionByInlineId(action.inlineId);
  }
}

function rejectAllInlineCanvasActions() {
  const actions = getInlineCanvasActions().filter((action) =>
    ["pending", "failed"].includes(action.status || "pending"),
  );
  for (const action of actions) {
    rejectCanvasActionByInlineId(action.inlineId);
  }
}

async function processPendingAiCommand() {
  const command = uiStore.pendingAiCommand;
  if (
    !command ||
    isStreaming.value ||
    processingPendingCommandId.value === command.id
  ) {
    return;
  }
  if (!props.open) {
    emit("update:open", true);
    return;
  }
  processingPendingCommandId.value = command.id;
  try {
    await ensureCommandSession();
    uiStore.clearPendingAiCommand(command.id);

    if (command.kind === "canvas-summary") {
      await sendMessage({
        message: command.message,
        kind: command.kind,
        context: command.context,
        mode: "summary",
      });
      return;
    }

    if (command.kind === "canvas-task-generation") {
      taskSetup.value = {
        command,
        overallDueDate: "",
      };
    }
  } catch {
    // Toast shown by global interceptor
  } finally {
    processingPendingCommandId.value = null;
  }
}

async function ensureCommandSession() {
  abortStream();
  showSessionDropdown.value = false;
  taskSetup.value = null;
  if (!activeSession.value) {
    await loadActiveSession();
  }
  await loadSessionList();
}

function submitTaskSetup() {
  if (!taskSetup.value?.command || isStreaming.value) return;
  const { command, overallDueDate } = taskSetup.value;
  const dueIso = overallDueDate
    ? new Date(`${overallDueDate}T17:00:00`).toISOString()
    : "";
  const timezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const message = overallDueDate
    ? `${command.message}\n\nOverall due date: ${overallDueDate}.`
    : `${command.message}\n\nNo overall due date was provided; only set per-task due dates if the Canvas explicitly mentions dates.`;
  taskSetup.value = null;
  sendMessage({
    message,
    kind: command.kind,
    context: {
      ...command.context,
      overallDueDate: dueIso,
      timezone,
    },
  });
}

function cancelTaskSetup() {
  taskSetup.value = null;
}

function isTaskListWithTasksAction(action) {
  return action?.name === "create_task_list_with_tasks";
}

function getActionTasks(action) {
  const tasks = action?.arguments?.tasks;
  return Array.isArray(tasks) ? tasks : [];
}

function isTaskSelected(action, index) {
  return Array.isArray(action.selectedTaskIndexes)
    ? action.selectedTaskIndexes.includes(index)
    : true;
}

function toggleTaskSelection(action, index, checked) {
  const current = new Set(action.selectedTaskIndexes || []);
  if (checked) current.add(index);
  else current.delete(index);
  action.selectedTaskIndexes = Array.from(current).sort((a, b) => a - b);
}

function selectedTaskCount(action) {
  return getActionTasks(action).filter((_, index) =>
    isTaskSelected(action, index),
  ).length;
}

async function handleConfirmSelectedTasks(messageId, action) {
  const tasks = getActionTasks(action);
  const selected = tasks.filter((_, index) => isTaskSelected(action, index));
  if (!selected.length) return;
  action.arguments = {
    ...(action.arguments || {}),
    tasks: selected,
  };
  await handleAcceptAction(messageId, action);
  if (action.status === "accepted") {
    addAssistantNotice(
      `Task list created successfully with ${selected.length} task${
        selected.length === 1 ? "" : "s"
      }.`,
    );
  }
}

function addAssistantNotice(content) {
  messages.value.push({
    id: ++msgIdCounter,
    role: "assistant",
    content,
    actions: [],
    streaming: false,
  });
  scrollToBottom();
}

function taskDueLabel(task) {
  if (!task?.due_date) return "No due date";
  try {
    return new Date(task.due_date).toLocaleString();
  } catch {
    return task.due_date;
  }
}

function actionCanvasTitle(action) {
  return action?.arguments?.source_canvas_title || "Source canvas";
}

function isSendChannelMessageAction(action) {
  return action?.name === "send_channel_message";
}

function actionLabel(action) {
  return action?.label || action?.name || "Action";
}

function actionMessagePreview(action) {
  return typeof action?.arguments?.message === "string"
    ? action.arguments.message
    : "";
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
      if (uiStore.pendingAiCommand) {
        await processPendingAiCommand();
      } else {
        await loadActiveSession();
        await loadSessionList();
        applyPendingDraft();
      }
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
  sessionScopeKey,
  async () => {
    if (!props.open) return;
    abortStream();
    activeSession.value = null;
    sessions.value = [];
    messages.value = [];
    taskSetup.value = null;
    showSessionDropdown.value = false;
    uiStore.clearAiSelectedContext();
    syncInlineCanvasActions();
    await loadActiveSession();
    await loadSessionList();
  },
);

watch(
  () => uiStore.aiDraft,
  () => {
    if (!props.open) return;
    applyPendingDraft();
  },
);

watch(
  () => uiStore.pendingAiCommand,
  () => {
    processPendingAiCommand();
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
  uiStore.clearAiSelectedContext();
  emit("canvas-suggestions-updated", []);
});

defineExpose({
  acceptCanvasActionByInlineId,
  rejectCanvasActionByInlineId,
  acceptAllInlineCanvasActions,
  rejectAllInlineCanvasActions,
});

// ======== Text formatting ========

function renderMarkdown(text) {
  if (!text) return "";
  const html = marked.parse(String(text));
  return DOMPurify.sanitize(html);
}

function parseJsonCandidate(candidate) {
  if (typeof candidate !== "string" || !candidate.trim()) return null;
  try {
    const parsed = JSON.parse(candidate.trim());
    if (!parsed || typeof parsed !== "object" || typeof parsed.answer !== "string") {
      return null;
    }
    return {
      answer: parsed.answer,
      suggestedActions: Array.isArray(parsed.suggested_actions)
        ? parsed.suggested_actions
            .filter(
              (action) =>
                action &&
                typeof action === "object" &&
                typeof action.label === "string" &&
                typeof action.prompt_to_trigger === "string",
            )
            .map((action) => ({
              label: action.label,
              prompt_to_trigger: action.prompt_to_trigger,
              ...(typeof action.tool_intent === "string"
                ? { tool_intent: action.tool_intent }
                : {}),
            }))
        : [],
    };
  } catch {
    return null;
  }
}

function extractJsonFromCodeFence(content) {
  const fencePattern = /```(?:json)?\s*([\s\S]*?)```/gi;
  let match;
  while ((match = fencePattern.exec(content)) !== null) {
    const parsed = parseJsonCandidate(match[1]);
    if (parsed) return parsed;
  }
  return null;
}

function extractJsonByBalancedBraces(content) {
  const startIndexes = [];
  for (let index = 0; index < content.length; index += 1) {
    if (content[index] === "{") startIndexes.push(index);
  }

  for (const start of startIndexes) {
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = start; index < content.length; index += 1) {
      const char = content[index];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === "\"") {
          inString = false;
        }
        continue;
      }

      if (char === "\"") {
        inString = true;
      } else if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          const parsed = parseJsonCandidate(content.slice(start, index + 1));
          if (parsed) return parsed;
          break;
        }
      }
    }
  }

  return null;
}

function extractAiJsonContent(content) {
  if (typeof content !== "string" || !content.trim()) return null;
  return (
    parseJsonCandidate(content) ||
    extractJsonFromCodeFence(content) ||
    extractJsonByBalancedBraces(content)
  );
}

function assistantDisplayContent(msg) {
  if (msg?.role !== "assistant") return msg?.content || "";
  return extractAiJsonContent(msg.content)?.answer || msg?.content || "";
}

function suggestedActionsForMessage(msg) {
  if (msg?.role !== "assistant" || msg.streaming) return [];
  return extractAiJsonContent(msg.content)?.suggestedActions || [];
}

function handleSuggestedAction(action) {
  const prompt = action?.prompt_to_trigger?.trim();
  if (!prompt || isStreaming.value) return;
  inputValue.value = prompt;
  sendMessage({ message: prompt });
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
    normalized.includes("action item")
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
        title="Drag to resize"
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
                activeSession ? sessionLabel(activeSession) : 'Choose session'
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
            title="Close"
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
          v-if="visibleMessages.length === 0"
          class="ai-chat-empty"
        >
          <Bot
            :size="32"
            class="ai-chat-empty-icon"
          />
          <p>Hello, I am your AI Assistant.<br>Ask anything.</p>
        </div>

        <template v-else>
          <div
            v-for="msg in visibleMessages"
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
              <!-- eslint-disable vue/no-v-html -->
              <div
                class="ai-chat-msg-text"
                v-html="renderMarkdown(assistantDisplayContent(msg))"
              />
              <!-- eslint-enable vue/no-v-html -->
              <span
                v-if="msg.streaming"
                class="ai-chat-cursor"
              >▌</span>
              <div
                v-if="suggestedActionsForMessage(msg).length > 0"
                class="ai-suggested-actions"
              >
                <button
                  v-for="action in suggestedActionsForMessage(msg)"
                  :key="`${msg.id}-${action.label}-${action.prompt_to_trigger}`"
                  type="button"
                  class="ai-suggested-action-chip"
                  :title="action.prompt_to_trigger"
                  @click="handleSuggestedAction(action)"
                >
                  {{ action.label }}
                </button>
              </div>
              <div
                v-if="
                  msg.role === 'assistant' &&
                    visibleActionsForSidebar(msg).length > 0
                "
                class="ai-action-list"
              >
                <div
                  v-if="!visibleActionsForSidebar(msg).some(isTaskListWithTasksAction)"
                  class="ai-action-batch-controls"
                >
                  <button
                    type="button"
                    class="ai-action-btn ai-action-btn--accept"
                    @click="handleAcceptAllVisibleActions(msg.id)"
                  >
                    Accept all
                  </button>
                </div>
                <div
                  v-for="action in visibleActionsForSidebar(msg)"
                  :key="action.id"
                  class="ai-action-item"
                >
                  <div class="ai-action-main">
                    <span class="ai-action-name">{{ actionLabel(action) }}</span>
                    <span
                      class="ai-action-status"
                      :class="`is-${action.status}`"
                    >{{ action.status }}</span>
                  </div>

                  <div
                    v-if="isTaskListWithTasksAction(action)"
                    class="ai-task-preview"
                  >
                    <div class="ai-task-preview-header">
                      <strong>{{ action.arguments?.list_name || "New task list" }}</strong>
                      <span>{{ selectedTaskCount(action) }} selected</span>
                    </div>
                    <label
                      v-for="(task, taskIndex) in getActionTasks(action)"
                      :key="`${action.id || action.name}-${taskIndex}`"
                      class="ai-task-preview-row"
                    >
                      <input
                        type="checkbox"
                        :checked="isTaskSelected(action, taskIndex)"
                        :disabled="action.status !== 'pending'"
                        @change="
                          toggleTaskSelection(
                            action,
                            taskIndex,
                            $event.target.checked,
                          )
                        "
                      >
                      <span class="ai-task-preview-body">
                        <span class="ai-task-preview-title">{{
                          task.title || "Untitled task"
                        }}</span>
                        <span
                          v-if="task.description"
                          class="ai-task-preview-description"
                        >{{ task.description }}</span>
                        <span class="ai-task-preview-meta">
                          Due: {{ taskDueLabel(task) }} · Priority:
                          {{ task.priority || "medium" }} · Assignee: You
                        </span>
                        <span class="ai-task-preview-meta">
                          Attachment: {{ actionCanvasTitle(action) }}
                        </span>
                      </span>
                    </label>
                  </div>
                  <div
                    v-else-if="isSendChannelMessageAction(action)"
                    class="ai-channel-message-preview"
                  >
                    <div class="ai-channel-message-preview-label">
                      Message preview
                    </div>
                    <div class="ai-channel-message-preview-body">
                      {{ actionMessagePreview(action) }}
                    </div>
                  </div>
                  <div
                    v-else
                    class="ai-action-args"
                  >
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
                      v-if="isTaskListWithTasksAction(action)"
                      type="button"
                      class="ai-action-btn ai-action-btn--accept"
                      :disabled="selectedTaskCount(action) === 0"
                      @click="handleConfirmSelectedTasks(msg.id, action)"
                    >
                      Confirm Selected
                    </button>
                    <button
                      v-else
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

      <div
        v-if="taskSetup"
        class="ai-task-setup"
      >
        <div class="ai-task-setup-title">
          Task generation setup
        </div>
        <label class="ai-task-setup-field">
          <span>Overall due date</span>
          <input
            v-model="taskSetup.overallDueDate"
            type="date"
          >
        </label>
        <div class="ai-task-setup-actions">
          <button
            type="button"
            class="ai-action-btn ai-action-btn--reject"
            @click="cancelTaskSetup"
          >
            Cancel
          </button>
          <button
            type="button"
            class="ai-action-btn ai-action-btn--accept"
            @click="submitTaskSetup"
          >
            Continue
          </button>
        </div>
      </div>

      <!-- Input area -->
      <div class="ai-chat-input-area">
        <div
          v-if="selectedContext"
          class="ai-selected-context"
        >
          <div class="ai-selected-context-main">
            <span class="ai-selected-context-label">
              {{ selectedContext.label || "Selected text" }}
            </span>
            <span class="ai-selected-context-preview">
              {{ selectedContext.preview }}
            </span>
          </div>
          <button
            type="button"
            class="ai-selected-context-remove"
            title="Remove selected text"
            @click="uiStore.clearAiSelectedContext()"
          >
            <X :size="14" />
          </button>
        </div>
        <div class="ai-chat-input-row">
          <textarea
            ref="textareaEl"
            v-model="inputValue"
            class="ai-chat-textarea"
            placeholder="Ask a question... (Enter to send)"
            rows="3"
            :disabled="isStreaming || isLoadingSession || Boolean(taskSetup)"
            @keydown="handleKeydown"
          />
          <button
            type="button"
            class="ai-chat-send-btn"
            :disabled="
              isStreaming || isLoadingSession || Boolean(taskSetup) || !inputValue.trim()
            "
            title="Send (Enter)"
            @click="sendMessage"
          >
            <Send :size="16" />
          </button>
        </div>
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

.ai-suggested-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.ai-suggested-action-chip {
  border: 1px solid #bfdbfe;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
  max-width: 100%;
  padding: 6px 10px;
  text-align: left;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.ai-suggested-action-chip:hover {
  background: #dbeafe;
  border-color: #93c5fd;
  color: #1e40af;
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

.ai-task-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ai-task-preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: #334155;
}

.ai-task-preview-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  cursor: pointer;

  input {
    margin-top: 3px;
    flex-shrink: 0;
  }
}

.ai-task-preview-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.ai-task-preview-title {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

.ai-task-preview-description {
  font-size: 12px;
  color: #334155;
}

.ai-task-preview-meta {
  font-size: 11px;
  color: #64748b;
}

.ai-channel-message-preview {
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #f8fafc;
  margin-top: 8px;
  padding: 8px;
}

.ai-channel-message-preview-label {
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
  margin-bottom: 4px;
  text-transform: uppercase;
}

.ai-channel-message-preview-body {
  color: #0f172a;
  font-size: 12.5px;
  line-height: 1.5;
  white-space: pre-wrap;
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

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.ai-action-btn--accept {
  background: #dcfce7;
  color: #166534;
}

.ai-action-btn--reject {
  background: #fee2e2;
  color: #991b1b;
}

.ai-task-setup {
  flex-shrink: 0;
  border-top: 1px solid var(--ui-divider, #e5e7eb);
  background: #f8fafc;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ai-task-setup-title {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

.ai-task-setup-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 12px;
  color: #475569;

  input {
    height: 32px;
    border: 1px solid #cbd5e1;
    border-radius: 7px;
    padding: 0 8px;
    font-size: 13px;
    color: #0f172a;
    background: #fff;
  }
}

.ai-task-setup-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.ai-chat-msg-text {
  display: block;
  max-width: 100%;
  overflow-x: auto;
}

.ai-chat-msg-text :deep(*) {
  max-width: 100%;
}

.ai-chat-msg-text :deep(h1),
.ai-chat-msg-text :deep(h2),
.ai-chat-msg-text :deep(h3) {
  color: #0f172a;
  font-weight: 700;
  line-height: 1.3;
  margin: 0.65em 0 0.35em;
}

.ai-chat-msg-text :deep(h1) {
  font-size: 18px;
}

.ai-chat-msg-text :deep(h2) {
  font-size: 16px;
}

.ai-chat-msg-text :deep(h3) {
  font-size: 14px;
}

.ai-chat-msg-text :deep(p) {
  margin: 0.45em 0;
}

.ai-chat-msg-text :deep(p:first-child),
.ai-chat-msg-text :deep(h1:first-child),
.ai-chat-msg-text :deep(h2:first-child),
.ai-chat-msg-text :deep(h3:first-child) {
  margin-top: 0;
}

.ai-chat-msg-text :deep(p:last-child),
.ai-chat-msg-text :deep(ul:last-child),
.ai-chat-msg-text :deep(ol:last-child),
.ai-chat-msg-text :deep(table:last-child) {
  margin-bottom: 0;
}

.ai-chat-msg-text :deep(ul),
.ai-chat-msg-text :deep(ol) {
  margin: 0.45em 0;
  padding-left: 1.35em;
}

.ai-chat-msg-text :deep(li) {
  margin: 0.2em 0;
}

.ai-chat-msg-text :deep(code) {
  background: #f1f5f9;
  border-radius: 4px;
  color: #334155;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.92em;
  padding: 1px 4px;
}

.ai-chat-msg-text :deep(pre) {
  background: #0f172a;
  border-radius: 8px;
  color: #e2e8f0;
  margin: 0.65em 0;
  overflow-x: auto;
  padding: 10px 12px;
}

.ai-chat-msg-text :deep(pre code) {
  background: transparent;
  color: inherit;
  padding: 0;
}

.ai-chat-msg-text :deep(hr) {
  border: 0;
  border-top: 1px solid #e2e8f0;
  margin: 0.8em 0;
}

.ai-chat-msg-text :deep(table) {
  border-collapse: collapse;
  display: block;
  font-size: 12.5px;
  margin: 0.65em 0;
  max-width: none;
  overflow-x: auto;
  width: max-content;
}

.ai-chat-msg-text :deep(th),
.ai-chat-msg-text :deep(td) {
  border: 1px solid #cbd5e1;
  padding: 5px 8px;
  text-align: left;
  vertical-align: top;
  white-space: nowrap;
}

.ai-chat-msg-text :deep(th) {
  background: #f8fafc;
  color: #334155;
  font-weight: 700;
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
  flex-direction: column;
  gap: 8px;
  padding: 12px 12px 14px;
  border-top: 1px solid var(--ui-divider, #e5e7eb);
  background: #ffffff;
}

.ai-chat-input-row {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.ai-selected-context {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 9px;
  border: 1px solid var(--primary-100, #dbeafe);
  border-radius: 10px;
  background: #eff6ff;
}

.ai-selected-context-main {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ai-selected-context-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--primary-700, #1d4ed8);
}

.ai-selected-context-preview {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 12.5px;
  line-height: 1.35;
  color: var(--ui-text-muted, #475569);
  overflow-wrap: anywhere;
}

.ai-selected-context-remove {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--ui-text-muted, #64748b);
  background: transparent;
  cursor: pointer;

  &:hover {
    color: var(--ui-text, #0f172a);
    background: rgba(37, 99, 235, 0.1);
  }
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
