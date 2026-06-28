<script setup lang="ts">
import {
  watch,
  onBeforeUnmount,
  ref,
  computed,
  shallowRef,
  nextTick,
} from "vue";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import { Editor } from "@tiptap/vue-3";
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as Y from "yjs";
import RichEditor from "@/components/editor/RichEditor.vue";
import TranscriptBanner from "@/components/editor/TranscriptBanner.vue";
import AiChatSidebar from "@/components/ai/AiChatSidebar.vue";
import CanvasShareDialog from "@/components/editor/CanvasShareDialog.vue";
import { CanvasBlockIdExtension } from "@/components/editor/canvas-block-id.extension";
import { AiCanvasActionsExtension } from "@/components/editor/ai-canvas-actions.extension";
import canvasService from "@/services/canvas.service";
import type { CanvasSuggestion } from "@/services/canvas.service";
import { AiPreviewExtension } from "@/components/editor/ai-preview.extension";
import { useCanvasAiWriter } from "@/composables/useCanvasAiWriter";
import { requestCanvas } from "../queries/canvas.queries";
import { useCanvasStore } from "../stores/canvas.store";
import { useChannelStore } from "../stores/channel.store.js";
import { useAuthStore } from "@/modules/auth/stores/auth.store.js";
import { useRoute } from "vue-router";
import { useQueryClient } from "@tanstack/vue-query";
import { useLoading } from "@/composables/useLoading.js";
import { useUiStore } from "@/stores/ui.store.js";
import {
  attachCanvasCollabAuthHandlers,
  createCanvasCollabTokenProvider,
} from "@/modules/channels/composables/useCanvasCollabToken";

const uiStore = useUiStore();
const canvasCollabUrl = import.meta.env.VITE_CANVAS_COLLAB_URL;
const TITLE_SAVE_DEBOUNCE_MS = 1000;
const SYNC_READY_TIMEOUT_MS = 10_000;

const canvasStore = useCanvasStore();
const channelStore = useChannelStore();
const authStore = useAuthStore();
const route = useRoute();
const queryClient = useQueryClient();
const { showFullscreen, hideFullscreen } = useLoading();

const canvasId = computed(() => route.params.canvasId as string);
const aiCanvasContext = computed(() => ({
  kind: "canvas",
  workspaceId: selectedCanvas.value?.workspaceId,
  channelId: resolvedChannelId.value,
  canvasId: canvasId.value,
  canvasTitle: displayTitle.value,
  canvasPlainText: canvasPlainText.value,
  sourceCanvasUrl: `/canvas/${canvasId.value}/edit`,
}));
const isAiCommandPending = computed(() => Boolean(uiStore.pendingAiCommand));
const aiActionsDisabled = computed(
  () => isAiCommandPending.value || uiStore.isAiBusy || !canvasPlainText.value.trim(),
);
const showTaskChannelPicker = ref(false);
const showTranscriptBanner = ref(false);
const showShareDialog = ref(false);
const aiChatSidebarRef = ref<InstanceType<typeof AiChatSidebar> | null>(null);
const canvasSuggestions = ref<CanvasSuggestion[]>([]);

// ======== Title =========

const { data: selectedCanvas, isLoading } = requestCanvas({
  canvasId: computed(() => canvasId.value),
  staleTime: 5 * 60 * 1000,
});

const availableChannels = computed(() => channelStore.channels || []);
const shareWorkspaceId = computed(() =>
  typeof selectedCanvas.value?.workspaceId === "string"
    ? selectedCanvas.value.workspaceId
    : undefined,
);
const selectedCanvasOwner = computed(() =>
  selectedCanvas.value?.owner as
    | { id?: string; name?: string; avatar?: string | null }
    | undefined,
);
const resolvedChannelId = computed(() => {
  const fromCanvas = selectedCanvas.value?.channelId;
  if (typeof fromCanvas === "string" && fromCanvas) return fromCanvas;
  const fromQuery = route.query.channelId;
  if (typeof fromQuery === "string" && fromQuery) return fromQuery;
  const selected = channelStore.selectedChannel?.id;
  if (selected) return selected;
  return availableChannels.value.length === 1 ? availableChannels.value[0].id : undefined;
});
const transcriptDismissKey = computed(
  () => `canvas-transcript-ai-banner-dismissed:${canvasId.value}`,
);

const displayTitle = ref("");
let titleSaveTimer: ReturnType<typeof setTimeout> | undefined;

watch(
  () => isLoading.value,
  (loading) => {
    if (loading) showFullscreen();
    else hideFullscreen();
  },
  { immediate: true },
);

watch(
  () => [selectedCanvas.value?.title, canvasId.value, canvasStore.canvases],
  () => {
    const fromQuery = selectedCanvas.value?.title;
    if (fromQuery !== undefined && fromQuery !== null) {
      displayTitle.value = fromQuery ?? "";
      return;
    }
    const list = canvasStore.canvases;
    const id = canvasId.value;
    if (id && list?.length) {
      const c = list.find((x) => x.id === id);
      if (c?.title != null) displayTitle.value = c.title ?? "";
    }
  },
  { immediate: true },
);

watch(
  () => canvasId.value,
  () => {
    canvasSuggestions.value = [];
    void refreshCanvasSuggestions();
  },
);

watch(
  () => selectedCanvas.value?.workspaceId,
  (workspaceId) => {
    if (workspaceId) {
      void channelStore.fetchUserChannels(workspaceId);
    }
  },
  { immediate: true },
);

function onTitleUpdate(value: string) {
  if (selectedCanvas.value?.canEdit !== true) return;
  displayTitle.value = value;
  if (titleSaveTimer) clearTimeout(titleSaveTimer);
  titleSaveTimer = setTimeout(async () => {
    if (!selectedCanvas.value?.id) return;
    titleSaveTimer = undefined;
    const id = selectedCanvas.value.id;
    const title = displayTitle.value.trim() || "New page";
    try {
      const updated = await canvasStore.updateCanvasTitle(id, title);
      if (updated) queryClient.setQueryData(["canvas", id], updated);
    } catch {
      // Toast is shown by the global axios interceptor
    }
  }, TITLE_SAVE_DEBOUNCE_MS);
}

// ======== Current user =========

const currentUser = computed(() => {
  if (!authStore.isLoggedIn) return null;
  const u = authStore.user as {
    id?: string;
    name?: string;
    email?: string;
    avatar?: string | null;
  } | null;
  return {
    userId: u?.id ?? "",
    name: u?.name ?? authStore.userName ?? "",
    avatar: u?.avatar ?? null,
    email: u?.email ?? authStore.userEmail ?? undefined,
  };
});

// ======== Yjs / Collab lifecycle =========

const ydoc = shallowRef<Y.Doc | null>(null);
const provider = shallowRef<HocuspocusProvider | null>(null);
const editor = shallowRef<Editor | null>(null);

const isEditorReady = ref(false);
const syncStatus = ref<"connecting" | "synced" | "offline">("connecting");
let syncReadyTimeoutId: ReturnType<typeof setTimeout> | undefined;

const onlineUsers = ref<
  Array<{ userId: string; name: string; avatar: string | null; color: string }>
>([]);

const saveStatus = ref<"saved" | "saving">("saved");
const hadChangesSinceLastSaved = ref(false);
const collabAccessDenied = ref(false);

const displaySaveStatus = computed<"saved" | "saving">(() =>
  saveStatus.value === "saving" || hadChangesSinceLastSaved.value
    ? "saving"
    : "saved",
);
const editorReadOnly = computed(
  () =>
    collabAccessDenied.value ||
    !isEditorReady.value ||
    selectedCanvas.value?.canEdit !== true,
);

const jwtToken = computed(() => authStore.accessToken);

function refreshOnlineUsers() {
  const p = provider.value;
  if (!p) {
    onlineUsers.value = [];
    return;
  }
  const states = Array.from(p.awareness.getStates().values()) as any[];
  onlineUsers.value = states
    .map((state) => state.user)
    .filter(Boolean)
    .map((user) => ({
      userId: user.userId,
      name: user.name,
      avatar: user.avatar,
      email: user.email,
      color: user.color,
    }));
}

function destroyCollabResources() {
  if (syncReadyTimeoutId) {
    clearTimeout(syncReadyTimeoutId);
    syncReadyTimeoutId = undefined;
  }
  isEditorReady.value = false;
  syncStatus.value = "connecting";

  try {
    editor.value?.destroy();
  } catch {
    console.error("[CanvasEditView] Failed to destroy editor:");
  }
  editor.value = null;

  try {
    provider.value?.destroy();
  } catch {
    console.error("[CanvasEditView] Failed to destroy provider:");
  }
  provider.value = null;

  try {
    ydoc.value?.destroy();
  } catch {
    console.error("[CanvasEditView] Failed to destroy ydoc:");
  }
  ydoc.value = null;

  onlineUsers.value = [];
  saveStatus.value = "saved";
  hadChangesSinceLastSaved.value = false;
  collabAccessDenied.value = false;
}

// ======== AI Writer =========

const {
  slashMenu,
  aiWriterBar,
  selectionAiIcon,
  canvasPlainText,
  buildSlashCommandExtension,
  buildSelectionListener,
  destroySelectionListeners,
  // Phase 2
  handlePreviewStart,
  handlePreviewChunk,
  handlePreviewDone,
  handleAccept,
  handleReject,
  handleAiWriterClose,
  handleSelectionIconClick,
} = useCanvasAiWriter(editor);

const isTranscriptCanvas = computed(() => {
  const haystack = [
    displayTitle.value,
    selectedCanvas.value?.description,
    canvasPlainText.value.slice(0, 1200),
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
  return (
    haystack.includes("meeting transcript") ||
    haystack.includes("transcript generated from realtime subtitles") ||
    /\[\d{1,2}:\d{2}(?::\d{2})?\s*-\s*\d{1,2}:\d{2}(?::\d{2})?\]/.test(
      haystack,
    ) ||
    /(^|\n)\s*(speaker|người nói|nguoi noi)\s*:/i.test(haystack)
  );
});

watch(
  () => [canvasId.value, isTranscriptCanvas.value],
  () => {
    showTranscriptBanner.value =
      isTranscriptCanvas.value &&
      localStorage.getItem(transcriptDismissKey.value) !== "1";
  },
  { immediate: true },
);

// ======== Editor setup =========

function generateColorFromName(name: string) {
  return `#${name
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0)
    .toString(16)
    .padStart(6, "0")}`;
}

async function setupForCanvas(id: string) {
  const tokenProvider = createCanvasCollabTokenProvider(id);
  const doc = new Y.Doc();
  const p = new HocuspocusProvider({
    url: canvasCollabUrl,
    name: id,
    document: doc,
    token: tokenProvider.getToken,
  });

  ydoc.value = doc;
  provider.value = p;

  p.on("status", (event) => {
    console.log("[CanvasEditView] WS status:", event.status);
  });
  p.on("disconnect", () => {
    console.warn("[CanvasEditView] Provider disconnected");
    syncStatus.value = "offline";
  });
  p.on("unsyncedChanges", ({ number: count }: { number: number }) => {
    if (count > 0 && isEditorReady.value) {
      saveStatus.value = "saving";
      hadChangesSinceLastSaved.value = true;
    }
  });
  p.on("stateless", (e: { payload: string }) => {
    try {
      const d = JSON.parse(e.payload) as { type?: string };
      if (d?.type === "canvasSaved") {
        saveStatus.value = "saved";
        hadChangesSinceLastSaved.value = false;
      }
    } catch (error) {
      console.error("[CanvasEditView] Failed to parse stateless event:", error);
    }
  });

  const me = currentUser.value;
  p.awareness.setLocalStateField("user", {
    userId: me?.userId ?? "",
    name: me?.name ?? "",
    avatar: me?.avatar ?? null,
    email: me?.email ?? "",
    color: generateColorFromName(me?.name ?? ""),
  });
  p.awareness.on("change", refreshOnlineUsers);
  refreshOnlineUsers();

  isEditorReady.value = false;
  syncStatus.value = "connecting";
  collabAccessDenied.value = false;

  function setEditorReady() {
    if (syncReadyTimeoutId) {
      clearTimeout(syncReadyTimeoutId);
      syncReadyTimeoutId = undefined;
    }
    isEditorReady.value = true;
    editor.value?.setEditable(selectedCanvas.value?.canEdit === true);
    saveStatus.value = "saved";
    hadChangesSinceLastSaved.value = false;
  }

  attachCanvasCollabAuthHandlers(p, tokenProvider, {
    onTokenRefreshed: () => {
      syncStatus.value = "connecting";
      collabAccessDenied.value = false;
    },
    onAuthenticationFailed: (reason) => {
      console.warn("[CanvasEditView] Authentication failed:", reason);
      syncStatus.value = "offline";
      collabAccessDenied.value = true;
      setEditorReady();
      editor.value?.setEditable(false);
    },
  });

  p.on("synced", () => {
    syncStatus.value = "synced";
    setEditorReady();
  });

  syncReadyTimeoutId = setTimeout(() => {
    syncReadyTimeoutId = undefined;
    if (isEditorReady.value) return;
    console.warn(
      "[CanvasEditView] Sync timeout – enabling editor (offline mode)",
    );
    syncStatus.value = "offline";
    setEditorReady();
  }, SYNC_READY_TIMEOUT_MS);

  editor.value = new Editor({
    extensions: [
      StarterKit,
      CanvasBlockIdExtension,
      Collaboration.configure({ document: doc }),
      CollaborationCaret.configure({
        provider: p,
        user: {
          name: currentUser.value?.name ?? "Anonymous",
          color: generateColorFromName(currentUser.value?.name ?? ""),
        },
      }),
      Placeholder.configure({
        placeholder: ({ node }) =>
          node.type.name === "heading"
            ? "Title or start writing…"
            : "Type something…",
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Subscript,
      Superscript,
      buildSlashCommandExtension(),
      AiCanvasActionsExtension,
      AiPreviewExtension,
    ],
    autofocus: false,
    editable: false,
  });

  // Phase 3: register selection listeners after the editor is created.
  nextTick(() => buildSelectionListener());
}

let setupCanvasId: string | null = null;

watch(
  () => [canvasId.value, jwtToken.value, selectedCanvas.value?.id],
  async ([id, token, loadedCanvasId]) => {
    if (!id || !token) return;

    if (loadedCanvasId !== id) {
      if (setupCanvasId && setupCanvasId !== id) {
        setupCanvasId = null;
        destroyCollabResources();
      }
      return;
    }

    if (setupCanvasId === id) return;

    destroyCollabResources();
    try {
      await canvasStore.selectCanvas(id);
    } catch {
      // Toast is shown by the global axios interceptor
    }
    await setupForCanvas(id);
    setupCanvasId = id;
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (titleSaveTimer) clearTimeout(titleSaveTimer);
  destroySelectionListeners();
  destroyCollabResources();
});

function handleDownload() {
  // TODO: implement download canvas
}

function handleMoveToTrash() {
  // TODO: implement move canvas to trash
}

function createAiCommandId(kind: string) {
  return `${kind}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function setCanvasAiCommand(kind: "canvas-summary" | "canvas-task-generation", channelId?: string) {
  const text = canvasPlainText.value.trim();
  if (!text || !selectedCanvas.value?.workspaceId) return;
  const summaryMessage =
    "Summarize this Canvas. Return the key points, decisions, action items, and open questions.";
  const taskMessage =
    "Analyze this Canvas and create a new task list with proposed tasks.";
  uiStore.setPendingAiCommand({
    id: createAiCommandId(kind),
    kind,
    message: kind === "canvas-summary" ? summaryMessage : taskMessage,
    context: {
      workspaceId: selectedCanvas.value.workspaceId,
      channelId,
      canvasId: canvasId.value,
      canvasTitle: displayTitle.value || selectedCanvas.value.title || "Canvas",
      canvasPlainText: text,
      sourceCanvasUrl: `/canvas/${canvasId.value}/edit`,
    },
  });
}

function handleAiSummary() {
  setCanvasAiCommand("canvas-summary", resolvedChannelId.value);
}

async function handleAiTaskGeneration() {
  if (selectedCanvas.value?.workspaceId && !availableChannels.value.length) {
    try {
      await channelStore.fetchUserChannels(selectedCanvas.value.workspaceId);
    } catch {
      // Global interceptor shows the error.
    }
  }
  const channelId = resolvedChannelId.value;
  if (channelId) {
    setCanvasAiCommand("canvas-task-generation", channelId);
    return;
  }
  showTaskChannelPicker.value = true;
}

function handleTaskChannelSelected(channelId: string) {
  showTaskChannelPicker.value = false;
  setCanvasAiCommand("canvas-task-generation", channelId);
}

function handleTranscriptBannerDismissed() {
  localStorage.setItem(transcriptDismissKey.value, "1");
  showTranscriptBanner.value = false;
}

function handleShare() {
  showShareDialog.value = true;
}

function mergeCanvasSuggestions(nextSuggestions: CanvasSuggestion[]) {
  const byId = new Map(canvasSuggestions.value.map((suggestion) => [suggestion.id, suggestion]));
  for (const suggestion of nextSuggestions) {
    byId.set(suggestion.id, suggestion);
  }
  canvasSuggestions.value = Array.from(byId.values()).filter((suggestion) =>
    ["pending", "applying", "failed"].includes(suggestion.status || "pending"),
  );
}

function handleCanvasSuggestionsUpdated(suggestions: CanvasSuggestion[]) {
  if (!suggestions.length) {
    canvasSuggestions.value = [];
    return;
  }
  void refreshCanvasSuggestions();
}

async function refreshCanvasSuggestions() {
  if (!canvasId.value) return;
  try {
    const suggestions = await canvasService.getCanvasSuggestions(canvasId.value);
    canvasSuggestions.value = suggestions.filter((suggestion) =>
      ["pending", "applying", "failed"].includes(suggestion.status || "pending"),
    );
  } catch {
    // Global interceptor shows the error.
  }
}

async function handleAcceptCanvasSuggestion(suggestionId: string) {
  const current = canvasSuggestions.value.find((suggestion) => suggestion.id === suggestionId);
  if (current) current.status = "applying";
  try {
    const updated = await canvasService.acceptCanvasSuggestion(canvasId.value, suggestionId);
    mergeCanvasSuggestions([updated]);
  } catch {
    await refreshCanvasSuggestions();
  }
}

async function handleRejectCanvasSuggestion(suggestionId: string) {
  try {
    const updated = await canvasService.rejectCanvasSuggestion(canvasId.value, suggestionId);
    mergeCanvasSuggestions([updated]);
  } catch {
    await refreshCanvasSuggestions();
  }
}

async function handleAcceptAllCanvasSuggestions() {
  try {
    await canvasService.acceptAllCanvasSuggestions(canvasId.value);
  } finally {
    await refreshCanvasSuggestions();
  }
}

async function handleRejectAllCanvasSuggestions() {
  try {
    await canvasService.rejectAllCanvasSuggestions(canvasId.value);
  } finally {
    await refreshCanvasSuggestions();
  }
}
</script>

<template>
  <div class="canvas-edit-view">
    <div
      class="canvas-edit-view__editor"
      :style="
        uiStore.isAiOpen ? { paddingRight: uiStore.aiSidebarWidth + 'px' } : {}
      "
    >
      <div
        v-if="!isEditorReady"
        class="canvas-edit-view__blocker"
      />
      <div
        v-if="syncStatus === 'offline' && isEditorReady"
        class="canvas-edit-view__offline-banner"
      >
        Editing offline - the sync server is not connected.
      </div>
      <TranscriptBanner
        v-if="showTranscriptBanner"
        @dismissed="handleTranscriptBannerDismissed"
      />
      <RichEditor
        v-if="editor"
        :editor="editor"
        :read-only="editorReadOnly"
        :title="displayTitle"
        :viewers="onlineUsers"
        :current-user="currentUser"
        :save-status="displaySaveStatus"
        :slash-menu="slashMenu"
        :ai-writer-bar="aiWriterBar"
        :selection-ai-icon="selectionAiIcon"
        :canvas-plain-text="canvasPlainText"
        :canvas-suggestions="canvasSuggestions"
        :ai-actions-disabled="aiActionsDisabled"
        @update:title="onTitleUpdate"
        @download="handleDownload"
        @move-to-trash="handleMoveToTrash"
        @ai-summary="handleAiSummary"
        @ai-task-generation="handleAiTaskGeneration"
        @share="handleShare"
        @preview-start="handlePreviewStart"
        @preview-chunk="handlePreviewChunk"
        @preview-done="handlePreviewDone"
        @accept="handleAccept"
        @reject="handleReject"
        @ai-close="handleAiWriterClose"
        @selection-icon-click="handleSelectionIconClick"
        @accept-canvas-suggestion="handleAcceptCanvasSuggestion"
        @reject-canvas-suggestion="handleRejectCanvasSuggestion"
        @accept-all-canvas-suggestions="handleAcceptAllCanvasSuggestions"
        @reject-all-canvas-suggestions="handleRejectAllCanvasSuggestions"
      />
      <CanvasShareDialog
        :open="showShareDialog"
        :canvas-id="canvasId"
        :canvas-title="displayTitle"
        :workspace-id="shareWorkspaceId"
        :owner="selectedCanvasOwner"
        :current-user="currentUser"
        :channels="availableChannels"
        @close="showShareDialog = false"
      />
    </div>
    <AiChatSidebar
      ref="aiChatSidebarRef"
      v-model:open="uiStore.isAiOpen"
      :context="aiCanvasContext"
      @canvas-suggestions-updated="handleCanvasSuggestionsUpdated"
    />
    <div
      v-if="showTaskChannelPicker"
      class="canvas-channel-picker"
    >
      <div class="canvas-channel-picker__panel">
        <div class="canvas-channel-picker__title">
          Choose target channel
        </div>
        <button
          v-for="channel in availableChannels"
          :key="channel.id"
          type="button"
          class="canvas-channel-picker__item"
          @click="handleTaskChannelSelected(channel.id)"
        >
          #{{ channel.name || channel.title || "Channel" }}
        </button>
        <button
          type="button"
          class="canvas-channel-picker__cancel"
          @click="showTaskChannelPicker = false"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.canvas-edit-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: white;
}

.canvas-edit-view__blocker {
  position: absolute;
  inset: 0;
  z-index: 10;
  cursor: wait;
  pointer-events: all;
}

.canvas-edit-view__offline-banner {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 5;
  padding: 8px 16px;
  background: #fef3c7;
  color: #92400e;
  font-size: 13px;
  text-align: center;
}

.canvas-edit-view__editor {
  flex: 1;
  position: relative;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.canvas-edit-view__editor :deep(.rte) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.canvas-edit-view__editor :deep(.content) {
  flex: 1;
}

.canvas-channel-picker {
  position: fixed;
  inset: 0;
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.32);
}

.canvas-channel-picker__panel {
  width: min(360px, calc(100vw - 32px));
  max-height: min(460px, calc(100vh - 48px));
  overflow: auto;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 16px 48px rgba(15, 23, 42, 0.18);
  padding: 12px;
}

.canvas-channel-picker__title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 8px;
}

.canvas-channel-picker__item,
.canvas-channel-picker__cancel {
  width: 100%;
  border: 0;
  border-radius: 7px;
  background: transparent;
  padding: 9px 10px;
  text-align: left;
  font-size: 13px;
  color: #0f172a;
  cursor: pointer;
}

.canvas-channel-picker__item:hover {
  background: #f1f5f9;
}

.canvas-channel-picker__cancel {
  margin-top: 6px;
  text-align: center;
  color: #64748b;
  background: #f8fafc;
}
</style>
