<script setup lang="ts">
import { watch, onBeforeUnmount, ref } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { useEditor } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

import { useCanvasStore } from "@/modules/channels/stores/canvas.store";
import { useWorkspaceStore } from "@/modules/workspaces/stores/workspace.store";
import { useChannelStore } from "@/modules/channels/stores/channel.store";

import { canvasToTiptap } from "@/helpers/canvas.helper";
import LoadingSkeleton from "@/components/LoadingSkeleton.vue";
import RichEditor from "@/components/editor/RichEditor.vue";

const router = useRouter();
const canvasStore = useCanvasStore();
const workspaceStore = useWorkspaceStore();
const channelStore = useChannelStore();

const { selectedCanvas, selectedCanvasLoading } = storeToRefs(canvasStore);
const { workspaceDetail: workspace } = storeToRefs(workspaceStore);
const { selectedChannel: channel } = storeToRefs(channelStore);

let saveTimer: ReturnType<typeof setTimeout> | undefined;
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
    const wId = workspace.value?.id;
    const cId = channel.value?.id;
    const canvasId = selectedCanvas.value?.id;
    if (!wId || !cId || !canvasId) return;
    canvasStore.updateCanvasTitle(wId, cId, canvasId, value);
    titleSaveTimer = undefined;
  }, 500);
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
});

/**
 * Load canvas content vào editor.
 */
watch(
  () => ({
    id: selectedCanvas.value?.id,
    content:
      selectedCanvas.value?.content ?? selectedCanvas.value?.initialContent,
  }),
  () => {
    const raw =
      selectedCanvas.value?.content ?? selectedCanvas.value?.initialContent;

    if (!raw || !editor.value) return;

    try {
      const canvasContent = typeof raw === "string" ? JSON.parse(raw) : raw;
      editor.value.commands.setContent(canvasToTiptap(canvasContent));
    } catch {
      editor.value.commands.clearContent();
    }
  },
  { immediate: true, deep: true }
);

function openEditInNewTab() {
  const wId = workspace.value?.id;
  const cId = channel.value?.id;
  const canvasId = selectedCanvas.value?.id;
  if (!wId || !cId || !canvasId) return;
  const resolved = router.resolve({
    name: "canvasEdit",
    params: { workspaceId: wId, channelId: cId, canvasId },
  });
  const url = `${window.location.origin}${resolved.href}`;
  window.open(url, "_blank");
}

async function handleReload() {
  if (!workspace.value?.id || !channel.value?.id || !selectedCanvas.value?.id)
    return;
  await canvasStore.selectCanvas(
    workspace.value.id,
    channel.value.id,
    selectedCanvas.value.id
  );
}

function handleDownload() {
  // TODO: implement download canvas
}

function handleMoveToTrash() {
  // TODO: implement move canvas to trash
}

onBeforeUnmount(() => {
  if (saveTimer) clearTimeout(saveTimer);
  if (titleSaveTimer) clearTimeout(titleSaveTimer);
  editor.value?.destroy();
});
</script>

<template>
  <div class="canvas-tab-root">
    <div v-if="selectedCanvasLoading" class="canvas-tab-root__skeleton">
      <LoadingSkeleton :line-widths="['85%', '55%', '70%']" />
    </div>
    <div v-else class="canvas-editor">
      <RichEditor
        :editor="editor"
        :read-only="true"
        :title="displayTitle"
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
