import { reactive, computed } from "vue";
import type { ShallowRef } from "vue";
import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import type { Editor } from "@tiptap/vue-3";
import type { SlashItem } from "@/components/editor/SlashCommandMenu.vue";

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

const SLASH_ITEMS: SlashItem[] = [
  {
    id: "ai-writer",
    label: "AI Writer",
    description: "Tạo nội dung bằng AI",
    icon: "✦",
  },
];

export function useCanvasAiWriter(editorRef: ShallowRef<Editor | null>) {
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

  const canvasPlainText = computed(() => editorRef.value?.getText() ?? "");

  function buildSlashCommandExtension() {
    return Extension.create({
      name: "slashCommand",
      addProseMirrorPlugins() {
        return [
          Suggestion({
            editor: this.editor,
            char: "/",
            startOfLine: false,
            items: ({ query }: { query: string }) => {
              const q = query.toLowerCase();
              return q
                ? SLASH_ITEMS.filter(
                    (i) =>
                      i.label.toLowerCase().includes(q) ||
                      i.description?.toLowerCase().includes(q)
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
                    slashMenu.items.length - 1
                  );
                  return true;
                }
                if (event.key === "ArrowUp") {
                  slashMenu.selectedIndex = Math.max(
                    slashMenu.selectedIndex - 1,
                    0
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

                aiWriterBar.anchorRect = blockEl?.getBoundingClientRect() ?? null;
                aiWriterBar.insertPos = from;
                aiWriterBar.visible = true;
              }
            },
          }),
        ];
      },
    });
  }

  function handleAiInsert(content: string) {
    const e = editorRef.value;
    if (!e) return;
    const resolvedPos = e.state.doc.resolve(aiWriterBar.insertPos);
    const blockEnd = resolvedPos.end();
    e.chain()
      .focus()
      .insertContentAt(blockEnd, `<p>${content.replace(/\n/g, "</p><p>")}</p>`)
      .run();
  }

  function handleAiWriterClose() {
    aiWriterBar.visible = false;
    aiWriterBar.anchorRect = null;
    editorRef.value?.commands.focus();
  }

  return {
    slashMenu,
    aiWriterBar,
    canvasPlainText,
    buildSlashCommandExtension,
    handleAiInsert,
    handleAiWriterClose,
  };
}
