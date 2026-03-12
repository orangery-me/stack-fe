<script setup lang="ts">
import { watch, onBeforeUnmount, ref, computed, shallowRef } from "vue";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import RichEditor from "@/components/editor/RichEditor.vue";
import { requestCanvas } from "../queries/canvas.queries";
import { useCanvasStore } from "../stores/canvas.store";
import { useAuthStore } from "@/modules/auth/stores/auth.store.js";
import { useRoute } from "vue-router";
import { useQueryClient } from "@tanstack/vue-query";
import * as Y from "yjs";
import Collaboration from "@tiptap/extension-collaboration";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { Editor } from "@tiptap/vue-3";
import { useLoading } from "@/composables/useLoading.js";

const TITLE_SAVE_DEBOUNCE_MS = 1000;
const SYNC_READY_TIMEOUT_MS = 10_000;

const canvasStore = useCanvasStore();
const authStore = useAuthStore();
const route = useRoute();
const queryClient = useQueryClient();
const canvasId = computed(() => route.params.canvasId as string);
const { showFullscreen, hideFullscreen } = useLoading();

// ======== Title =========
const { data: selectedCanvas, isLoading } = requestCanvas({
  canvasId: computed(() => canvasId.value),
  staleTime: 5 * 60 * 1000, // 5 minutes
});

const displayTitle = ref("");
let titleSaveTimer: ReturnType<typeof setTimeout> | undefined;

watch(
  () => isLoading.value,
  (loading) => {
    if (loading) {
      showFullscreen();
    } else {
      hideFullscreen();
    }
  },
  { immediate: true }
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
  { immediate: true }
);

function onTitleUpdate(value: string) {
  displayTitle.value = value;
  if (titleSaveTimer) clearTimeout(titleSaveTimer);
  titleSaveTimer = setTimeout(async () => {
    if (!selectedCanvas.value?.id) return;
    titleSaveTimer = undefined;
    const id = selectedCanvas.value.id;
    const title = displayTitle.value.trim() || "New page";
    try {
      const updated = await canvasStore.updateCanvasTitle(id, title);
      if (updated) {
        queryClient.setQueryData(["canvas", id], updated);
      }
    } catch (error) {
      console.error("[CanvasEditView] Failed to update title:", error);
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

// ======== Yjs reactive lifecycle =========

const ydoc = shallowRef<Y.Doc | null>(null);
const provider = shallowRef<HocuspocusProvider | null>(null);
const editor = shallowRef<Editor | null>(null);

const isEditorReady = ref(false); // true khi provider sync xong hoặc timeout
const syncStatus = ref<"connecting" | "synced" | "offline">("connecting");
let syncReadyTimeoutId: ReturnType<typeof setTimeout> | undefined;

const onlineUsers = ref<
  Array<{ userId: string; name: string; avatar: string | null }>
>([]);

const saveStatus = ref<"saved" | "saving">("saved");
const hadChangesSinceLastSaved = ref(false);

const displaySaveStatus = computed<"saved" | "saving">(() =>
  saveStatus.value === "saving" || hadChangesSinceLastSaved.value
    ? "saving"
    : "saved"
);

const jwtToken = computed(() => {
  return authStore.accessToken;
});

// helper: map awareness states -> online users
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
}

function setupForCanvas(id: string) {
  // 1. create ydoc
  const doc = new Y.Doc();
  const p = new HocuspocusProvider({
    url: "ws://localhost:1234",
    name: id,
    document: doc,
    token: jwtToken.value,
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

  // Khi có thay đổi nhưng chưa sync lên server
  p.on("unsyncedChanges", ({ number: count }: { number: number }) => {
    if (count > 0 && isEditorReady.value) {
      saveStatus.value = "saving";
      hadChangesSinceLastSaved.value = true;
    }
  });

  // Khi server sync xong và trả về event "canvasSaved"
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

  // 2. awareness user
  const me = currentUser.value;
  p.awareness.setLocalStateField("user", {
    userId: me?.userId ?? "",
    name: me?.name ?? "",
    avatar: me?.avatar ?? null,
    email: me?.email ?? "",
  });

  p.awareness.on("change", refreshOnlineUsers);
  refreshOnlineUsers();

  // 3. sync state: cho edit khi synced HOẶC sau timeout (server không chạy / MongoDB lỗi)
  isEditorReady.value = false;
  syncStatus.value = "connecting";

  function setEditorReady() {
    if (syncReadyTimeoutId) {
      clearTimeout(syncReadyTimeoutId);
      syncReadyTimeoutId = undefined;
    }
    isEditorReady.value = true;
    editor.value?.setEditable(true);
    saveStatus.value = "saved";
    hadChangesSinceLastSaved.value = false;
  }

  p.on("synced", () => {
    syncStatus.value = "synced";
    setEditorReady();
  });

  syncReadyTimeoutId = setTimeout(() => {
    syncReadyTimeoutId = undefined;
    if (isEditorReady.value) return;
    console.warn(
      "[CanvasEditView] Sync timeout – enabling editor (offline mode)"
    );
    syncStatus.value = "offline";
    setEditorReady();
  }, SYNC_READY_TIMEOUT_MS);

  // 4. create editor bound to ydoc
  const e = new Editor({
    extensions: [
      StarterKit,
      Collaboration.configure({
        document: doc,
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === "heading") {
            return "Title or start writing…";
          }
          return "Type something…";
        },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Subscript,
      Superscript,
    ],
    autofocus: false,
    editable: false,
  });

  editor.value = e;
}

watch(
  () => [canvasId.value, jwtToken.value, currentUser.value?.userId],
  async ([id, token]) => {
    // Chỉ khởi tạo collab khi đã có canvasId và accessToken
    if (!id || !token) return;

    destroyCollabResources();

    try {
      await canvasStore.selectCanvas(id);
    } catch (error) {
      console.error("[CanvasEditView] Failed to select canvas:", error);
    }

    setupForCanvas(id);
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  if (titleSaveTimer) clearTimeout(titleSaveTimer);
  destroyCollabResources();
});

function handleDownload() {
  // TODO: implement download canvas
}

function handleMoveToTrash() {
  // TODO: implement move canvas to trash
}
</script>

<template>
  <div class="canvas-edit-view">
    <div class="canvas-edit-view__editor">
      <div
        v-if="!isEditorReady"
        class="canvas-edit-view__blocker"
      />
      <div
        v-if="syncStatus === 'offline' && isEditorReady"
        class="canvas-edit-view__offline-banner"
      >
        Đang chỉnh sửa offline – máy chủ đồng bộ chưa kết nối.
      </div>
      <RichEditor
        :editor="editor"
        :read-only="!isEditorReady"
        :title="displayTitle"
        :viewers="onlineUsers"
        :current-user="currentUser"
        :save-status="displaySaveStatus"
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

.canvas-edit-view__blocker {
  position: absolute;
  inset: 0;
  z-index: 10;
  cursor: wait;
  pointer-events: all; // chặn click vào editor
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
</style>
