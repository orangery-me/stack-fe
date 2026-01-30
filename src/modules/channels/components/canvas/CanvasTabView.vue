<!-- <script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from "vue";
import { storeToRefs } from "pinia";
import { useCanvasStore } from "@/modules/channels/stores/canvas.store";
import { useWorkspaceStore } from "@/modules/workspaces/stores/workspace.store.js";
import { useChannelStore } from "@/modules/channels/stores/channel.store.js";
import CanvasBlockComponent from "./components/CanvasBlock.vue";
import type {
  CanvasBlock,
  CanvasBlockType,
  CanvasContent,
  RawCanvasBlock,
  CanvasBlockComponentRef,
} from "@/modules/channels/types";

const BLOCK_TYPES: CanvasBlockType[] = [
  "paragraph",
  "heading1",
  "heading2",
  "heading3",
];

function generateId(): string {
  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Parse CanvasContent từ string | object thành CanvasContent (do API trả về string)
 */
function normalizeContent(content: unknown): CanvasContent {
  if (!content) return { version: 1, blocks: [] };
  // Nếu content là string, parse thành CanvasContent
  if (typeof content === "string") {
    try {
      const parsed = JSON.parse(content) as
        | CanvasContent
        | { blocks?: unknown[]; version?: number };
      return parsed?.blocks && Array.isArray(parsed.blocks)
        ? {
            version: parsed.version ?? 1,
            blocks: parsed.blocks as CanvasBlock[],
          }
        : { version: 1, blocks: [] };
    } catch {
      return { version: 1, blocks: [] };
    }
  }
  // Nếu content đã là object và có blocks, parse thành CanvasContent
  if (content && typeof content === "object" && "blocks" in content) {
    const raw = content as { blocks: unknown[]; version?: number };
    return Array.isArray(raw.blocks)
      ? { version: raw.version ?? 1, blocks: raw.blocks as CanvasBlock[] }
      : { version: 1, blocks: [] };
  }
  return { version: 1, blocks: [] };
}

function ensureBlock(raw: RawCanvasBlock | unknown): CanvasBlock {
  const b = raw && typeof raw === "object" ? (raw as RawCanvasBlock) : {};
  const type =
    b.type && BLOCK_TYPES.indexOf(b.type as CanvasBlockType) !== -1
      ? (b.type as CanvasBlockType)
      : "paragraph";
  return {
    id: typeof b.id === "string" ? b.id : generateId(),
    type,
    content: typeof b.content === "string" ? b.content : "",
  };
}

const props = withDefaults(
  defineProps<{
    canvasId?: string | null;
  }>(),
  { canvasId: null }
);

const canvasStore = useCanvasStore();
const workspaceStore = useWorkspaceStore();
const channelStore = useChannelStore();

const { selectedCanvas } = storeToRefs(canvasStore);
const { workspaceDetail: workspace } = storeToRefs(workspaceStore);
const { selectedChannel: channel } = storeToRefs(channelStore);

const blocks = ref<CanvasBlock[]>([]);
const focusNextIndex = ref<number | null>(null); // index của block hiện tại đang focus
const blockRefs = ref<(CanvasBlockComponentRef | null)[]>([]);

let _saveTimer: ReturnType<typeof setTimeout> | undefined;

const contentForSave = computed<CanvasContent>(() => ({
  version: 1,
  blocks: blocks.value.map((b) => ({
    id: b.id,
    type: b.type,
    content: b.content,
  })),
}));

/**
 * Load toàn bộ blocks từ canvas vào local state
 */
function loadBlocksFromCanvas(): void {
  // Lấy Canvas từ store
  const canvas = selectedCanvas.value;
  // Lấy CanvasContent
  const raw =
    (canvas as { content?: unknown; initialContent?: unknown })?.content ??
    (canvas as { initialContent?: unknown })?.initialContent;

  // Parse CanvasContent từ string thành object CanvasContent (do API trả về string)
  const { blocks: rawBlocks } = normalizeContent(raw);

  // Map rawBlocks thành array của CanvasBlock
  blocks.value = rawBlocks.length
    ? rawBlocks.map(ensureBlock)
    : [ensureBlock({ type: "paragraph", content: "" })];
  focusNextIndex.value = null;
}

/**
 * Thêm block mới sau block hiện tại
 * @param index - index của block hiện tại
 */
function addBlockAfter(index: number): void {
  const newBlock = ensureBlock({ type: "paragraph", content: "" });
  blocks.value.splice(index + 1, 0, newBlock);
  focusNextIndex.value = index + 1;
  setTimeout(() => focusBlockAt(focusNextIndex.value!), 0);
  debouncedSave();
}

/**
 * Chia block tại index thành 2 block: block hiện tại giữ phần trước cursor, block mới chứa phần sau cursor
 * @param index - index của block hiện tại
 * @param before - content trước cursor
 * @param after - content sau cursor
 */
function splitBlock(index: number, before: string, after: string): void {
  const currentBlock = blocks.value[index];
  if (!currentBlock) return;

  // Cập nhật block hiện tại với content trước cursor
  currentBlock.content = before;

  // Tạo block mới với content sau cursor, cùng type với block hiện tại
  const newBlock = ensureBlock({
    type: currentBlock.type,
    content: after,
  });

  // Chèn block mới sau block hiện tại
  blocks.value.splice(index + 1, 0, newBlock);

  // Focus vào block mới
  focusNextIndex.value = index + 1;
  setTimeout(() => focusBlockAt(focusNextIndex.value!), 0);

  debouncedSave();
}

/**
 * Cập nhật nội dung của block
 * @param blockId - id của block cần cập nhật
 * @param content - nội dung mới của block
 */
function updateBlockContent(blockId: string, content: string): void {
  const block = blocks.value.find((b) => b.id === blockId);
  if (block) {
    block.content = content;
    debouncedSave();
  }
}

/**
 * Xóa block tại index
 * @param index - index của block cần xóa
 */
function deleteBlock(index: number): void {
  blocks.value.splice(index, 1);
  debouncedSave();
}

function mergeWithPrev(index: number): void {
  console.log("mergeWithPrev: ", index);
  const prevBlock = blocks.value[index - 1];
  // Ghi nhớ độ dài của block trước
  const prevLength = prevBlock.content.length;
  const currentBlock = blocks.value[index];
  if (!prevBlock || !currentBlock) return;
  // nối block hiện tại vào block trước
  prevBlock.content += currentBlock.content;

  // xóa block hiện tại
  blocks.value.splice(index, 1);
  debouncedSave();

  // focus + set cursor
  nextTick(() => {
    focusBlockAtWithOffset(index - 1, prevLength);
  });
}

/**
 * Focus block trước đó
 * @param index - index của block hiện tại
 */
function focusPrevFrom(index: number): void {
  if (index <= 0) return;

  focusNextIndex.value = index - 1;
  setTimeout(() => focusBlockAt(focusNextIndex.value!, true), 0); // true = đặt cursor ở cuối
  debouncedSave();
}

/**
 * Focus block sau đó
 * @param index - index của block hiện tại
 */
function focusNextFrom(index: number): void {
  if (index >= blocks.value.length - 1) return;
  focusNextIndex.value = index + 1;
  setTimeout(() => focusBlockAt(focusNextIndex.value!), 0);
}
/**
 * Focus block tại index
 * @param index - index của block cần focus
 * @param atEnd - có đặt cursor ở cuối dòng không (mặc định false)
 */
function focusBlockAt(index: number | null | undefined, atEnd = false): void {
  const refs = blockRefs.value;
  if (!refs || index == null || index < 0) return;
  const el = refs[index];
  if (atEnd && el?.focusElAtEnd) {
    el.focusElAtEnd();
  } else if (el?.focusEl) {
    el.focusEl();
  }
  focusNextIndex.value = null; // reset index của block hiện tại đang focus
}

/**
 * Focus block tại index và đặt cursor ở cuối dòng
 * @param index - index của block cần focus
 */
function focusBlockAtEnd(index: number): void {
  const refs = blockRefs.value;
  if (!refs || index == null || index < 0) return;
  const el = refs[index];
  if (el?.focusElAtEnd) {
    el.focusElAtEnd();
  }
}

/**
 * Focus block tại index và đặt cursor ở vị trí offset
 * @param index - index của block cần focus
 * @param offset - vị trí offset cần đặt cursor
 */
function focusBlockAtWithOffset(index: number, offset: number): void {
  const refs = blockRefs.value;
  if (!refs || index < 0) return;

  const el = refs[index];
  if (!el?.focusElAtOffset) return;

  el.focusElAtOffset(offset);
}

/**
 * Lưu nội dung canvas với debounce
 */
function debouncedSave(): void {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    saveContent();
    _saveTimer = undefined;
  }, 800);
}

async function saveContent(): Promise<void> {
  _saveTimer = undefined;
  if (!workspace.value?.id || !channel.value?.id || !selectedCanvas.value?.id)
    return;
  const payload = JSON.stringify(contentForSave.value);
  await canvasStore.saveCanvasContent(
    workspace.value.id,
    channel.value.id,
    selectedCanvas.value.id,
    payload
  );
}

function setBlockRef(el: CanvasBlockComponentRef | null, index: number): void {
  if (el) blockRefs.value[index] = el;
}

watch(
  () => selectedCanvas.value?.id,
  (id) => {
    if (id === props.canvasId || (!props.canvasId && id)) {
      loadBlocksFromCanvas();
    }
  }
);

onMounted(() => {
  loadBlocksFromCanvas();
  console.log("Focus Next Index: ", focusNextIndex.value);
});

onBeforeUnmount(() => {
  if (_saveTimer) clearTimeout(_saveTimer);
});
</script>

<template>
  <div class="canvas-tab-root">
    <div class="canvas-editor">
      <div class="canvas-blocks">
        <CanvasBlockComponent
          v-for="(block, index) in blocks"
          :key="block.id"
          :ref="(el: unknown) => setBlockRef(el as CanvasBlockComponentRef | null, index)"
          :block="block"
          :auto-focus="focusNextIndex === index"
          :placeholder="
            index === 0 ? 'Title or start writing…' : 'Type something...'
          "
          @update:content="(content: string) => updateBlockContent(block.id, content)"
          @add-after="addBlockAfter(index)"
          @focus-prev="focusPrevFrom(index)"
          @focus-next="focusNextFrom(index)"
          @delete="deleteBlock(index)"
          @merge-with-prev="mergeWithPrev(index)"
          @split-block="(data: { before: string; after: string }) => splitBlock(index, data.before, data.after)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss" src="./CanvasTabView.scss"></style> -->

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from "vue";
import { storeToRefs } from "pinia";
import { useEditor, EditorContent } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

import { useCanvasStore } from "@/modules/channels/stores/canvas.store";
import { useWorkspaceStore } from "@/modules/workspaces/stores/workspace.store";
import { useChannelStore } from "@/modules/channels/stores/channel.store";

import { canvasToTiptap, tiptapToCanvas } from "@/helpers/canvas.helper";
import { CanvasContent } from "../../types/canvas.types";

const props = defineProps<{
  canvasId?: string | null;
}>();

const canvasStore = useCanvasStore();
const workspaceStore = useWorkspaceStore();
const channelStore = useChannelStore();

const { selectedCanvas } = storeToRefs(canvasStore);
const { workspaceDetail: workspace } = storeToRefs(workspaceStore);
const { selectedChannel: channel } = storeToRefs(channelStore);

let saveTimer: ReturnType<typeof setTimeout> | undefined;

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

      editor.value.commands.setContent(canvasToTiptap(canvasContent));
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
  if (!workspace.value?.id || !channel.value?.id || !selectedCanvas.value?.id)
    return;

  const canvasContent = tiptapToCanvas(doc);

  await canvasStore.saveCanvasContent(
    workspace.value.id,
    channel.value.id,
    selectedCanvas.value.id,
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
    <div class="canvas-editor">
      <EditorContent :editor="editor" />
    </div>
  </div>
</template>

<style scoped>
:deep(.ProseMirror) {
  outline: none;
  border: none;
}

:deep(.ProseMirror-focused) {
  outline: none;
}

:deep(.ProseMirror p.is-empty::before),
:deep(.ProseMirror h1.is-empty::before),
:deep(.ProseMirror h2.is-empty::before),
:deep(.ProseMirror h3.is-empty::before) {
  content: attr(data-placeholder);
  color: #9ca3af; /* gray-400 */
  float: left;
  height: 0;
  pointer-events: none;
}

:deep(.ProseMirror) {
  max-width: 900px;
  margin: 0 auto;
  padding: 100px 32px;
}
</style>
