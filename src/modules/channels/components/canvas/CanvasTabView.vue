<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
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

/**
 * Focus block trước đó
 * @param index - index của block hiện tại
 */
function focusPrevFrom(index: number): void {
  if (index <= 0) return;
  blocks.value.splice(index, 1);
  focusNextIndex.value = index - 1;
  setTimeout(() => focusBlockAt(focusNextIndex.value!), 0);
  debouncedSave();
}

/**
 * Focus block tại index
 * @param index - index của block cần focus
 */
function focusBlockAt(index: number | null | undefined): void {
  const refs = blockRefs.value;
  if (!refs || index == null || index < 0) return;
  const el = refs[index];
  if (el?.focusEl) el.focusEl();
  focusNextIndex.value = null; // reset index của block hiện tại đang focus
}

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
  console.log('Focus Next Index: ', focusNextIndex.value);
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
          @delete="deleteBlock(index)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss" src="./CanvasTabView.scss"></style>
