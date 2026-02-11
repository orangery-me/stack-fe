<script setup lang="ts">
import { watch, onBeforeUnmount, ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useEditor } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

import { useCanvasStore } from "@/modules/channels/stores/canvas.store.js";

import { canvasToTiptap } from "@/helpers/canvas.helper";
import LoadingSkeleton from "@/components/LoadingSkeleton.vue";
import RichEditor from "@/components/editor/RichEditor.vue";
import { requestCanvas } from "@/modules/channels/queries/canvas.queries";
import { useQueryClient } from "@tanstack/vue-query";

const router = useRouter();
const canvasStore = useCanvasStore();
const queryClient = useQueryClient();

const props = defineProps<{
  canvasId: string;
  channelId: string;
}>();

const {
  data: selectedCanvas,
  isLoading,
} = requestCanvas({
  canvasId: computed(() => props.canvasId),
  staleTime: 5 * 60 * 1000, // 5 minutes
});

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
    const canvasId = selectedCanvas.value?.id;
    if (!canvasId) return;
    canvasStore.updateCanvasTitle(canvasId, value);
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
  // update khi editor hoặc canvas thay đổi
  [() => editor.value, () => selectedCanvas.value],
  ([editorInstance, canvas]) => {
    if (!editorInstance || !canvas) return;

    const raw = canvas.content ?? canvas.initialContent;
    if (!raw) return;

    editorInstance.commands.setContent(
      canvasToTiptap(typeof raw === 'string' ? JSON.parse(raw) : raw),
      false
    );
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
  if (!selectedCanvas.value?.id)
    return;

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
  if (saveTimer) clearTimeout(saveTimer);
  if (titleSaveTimer) clearTimeout(titleSaveTimer);
  editor.value?.destroy();
});
</script>

<template>
  <div class="canvas-tab-root">
    <div
      v-if="isLoading"
      class="canvas-tab-root__skeleton"
    >
      <LoadingSkeleton :line-widths="['85%', '55%', '70%']" />
    </div>
    <div
      v-else
      class="canvas-editor"
    >
      <RichEditor
        v-if="editor"
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
