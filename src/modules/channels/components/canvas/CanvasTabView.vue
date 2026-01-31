<script setup lang="ts">
import { watch, onBeforeUnmount } from "vue";
import { storeToRefs } from "pinia";
import { useEditor, EditorContent } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

import { useCanvasStore } from "@/modules/channels/stores/canvas.store";
import { useWorkspaceStore } from "@/modules/workspaces/stores/workspace.store";
import { useChannelStore } from "@/modules/channels/stores/channel.store";

import { canvasToTiptap, tiptapToCanvas } from "@/helpers/canvas.helper";
import LoadingSkeleton from "@/components/LoadingSkeleton.vue";

const canvasStore = useCanvasStore();
const workspaceStore = useWorkspaceStore();
const channelStore = useChannelStore();

const { selectedCanvas, selectedCanvasLoading } = storeToRefs(canvasStore);
const { workspaceDetail: workspace } = storeToRefs(workspaceStore);
const { selectedChannel: channel } = storeToRefs(channelStore);

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let isProgrammaticUpdate = false;

const editor = useEditor({
  extensions: [
    StarterKit,
    Placeholder.configure({
      placeholder: ({ node }) => {
        // Heading (dòng title) dùng placeholder riêng
        if (node.type.name === "heading") {
          return "Title or start writing…";
        }
        // Các block còn lại giữ placeholder mặc định
        return "Type something…";
      },
    }),
  ],
  autofocus: true,
  content: null,
  onUpdate({ editor }) {
    if (isProgrammaticUpdate) return;
    debouncedSave(editor.getJSON());
  },
});

/**
 * Load canvas content vào editor
 */
watch(
  () => selectedCanvas.value?.id,
  () => {
    const raw =
      selectedCanvas.value?.content ?? selectedCanvas.value?.initialContent;

    if (!raw || !editor.value) return;

    try {
      const canvasContent = typeof raw === "string" ? JSON.parse(raw) : raw;
      // chặn auto save khi load canvas content vào editor
      isProgrammaticUpdate = true;
      editor.value.commands.setContent(canvasToTiptap(canvasContent));
      isProgrammaticUpdate = false;
    } catch {
      editor.value.commands.clearContent();
    }
  },
  { immediate: true }
);

/**
 * Lưu nội dung canvas với debounce
 */
function debouncedSave(doc: any) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveContent(doc);
    saveTimer = undefined;
  }, 800);
}

async function saveContent(doc: any) {
  const canvasIdAtSaveTime = selectedCanvas.value?.id;

  if (!workspace.value?.id || !channel.value?.id || !selectedCanvas.value?.id)
    return;

  const canvasContent = tiptapToCanvas(doc);

  await canvasStore.saveCanvasContent(
    workspace.value.id,
    channel.value.id,
    canvasIdAtSaveTime,
    canvasContent
  );
}

onBeforeUnmount(() => {
  if (saveTimer) clearTimeout(saveTimer);
  editor.value?.destroy();
});
</script>

<template>
  <div class="canvas-tab-root">
    <div
      v-if="selectedCanvasLoading"
      class="canvas-tab-root__skeleton"
    >
      <LoadingSkeleton :line-widths="['85%', '55%', '70%']" />
    </div>
    <div
      v-else
      class="canvas-editor"
    >
      <EditorContent :editor="editor" />
    </div>
  </div>
</template>

<style scoped lang="scss" src="./CanvasTabView.scss"></style>
