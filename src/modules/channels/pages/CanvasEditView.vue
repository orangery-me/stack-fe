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
import { useRoute } from "vue-router";

const canvasStore = useCanvasStore();
const route = useRoute();
const canvasId = computed(() => route.params.canvasId as string);
// const props = defineProps<{
//   canvasId: string;
// }>();

const { data: selectedCanvas, isLoading } = requestCanvas({
  canvasId: computed(() => canvasId.value),
  staleTime: 5 * 60 * 1000, // 5 minutes
});

const loading = ref(true);
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let titleSaveTimer: ReturnType<typeof setTimeout> | undefined;
let isProgrammaticUpdate = false;

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
    if (!selectedCanvas.value?.id) return;
    canvasStore.updateCanvasTitle(selectedCanvas.value.id, value);
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
  onUpdate({ editor }) {
    if (isProgrammaticUpdate) return;
    debouncedSave(editor.getJSON());
  },
});

onMounted(async () => {
  try {
    await Promise.all([canvasStore.selectCanvas(canvasId.value)]);
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

function debouncedSave(doc: any) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveContent(doc);
    saveTimer = undefined;
  }, 800);
}

async function saveContent(doc: any) {
  if (!selectedCanvas.value?.id) return;

  const canvasContent = tiptapToCanvas(doc);

  await canvasStore.saveCanvasContent(selectedCanvas.value.id, canvasContent);
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
  <div class="canvas-edit-view">
    <div
      v-if="loading || isLoading"
      class="canvas-edit-view__skeleton"
    >
      <LoadingSkeleton :line-widths="['85%', '55%', '70%']" />
    </div>
    <div
      v-else
      class="canvas-edit-view__editor"
    >
      <RichEditor
        :editor="editor"
        :read-only="false"
        :title="displayTitle"
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
