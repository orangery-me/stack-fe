import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { DecorationSet, Decoration } from "prosemirror-view";
import { Fragment } from "prosemirror-model";

interface PreviewState {
  active: boolean;
  pos: number;
  content: string;
}

export const aiPreviewPluginKey = new PluginKey<PreviewState>("aiPreview");

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    aiPreview: {
      startAiPreview: (pos: number) => ReturnType;
      appendAiPreviewChunk: (chunk: string) => ReturnType;
      acceptAiPreview: () => ReturnType;
      rejectAiPreview: () => ReturnType;
      /** Accept selection edit — replace `from..to` or append after `to` */
      acceptAiSelectionPreview: (
        from: number,
        to: number,
        editMode: "replace" | "append"
      ) => ReturnType;
    };
  }
}

export const AiPreviewExtension = Extension.create({
  name: "aiPreview",

  addCommands() {
    return {
      startAiPreview:
        (pos: number) =>
        ({ dispatch, tr }) => {
          if (dispatch) dispatch(tr.setMeta(aiPreviewPluginKey, { type: "start", pos }));
          return true;
        },

      appendAiPreviewChunk:
        (chunk: string) =>
        ({ dispatch, tr }) => {
          if (dispatch) dispatch(tr.setMeta(aiPreviewPluginKey, { type: "append", chunk }));
          return true;
        },

      acceptAiPreview:
        () =>
        ({ state, dispatch, editor }) => {
          const s = aiPreviewPluginKey.getState(state);
          if (!s?.active || !s.content) return false;

          if (dispatch) {
            const { pos, content } = s;
            const lines = content
              .split("\n")
              .map((l) => l.trim())
              .filter(Boolean);

            const nodes =
              lines.length > 0
                ? lines.map((text) =>
                    state.schema.nodes.paragraph.create(
                      null,
                      state.schema.text(text)
                    )
                  )
                : [state.schema.nodes.paragraph.create()];

            // Insert content + clear decoration in a single transaction (undo-able as one step)
            dispatch(
              state.tr
                .insert(pos, Fragment.fromArray(nodes))
                .setMeta(aiPreviewPluginKey, { type: "clear" })
                .setMeta("addToHistory", true)
            );

            setTimeout(() => editor.commands.focus(), 0);
          }

          return true;
        },

      rejectAiPreview:
        () =>
        ({ dispatch, tr }) => {
          if (dispatch) dispatch(tr.setMeta(aiPreviewPluginKey, { type: "clear" }));
          return true;
        },

      acceptAiSelectionPreview:
        (from: number, to: number, editMode: "replace" | "append") =>
        ({ state, dispatch, editor }) => {
          const s = aiPreviewPluginKey.getState(state);
          if (!s?.active || !s.content) return false;

          if (dispatch) {
            const { content } = s;
            const lines = content
              .split("\n")
              .map((l) => l.trim())
              .filter(Boolean);

            const nodes =
              lines.length > 0
                ? lines.map((text) =>
                    state.schema.nodes.paragraph.create(
                      null,
                      state.schema.text(text)
                    )
                  )
                : [state.schema.nodes.paragraph.create()];

            let tr = state.tr;

            if (editMode === "replace") {
              // Xoá đoạn đã chọn rồi insert nội dung AI tại vị trí `from`
              tr = tr.delete(from, to);
              tr = tr.insert(from, Fragment.fromArray(nodes));
            } else {
              // Append: chèn ngay sau `to` 
              tr = tr.insert(to, Fragment.fromArray(nodes));
            }

            dispatch(
              tr
                .setMeta(aiPreviewPluginKey, { type: "clear" })
                .setMeta("addToHistory", true)
            );

            setTimeout(() => editor.commands.focus(), 0);
          }

          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: aiPreviewPluginKey,

        state: {
          init: (): PreviewState => ({ active: false, pos: 0, content: "" }),
          apply(tr, value: PreviewState): PreviewState {
            const meta = tr.getMeta(aiPreviewPluginKey);
            if (!meta) {
              // Map position through doc changes (e.g. other user edits in Yjs)
              if (value.active) {
                return { ...value, pos: tr.mapping.map(value.pos) };
              }
              return value;
            }
            switch (meta.type) {
              case "start":
                return { active: true, pos: meta.pos, content: "" };
              case "append":
                return { ...value, content: value.content + meta.chunk };
              case "clear":
                return { active: false, pos: 0, content: "" };
              default:
                return value;
            }
          },
        },

        props: {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore — pnpm prosemirror-transform version mismatch; runtime is correct after Vite dedupe
          decorations(state) {
            const s: PreviewState | undefined = aiPreviewPluginKey.getState(state);
            if (!s?.active) return DecorationSet.empty;

            const widget = Decoration.widget(
              s.pos,
              () => {
                const el = document.createElement("div");
                el.className = "ai-preview-ghost";
                if (!s.content) {
                  // Streaming not yet started — show a blinking cursor
                  const cursor = document.createElement("span");
                  cursor.className = "ai-preview-cursor";
                  el.appendChild(cursor);
                } else {
                  el.textContent = s.content;
                }
                return el;
              },
              // No static key: ProseMirror recreates the DOM node on each state change
              // so the ghost text stays in sync with streamed chunks.
              { side: 1 }
            );

            return DecorationSet.create(state.doc, [widget]);
          },
        },
      }),
    ];
  },
});
