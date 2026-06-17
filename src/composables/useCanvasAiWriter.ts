import { reactive, computed } from "vue";
import type { ShallowRef } from "vue";
import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import type { Editor } from "@tiptap/vue-3";
import type { SlashItem } from "@/components/editor/SlashCommandMenu.vue";
import { useUiStore } from "@/stores/ui.store.js";

export interface SlashMenuState {
  visible: boolean;
  items: SlashItem[];
  selectedIndex: number;
  clientRect: DOMRect | null;
  // eslint-disable-next-line no-unused-vars
  onSelect: ((item: SlashItem) => void) | null;
}

export interface AiWriterBarState {
  visible: boolean;
  anchorRect: DOMRect | null;
  insertPos: number;
}

export interface SelectionAiIconState {
  visible: boolean;
  iconRect: DOMRect | null;
}

const SLASH_ITEMS: SlashItem[] = [
  {
    id: "ai-writer",
    label: "AI Writer",
    description: "Tạo nội dung bằng AI",
    icon: "✦",
  },
];

export function useCanvasAiWriter(editorRef: ShallowRef<Editor | null>) {
  const uiStore = useUiStore();
  const slashMenu = reactive<SlashMenuState>({
    visible: false,
    items: [],
    selectedIndex: 0,
    clientRect: null,
    onSelect: null,
  });

  const aiWriterBar = reactive<AiWriterBarState>({
    visible: false,
    anchorRect: null,
    insertPos: 0,
  });

  // Internal: block element reference + scroll listener cleanup
  let anchorBlockEl: Element | null = null;
  let scrollUnsubscribe: (() => void) | null = null;

  function findScrollContainer(el: Element | null): Element | Window {
    let node = el?.parentElement ?? null;
    while (node && node !== document.body) {
      const { overflowY } = window.getComputedStyle(node);
      if (overflowY === "auto" || overflowY === "scroll") return node;
      node = node.parentElement;
    }
    return window;
  }

  function subscribeToScroll(blockEl: Element) {
    anchorBlockEl = blockEl;
    const container = findScrollContainer(blockEl);
    const onScroll = () => {
      if (anchorBlockEl) {
        aiWriterBar.anchorRect = anchorBlockEl.getBoundingClientRect();
      }
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    scrollUnsubscribe = () => container.removeEventListener("scroll", onScroll);
  }

  function unsubscribeFromScroll() {
    scrollUnsubscribe?.();
    scrollUnsubscribe = null;
    anchorBlockEl = null;
  }

  const canvasPlainText = computed(() => editorRef.value?.getText() ?? "");

  // ======== Selection AI =========

  const selectionAiIcon = reactive<SelectionAiIconState>({
    visible: false,
    iconRect: null,
  });

  let _selSnapshot: {
    from: number;
    to: number;
    selectedText: string;
    iconRect: DOMRect;
  } | null = null;

  let _selDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  let _editorDomMouseUpListener: (() => void) | null = null;
  let _docMouseDownListener: (() => void) | null = null;

  function _hideSelectionUi() {
    selectionAiIcon.visible = false;
    selectionAiIcon.iconRect = null;
    _selSnapshot = null;
  }

  function _tryShowSelectionIcon() {
    const editor = editorRef.value;
    if (!editor) return;

    const { state, view } = editor;
    const { selection } = state;

    if (selection.empty) {
      _hideSelectionUi();
      return;
    }
    if (aiWriterBar.visible) return;

    const { from, to } = selection;
    const selectedText = state.doc.textBetween(from, to, "\n");
    if (!selectedText.trim()) {
      _hideSelectionUi();
      return;
    }

    const fromCoords = view.coordsAtPos(from);
    const toCoords = view.coordsAtPos(to);

    const iconRect = new DOMRect(
      toCoords.right + 4,
      toCoords.top,
      28,
      toCoords.bottom - toCoords.top,
    );
    _selSnapshot = { from, to, selectedText, iconRect };
    selectionAiIcon.iconRect = iconRect;
    selectionAiIcon.visible = true;
  }

  function buildSelectionListener() {
    const editor = editorRef.value;
    if (!editor) return;

    const editorDom = editor.view.dom as HTMLElement;

    // Mouse selection: show icon on mouseup (after drag-to-select)
    const onMouseUp = () => setTimeout(_tryShowSelectionIcon, 10);
    editorDom.addEventListener("mouseup", onMouseUp);
    _editorDomMouseUpListener = () =>
      editorDom.removeEventListener("mouseup", onMouseUp);

    // Keyboard selection: debounce selectionUpdate
    editor.on("selectionUpdate", () => {
      const { selection } = editor.state;
      if (selection.empty) {
        if (_selDebounceTimer) {
          clearTimeout(_selDebounceTimer);
          _selDebounceTimer = null;
        }
        _hideSelectionUi();
        return;
      }
      if (_selDebounceTimer) clearTimeout(_selDebounceTimer);
      _selDebounceTimer = setTimeout(() => {
        _selDebounceTimer = null;
        _tryShowSelectionIcon();
      }, 350);
    });

    // Click outside: hide icon
    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (document.querySelector(".ai-sel-icon")?.contains(target)) return;
      _hideSelectionUi();
    };
    document.addEventListener("mousedown", onDocMouseDown, true);
    _docMouseDownListener = () =>
      document.removeEventListener("mousedown", onDocMouseDown, true);
  }

  function destroySelectionListeners() {
    _editorDomMouseUpListener?.();
    _editorDomMouseUpListener = null;
    _docMouseDownListener?.();
    _docMouseDownListener = null;
    if (_selDebounceTimer) {
      clearTimeout(_selDebounceTimer);
      _selDebounceTimer = null;
    }
  }

  function handleSelectionIconClick() {
    if (!_selSnapshot) return;
    const fullText = _selSnapshot.selectedText.trim();
    uiStore.openAiWithSelectedContext({
      source: "canvas-selection",
      label: "Selected text",
      fullText,
      preview: fullText.replace(/\s+/g, " ").slice(0, 220),
    });
    _hideSelectionUi();
  }

  // ======== Slash command extension =========

  function buildSlashCommandExtension() {
    return Extension.create({
      name: "slashCommand",
      addProseMirrorPlugins() {
        return [
          Suggestion({
            editor: this.editor,
            char: "/",
            startOfLine: false,
            allowedPrefixes: null, // allow "/" anywhere, not just after a space
            items: ({ query }: { query: string }) => {
              const q = query.toLowerCase();
              return q
                ? SLASH_ITEMS.filter(
                    (i) =>
                      i.label.toLowerCase().includes(q) ||
                      i.description?.toLowerCase().includes(q),
                  )
                : SLASH_ITEMS;
            },
            render: () => ({
              onStart: (props: any) => {
                slashMenu.items = props.items;
                slashMenu.selectedIndex = 0;
                slashMenu.clientRect = props.clientRect?.() ?? null;
                slashMenu.visible = true;
                slashMenu.onSelect = (item: SlashItem) => props.command(item);
              },
              onUpdate: (props: any) => {
                slashMenu.items = props.items;
                slashMenu.clientRect = props.clientRect?.() ?? null;
              },
              onExit: () => {
                slashMenu.visible = false;
                slashMenu.onSelect = null;
              },
              onKeyDown: ({ event }: { event: KeyboardEvent }) => {
                if (event.key === "ArrowDown") {
                  slashMenu.selectedIndex = Math.min(
                    slashMenu.selectedIndex + 1,
                    slashMenu.items.length - 1,
                  );
                  return true;
                }
                if (event.key === "ArrowUp") {
                  slashMenu.selectedIndex = Math.max(
                    slashMenu.selectedIndex - 1,
                    0,
                  );
                  return true;
                }
                if (event.key === "Enter") {
                  const item = slashMenu.items[slashMenu.selectedIndex];
                  if (item && slashMenu.onSelect) slashMenu.onSelect(item);
                  return true;
                }
                if (event.key === "Escape") {
                  slashMenu.visible = false;
                  return true;
                }
                return false;
              },
            }),
            command: ({
              editor,
              range,
              props,
            }: {
              editor: Editor;
              range: any;
              props: SlashItem;
            }) => {
              editor.chain().focus().deleteRange(range).run();

              if (props.id === "ai-writer") {
                const { from } = editor.state.selection;
                const domAtPos = editor.view.domAtPos(from);
                const blockEl =
                  domAtPos.node.nodeType === 1
                    ? (domAtPos.node as Element)
                    : (domAtPos.node.parentElement as Element | null);

                aiWriterBar.anchorRect =
                  blockEl?.getBoundingClientRect() ?? null;
                aiWriterBar.insertPos = from;
                aiWriterBar.visible = true;

                if (blockEl) subscribeToScroll(blockEl);
              }
            },
          }),
        ];
      },
    });
  }

  // ======== AI Preview handlers =========

  function handlePreviewStart() {
    const e = editorRef.value;
    if (!e) return;
    // Insert exactly at the stored caret position in the current block
    e.commands.startAiPreview(aiWriterBar.insertPos);
  }

  function handlePreviewChunk(chunk: string) {
    editorRef.value?.commands.appendAiPreviewChunk(chunk);
  }

  function handlePreviewDone() {
    // No-op: wait for user to Accept or Reject
  }

  function handleAccept() {
    unsubscribeFromScroll();
    editorRef.value?.commands.acceptAiPreview();
  }

  function handleReject() {
    editorRef.value?.commands.rejectAiPreview();
    // Bar stays open so user can adjust the request and try again
  }

  function handleAiWriterClose() {
    unsubscribeFromScroll();
    // Clear any active preview decoration, then hide the bar
    editorRef.value?.commands.rejectAiPreview();
    aiWriterBar.visible = false;
    aiWriterBar.anchorRect = null;
    editorRef.value?.commands.focus();
  }

  return {
    slashMenu,
    aiWriterBar,
    selectionAiIcon,
    canvasPlainText,
    buildSlashCommandExtension,
    buildSelectionListener,
    destroySelectionListeners,
    handlePreviewStart,
    handlePreviewChunk,
    handlePreviewDone,
    handleAccept,
    handleReject,
    handleAiWriterClose,
    handleSelectionIconClick,
  };
}
