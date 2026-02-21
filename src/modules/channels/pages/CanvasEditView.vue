<script setup lang="ts">
import { watch, onBeforeUnmount, onMounted, ref, computed } from "vue";
import { useEditor } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { canvasToTiptap, tiptapToCanvas } from "@/helpers/canvas.helper";
import LoadingSkeleton from "@/components/LoadingSkeleton.vue";
import RichEditor from "@/components/editor/RichEditor.vue";
import { requestCanvas } from "../queries/canvas.queries";
import { useCanvasStore } from "../stores/canvas.store";
import { useAuthStore } from "@/modules/auth/stores/auth.store.js";
import { useRoute } from "vue-router";
import { useQueryClient } from "@tanstack/vue-query";
import socketHelper from "@/helpers/socket.helper";

const canvasStore = useCanvasStore();
const authStore = useAuthStore();
const route = useRoute();
const queryClient = useQueryClient();
const canvasId = computed(() => route.params.canvasId as string);

const { data: selectedCanvas, isLoading } = requestCanvas({
  canvasId: computed(() => canvasId.value),
  staleTime: 5 * 60 * 1000, // 5 minutes
});

const loading = ref(true);
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let syncThrottleTimer: ReturnType<typeof setTimeout> | undefined;
let titleSaveTimer: ReturnType<typeof setTimeout> | undefined;
let titleSyncThrottleTimer: ReturnType<typeof setTimeout> | undefined;
let isProgrammaticUpdate = false;
let lastPendingDoc: any = null;
const SYNC_THROTTLE_MS = 100;
const SAVE_DEBOUNCE_MS = 2500;
const TITLE_SYNC_THROTTLE_MS = 100;
const TITLE_SAVE_DEBOUNCE_MS = 1000;

const displayTitle = ref("");
const onlineUsers = ref<
  Array<{ userId: string; name: string; avatar: string | null }>
>([]);
const lastLocalContentSignature = ref<string | null>(null);

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

// Title: TanStack Query (selectedCanvas) is source of truth; fallback to store for fast load when opening from list
watch(
  () => [
    selectedCanvas.value?.title,
    canvasId.value,
    canvasStore.canvases,
  ],
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
  { immediate: true }
);

/** Sync title as-is so others see exactly what is being typed (including empty or spaces). */
function syncTitle(value: string) {
  if (!selectedCanvas.value?.id) return;
  socketHelper.emit("sync_canvas_title", {
    canvasId: selectedCanvas.value.id,
    title: value,
  });
}

function onTitleUpdate(value: string) {
  displayTitle.value = value;
  if (titleSyncThrottleTimer) return;
  titleSyncThrottleTimer = setTimeout(() => {
    titleSyncThrottleTimer = undefined;
    syncTitle(displayTitle.value);
  }, TITLE_SYNC_THROTTLE_MS);
  // Persist after 1s idle
  if (titleSaveTimer) clearTimeout(titleSaveTimer);
  titleSaveTimer = setTimeout(async () => {
    if (!selectedCanvas.value?.id) return;
    titleSaveTimer = undefined;
    const canvasId = selectedCanvas.value.id;
    const title = displayTitle.value.trim() || "New page";
    try {
      await socketHelper.emit("edit_canvas_title", { canvasId, title });
    } catch (error) {
      console.error(
        "[CanvasEditView] Failed to update title via WebSocket, fallback to REST:",
        error
      );
      canvasStore.updateCanvasTitle(canvasId, title).catch(console.error);
    }
  }, TITLE_SAVE_DEBOUNCE_MS);
}

const editor = useEditor({
  extensions: [
    StarterKit,
    Placeholder.configure({
      placeholder: ({ node }) => {
        if (node.type.name === "heading") {
          return "Title or start writing…";
        }
        return "Type something…";
      },
    }),
  ],
  autofocus: true,
  content: null,
  onUpdate({ editor }) {
    if (isProgrammaticUpdate) return;
    const doc = editor.getJSON();
    lastPendingDoc = doc;
    throttledSync(doc);
    debouncedSave(doc);
  },
});

onMounted(async () => {
  try {
    await Promise.all([canvasStore.selectCanvas(canvasId.value)]);

    // Connect to canvas namespace
    await socketHelper.connect("/canvas", { enableLogging: true });

    // Đăng ký listener trước khi join để nhận ngay canvas_edit_page_users khi reload
    setupSocketListeners();

    await socketHelper.emit("join_canvas_edit_page", {
      canvasId: canvasId.value,
    });
  } catch (error) {
    console.error("[CanvasEditView] Failed to setup WebSocket:", error);
  } finally {
    loading.value = false;
  }
});

function loadContentIntoEditor() {
  const raw =
    selectedCanvas.value?.content ?? selectedCanvas.value?.initialContent;
  if (!raw || !editor.value) return;
  try {
    const canvasContent = typeof raw === "string" ? JSON.parse(raw) : raw;
    isProgrammaticUpdate = true;
    editor.value.commands.setContent(canvasToTiptap(canvasContent));
    isProgrammaticUpdate = false;
  } catch {
    editor.value.commands.clearContent();
  }
}

watch(() => selectedCanvas.value?.id, loadContentIntoEditor, {
  immediate: true,
});
watch(editor, loadContentIntoEditor, { immediate: true });

// WebSocket event handlers
function handleCanvasDataUpdate({ canvas }: { canvas: any }) {
  if (!editor.value || canvas.id !== canvasId.value) return;

  const raw = canvas.content ?? canvas.initialContent;
  if (!raw) return;

  try {
    const canvasContent = typeof raw === "string" ? JSON.parse(raw) : raw;
    const incomingSignature = JSON.stringify(canvasContent);

    // Update query cache
    queryClient.setQueryData(["canvas", canvasId.value], canvas);

    // If server echoed our own latest edit, avoid resetting cursor/selection by skipping setContent.
    if (
      lastLocalContentSignature.value &&
      lastLocalContentSignature.value === incomingSignature
    ) {
      lastLocalContentSignature.value = null;
      return;
    }

    // Update editor with isProgrammaticUpdate flag to avoid triggering onUpdate
    isProgrammaticUpdate = true;
    editor.value.commands.setContent(canvasToTiptap(canvasContent));
    isProgrammaticUpdate = false;
  } catch (error) {
    console.error(
      "[CanvasEditView] Failed to update editor from socket:",
      error
    );
  }
}

function handleUsersUpdate({
  users,
}: {
  users: Array<{ userId: string; name: string; avatar: string | null }>;
}) {
  onlineUsers.value = users;
}

function handleSocketError({ message }: { message: string }) {
  console.error("[CanvasEditView] WebSocket error:", message);
  // TODO: Could show notification to user
}

function handleCanvasTitleUpdate({
  canvasId: id,
  title,
}: {
  canvasId: string;
  title: string;
}) {
  queryClient.setQueryData(["canvas", id], (old: any) =>
    old ? { ...old, title } : old
  );
  canvasStore.applyCanvasTitleFromSocket(id, title);
  if (id === canvasId.value) {
    displayTitle.value = title;
  }
}

function setupSocketListeners() {
  socketHelper.on("canvas_data", handleCanvasDataUpdate);
  socketHelper.on("canvas_title", handleCanvasTitleUpdate);
  socketHelper.on("canvas_edit_page_users", handleUsersUpdate);
  socketHelper.on("error", handleSocketError);
}

function throttledSync(doc: any) {
  if (syncThrottleTimer) return;
  syncThrottleTimer = setTimeout(() => {
    syncThrottleTimer = undefined;
    const latestDoc = editor.value?.getJSON() ?? lastPendingDoc ?? doc;
    syncContent(latestDoc);
  }, SYNC_THROTTLE_MS);
}

function syncContent(doc: any) {
  if (!selectedCanvas.value?.id) return;
  const canvasContent = tiptapToCanvas(doc);
  lastLocalContentSignature.value = JSON.stringify(canvasContent);
  socketHelper.emit("sync_canvas", {
    canvasId: selectedCanvas.value.id,
    content: canvasContent,
  });
}

function debouncedSave(doc: any) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveContent(doc);
    saveTimer = undefined;
  }, SAVE_DEBOUNCE_MS);
}

async function saveContent(doc: any) {
  if (!selectedCanvas.value?.id) return;

  const canvasContent = tiptapToCanvas(doc);
  // Track signature so we can ignore the server echo and keep cursor position.
  lastLocalContentSignature.value = JSON.stringify(canvasContent);

  try {
    await socketHelper.emit("edit_canvas", {
      canvasId: selectedCanvas.value.id,
      content: canvasContent,
    });
  } catch (error) {
    console.error("[CanvasEditView] Failed to save via WebSocket:", error);
    // await canvasStore.saveCanvasContent(selectedCanvas.value.id, canvasContent);
  }
}

function handleDownload() {
  // TODO: implement download canvas
}

function handleMoveToTrash() {
  // TODO: implement move canvas to trash
}

onBeforeUnmount(() => {
  // Remove socket listeners
  socketHelper.off("canvas_data", handleCanvasDataUpdate);
  socketHelper.off("canvas_title", handleCanvasTitleUpdate);
  socketHelper.off("canvas_edit_page_users", handleUsersUpdate);
  socketHelper.off("error", handleSocketError);

  // Leave canvas room
  if (canvasId.value) {
    socketHelper
      .emit("leave_canvas_edit_page", {
        canvasId: canvasId.value,
      })
      .catch(console.error);
  }

  // Flush pending save so we don't lose unsaved content
  if (saveTimer !== undefined) {
    clearTimeout(saveTimer);
    saveTimer = undefined;
    if (lastPendingDoc != null && selectedCanvas.value?.id) {
      saveContent(lastPendingDoc);
    }
  }
  if (syncThrottleTimer) clearTimeout(syncThrottleTimer);
  if (titleSaveTimer) clearTimeout(titleSaveTimer);
  if (titleSyncThrottleTimer) clearTimeout(titleSyncThrottleTimer);
  editor.value?.destroy();
});
</script>

<template>
  <div class="canvas-edit-view">
    <div v-if="isLoading" class="canvas-edit-view__skeleton">
      <LoadingSkeleton :line-widths="['85%', '55%', '70%']" />
    </div>
    <div v-else class="canvas-edit-view__editor">
      <RichEditor
        :editor="editor"
        :read-only="false"
        :title="displayTitle"
        :viewers="onlineUsers"
        :current-user="currentUser"
        @update:title="onTitleUpdate"
        @download="handleDownload"
        @move-to-trash="handleMoveToTrash"
      />
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

.canvas-edit-view__skeleton {
  padding: 24px;
  flex: 1;
}

.canvas-edit-view__editor {
  flex: 1;
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
</style>
