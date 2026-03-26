<script setup lang="ts">
import { watch, onBeforeUnmount, ref, computed, shallowRef } from "vue";
import { useRouter } from "vue-router";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import * as Y from "yjs";
import Collaboration from "@tiptap/extension-collaboration";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { Editor } from "@tiptap/vue-3";

import { useCanvasStore } from "@/modules/channels/stores/canvas.store.js";
import { useAuthStore } from "@/modules/auth/stores/auth.store.js";
import AppLoading from "@/components/loading/AppLoading.vue";
import RichEditor from "@/components/editor/RichEditor.vue";
import { requestCanvas } from "@/modules/channels/queries/canvas.queries";
import { useQueryClient } from "@tanstack/vue-query";

const SYNC_READY_TIMEOUT_MS = 10_000;

const router = useRouter();
const canvasStore = useCanvasStore();
const authStore = useAuthStore();
const queryClient = useQueryClient();

const props = defineProps<{
  canvasId: string;
  channelId: string;
}>();

const { data: selectedCanvas, isLoading } = requestCanvas({
  canvasId: computed(() => props.canvasId),
  staleTime: 5 * 60 * 1000, // 5 minutes
});

let titleSaveTimer: ReturnType<typeof setTimeout> | undefined;

const displayTitle = ref("");

watch(
  () => selectedCanvas.value?.title,
  (t) => {
    displayTitle.value = t ?? "New page";
  },
  { immediate: true }
);

function onTitleUpdate(value: string) {
  displayTitle.value = value;
  if (titleSaveTimer) clearTimeout(titleSaveTimer);
  titleSaveTimer = setTimeout(() => {
    const canvasId = selectedCanvas.value?.id;
    if (!canvasId) return;
    canvasStore.updateCanvasTitle(canvasId, value);
    titleSaveTimer = undefined;
  }, 500);
}

// ======== Current user (for awareness) =========

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

const jwtToken = computed(() => authStore.accessToken);

// ======== Yjs (read-only) =========

const ydoc = shallowRef<Y.Doc | null>(null);
const provider = shallowRef<HocuspocusProvider | null>(null);
const editor = shallowRef<Editor | null>(null);

const isEditorReady = ref(false);
const syncStatus = ref<"connecting" | "synced" | "offline">("connecting");
let syncReadyTimeoutId: ReturnType<typeof setTimeout> | undefined;

const onlineUsers = ref<
  Array<{ userId: string; name: string; avatar: string | null; color: string }>
>([]);

function generateColorFromName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 72% 50%)`;
}

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
      color: user.color ?? generateColorFromName(user.name ?? ""),
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
    console.error("[CanvasTabView] Failed to destroy editor:");
  }
  editor.value = null;

  try {
    provider.value?.destroy();
  } catch {
    console.error("[CanvasTabView] Failed to destroy provider:");
  }
  provider.value = null;

  try {
    ydoc.value?.destroy();
  } catch {
    console.error("[CanvasTabView] Failed to destroy ydoc:");
  }
  ydoc.value = null;
  onlineUsers.value = [];
}

function setupForCanvas(id: string) {
  const doc = new Y.Doc();
  const p = new HocuspocusProvider({
    url: "ws://localhost:1234",
    name: id,
    document: doc,
    token: jwtToken.value,
  });

  ydoc.value = doc;
  provider.value = p;

  p.on("disconnect", () => {
    syncStatus.value = "offline";
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

  function setEditorReady() {
    if (syncReadyTimeoutId) {
      clearTimeout(syncReadyTimeoutId);
      syncReadyTimeoutId = undefined;
    }
    isEditorReady.value = true;
  }

  p.on("synced", () => {
    syncStatus.value = "synced";
    setEditorReady();
  });

  syncReadyTimeoutId = setTimeout(() => {
    syncReadyTimeoutId = undefined;
    if (isEditorReady.value) return;
    syncStatus.value = "offline";
    setEditorReady();
  }, SYNC_READY_TIMEOUT_MS);

  const e = new Editor({
    extensions: [
      StarterKit,
      Collaboration.configure({ document: doc }),
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
  () => [props.canvasId, jwtToken.value],
  async ([id, token]) => {
    if (!id || !token) return;

    destroyCollabResources();

    try {
      await canvasStore.selectCanvas(id);
    } catch {
      // Toast is shown by the global axios interceptor
    }

    setupForCanvas(id);
  },
  { immediate: true }
);

function openEditInNewTab() {
  const canvasId = selectedCanvas.value?.id;
  if (!canvasId) return;
  const resolved = router.resolve({
    name: "canvasEdit",
    params: { canvasId },
  });
  const url = `${window.location.origin}${resolved.href}`;
  window.open(url, "_blank");
}

async function handleReload() {
  if (!selectedCanvas.value?.id) return;
  queryClient.invalidateQueries({
    queryKey: ["canvas", props.canvasId],
  });
}

function handleDownload() {
  // TODO: implement download canvas
}

function handleMoveToTrash() {
  // TODO: implement move canvas to trash
}

onBeforeUnmount(() => {
  if (titleSaveTimer) clearTimeout(titleSaveTimer);
  destroyCollabResources();
});
</script>

<template>
  <div class="canvas-tab-root">
    <div v-if="isLoading" class="canvas-tab-root__skeleton">
      <AppLoading
        :active="true"
        variant="inline"
        label="Loading…"
        min-height="160px"
      />
    </div>
    <div v-else class="canvas-editor">
      <div v-if="!isEditorReady" class="canvas-tab-root__blocker" />
      <div
        v-if="syncStatus === 'offline' && isEditorReady"
        class="canvas-tab-root__offline-banner"
      >
        Đang xem offline – máy chủ đồng bộ chưa kết nối.
      </div>
      <RichEditor
        v-if="editor"
        :editor="editor"
        :read-only="true"
        :title="displayTitle"
        :viewers="onlineUsers"
        :current-user="currentUser"
        :save-status="'saved'"
        @update:title="onTitleUpdate"
        @edit="openEditInNewTab"
        @reload="handleReload"
        @download="handleDownload"
        @move-to-trash="handleMoveToTrash"
      />
    </div>
  </div>
</template>

<style scoped lang="scss" src="./CanvasTabView.scss"></style>
