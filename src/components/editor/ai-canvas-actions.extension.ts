import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import type { CanvasSuggestion } from "@/services/canvas.service";

interface CanvasSuggestionsState {
  suggestions: CanvasSuggestion[];
}

export const canvasAiActionsPluginKey =
  new PluginKey<CanvasSuggestionsState>("canvasAiActions");

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    canvasAiActions: {
      setCanvasAiSuggestions: (suggestions: CanvasSuggestion[]) => ReturnType;
      clearCanvasAiSuggestions: () => ReturnType;
    };
  }
}

function visibleSuggestion(suggestion: CanvasSuggestion): boolean {
  return ["pending", "applying", "failed"].includes(suggestion.status || "pending");
}

function anchorIdForSuggestion(suggestion: CanvasSuggestion): string | null {
  if (suggestion.action === "insert_before" || suggestion.action === "insert_after") {
    return suggestion.targetBlockId || null;
  }
  return suggestion.blockId || null;
}

function actionLabel(action: string): string {
  switch (action) {
    case "replace_text":
      return "REPLACE TEXT";
    case "replace_block":
      return "REPLACE BLOCK";
    case "insert_before":
      return "INSERT BEFORE";
    case "insert_after":
      return "INSERT AFTER";
    case "delete_block":
      return "DELETE BLOCK";
    default:
      return "EDIT";
  }
}

function proposedText(suggestion: CanvasSuggestion): string {
  const payload = suggestion.payload || {};
  if (suggestion.action === "replace_text") return String(payload.new_text || "");
  if (
    suggestion.action === "replace_block" ||
    suggestion.action === "insert_before" ||
    suggestion.action === "insert_after"
  ) {
    const block = payload.new_block;
    if (block && typeof block === "object") {
      return String(block.content || block.text || "");
    }
  }
  return "";
}

function createButton(
  suggestionId: string,
  intent: "accept" | "reject",
  disabled: boolean,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `ai-canvas-suggestion-btn ai-canvas-suggestion-btn--${intent}`;
  button.textContent = intent === "accept" ? "Accept" : "Reject";
  button.dataset.aiCanvasSuggestionAction = intent;
  button.dataset.aiCanvasSuggestionId = suggestionId;
  button.disabled = disabled;
  button.addEventListener("mousedown", (event) => event.preventDefault());
  return button;
}

function createToolbar(suggestion: CanvasSuggestion): HTMLElement {
  const toolbar = document.createElement("div");
  toolbar.className = `ai-canvas-suggestion-toolbar is-${suggestion.status || "pending"}`;

  const label = document.createElement("span");
  label.className = "ai-canvas-suggestion-toolbar__label";
  label.textContent = actionLabel(suggestion.action);

  toolbar.appendChild(label);

  if (suggestion.error) {
    const error = document.createElement("span");
    error.className = "ai-canvas-suggestion-toolbar__error";
    error.textContent = suggestion.error;
    toolbar.appendChild(error);
  }

  const disabled = suggestion.status === "applying";
  toolbar.append(
    createButton(suggestion.id, "accept", disabled),
    createButton(suggestion.id, "reject", disabled),
  );

  return toolbar;
}

function createReplaceWidget(suggestion: CanvasSuggestion): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "ai-canvas-suggestion-widget ai-canvas-suggestion-widget--replace";
  wrapper.setAttribute("contenteditable", "false");
  wrapper.draggable = false;

  const newBlock = document.createElement("div");
  newBlock.className = "ai-canvas-diff-line ai-canvas-diff-line--new";
  newBlock.textContent = proposedText(suggestion);

  wrapper.append(createToolbar(suggestion), newBlock);
  return wrapper;
}

function createInsertWidget(suggestion: CanvasSuggestion): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "ai-canvas-suggestion-widget ai-canvas-suggestion-widget--insert";
  wrapper.setAttribute("contenteditable", "false");
  wrapper.draggable = false;

  const text = document.createElement("div");
  text.className = "ai-canvas-diff-line ai-canvas-diff-line--new";
  text.textContent = proposedText(suggestion);

  wrapper.append(createToolbar(suggestion), text);
  return wrapper;
}

function createDeleteWidget(suggestion: CanvasSuggestion): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "ai-canvas-suggestion-widget ai-canvas-suggestion-widget--delete";
  wrapper.setAttribute("contenteditable", "false");
  wrapper.draggable = false;
  wrapper.append(createToolbar(suggestion));
  return wrapper;
}

function createMissingWidget(suggestions: CanvasSuggestion[]): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "ai-canvas-suggestion-missing";
  wrapper.setAttribute("contenteditable", "false");
  wrapper.draggable = false;
  for (const suggestion of suggestions) {
    const row = document.createElement("div");
    row.className = "ai-canvas-suggestion-missing__row";
    const text = document.createElement("span");
    text.textContent = `${actionLabel(suggestion.action)} target block was not found.`;
    row.append(text, createToolbar(suggestion));
    wrapper.appendChild(row);
  }
  return wrapper;
}

export const AiCanvasActionsExtension = Extension.create({
  name: "canvasAiActions",

  addCommands() {
    return {
      setCanvasAiSuggestions:
        (suggestions: CanvasSuggestion[]) =>
        ({ dispatch, tr }) => {
          if (dispatch) {
            dispatch(tr.setMeta(canvasAiActionsPluginKey, { type: "set", suggestions }));
          }
          return true;
        },

      clearCanvasAiSuggestions:
        () =>
        ({ dispatch, tr }) => {
          if (dispatch) {
            dispatch(tr.setMeta(canvasAiActionsPluginKey, { type: "clear" }));
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: canvasAiActionsPluginKey,

        state: {
          init: (): CanvasSuggestionsState => ({ suggestions: [] }),
          apply(tr, value: CanvasSuggestionsState): CanvasSuggestionsState {
            const meta = tr.getMeta(canvasAiActionsPluginKey);
            if (!meta) return value;
            if (meta.type === "clear") return { suggestions: [] };
            if (meta.type === "set") {
              return {
                suggestions: Array.isArray(meta.suggestions) ? meta.suggestions : [],
              };
            }
            return value;
          },
        },

        props: {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore - pnpm prosemirror-transform version mismatch; runtime is correct after Vite dedupe.
          decorations(state) {
            const pluginState = canvasAiActionsPluginKey.getState(state);
            const suggestions = (pluginState?.suggestions || []).filter(visibleSuggestion);
            if (!suggestions.length) return DecorationSet.empty;

            const byAnchor = new Map<string, CanvasSuggestion[]>();
            const topFallback: CanvasSuggestion[] = [];

            for (const suggestion of suggestions) {
              const anchorId = anchorIdForSuggestion(suggestion);
              if (!anchorId) {
                topFallback.push(suggestion);
                continue;
              }
              const current = byAnchor.get(anchorId) || [];
              current.push(suggestion);
              byAnchor.set(anchorId, current);
            }

            const decorations: Decoration[] = [];

            state.doc.forEach((node, offset) => {
              const nodeId = typeof node.attrs?.id === "string" ? node.attrs.id : null;
              if (!nodeId) return;

              const suggestionsForNode = byAnchor.get(nodeId);
              if (!suggestionsForNode?.length) return;

              for (const suggestion of suggestionsForNode) {
                const from = offset;
                const to = offset + node.nodeSize;
                if (suggestion.action === "replace_text" || suggestion.action === "replace_block") {
                  decorations.push(
                    Decoration.node(from, to, {
                      class: "ai-canvas-target-block ai-canvas-target-block--replace",
                    }),
                    Decoration.widget(to, () => createReplaceWidget(suggestion), { side: 1 }),
                  );
                  continue;
                }

                if (suggestion.action === "delete_block") {
                  decorations.push(
                    Decoration.node(from, to, {
                      class: "ai-canvas-target-block ai-canvas-target-block--delete",
                    }),
                    Decoration.widget(from, () => createDeleteWidget(suggestion), { side: -1 }),
                  );
                  continue;
                }

                if (suggestion.action === "insert_before") {
                  decorations.push(
                    Decoration.widget(from, () => createInsertWidget(suggestion), { side: -1 }),
                  );
                  continue;
                }

                if (suggestion.action === "insert_after") {
                  decorations.push(
                    Decoration.widget(to, () => createInsertWidget(suggestion), { side: 1 }),
                  );
                }
              }

              byAnchor.delete(nodeId);
            });

            for (const missing of byAnchor.values()) {
              topFallback.push(...missing);
            }

            if (topFallback.length) {
              decorations.unshift(
                Decoration.widget(0, () => createMissingWidget(topFallback), { side: -1 }),
              );
            }

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
