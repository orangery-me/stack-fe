import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

export interface CanvasAiInlineAction {
  inlineId: string;
  id?: string;
  name: string;
  arguments?: Record<string, unknown>;
  status?: string;
  error?: string;
}

interface CanvasAiActionsState {
  actions: CanvasAiInlineAction[];
}

export const canvasAiActionsPluginKey =
  new PluginKey<CanvasAiActionsState>("canvasAiActions");

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    canvasAiActions: {
      setCanvasAiActions: (actions: CanvasAiInlineAction[]) => ReturnType;
      clearCanvasAiActions: () => ReturnType;
    };
  }
}

function numberArg(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function anchorIndexForAction(action: CanvasAiInlineAction): number | null {
  const args = action.arguments || {};
  if (action.name === "insert_canvas_block") {
    return numberArg(args.after_index) ?? -1;
  }
  if (action.name === "update_canvas_block" || action.name === "delete_canvas_block") {
    return numberArg(args.index);
  }
  if (action.name === "reorder_canvas_blocks") {
    return numberArg(args.from_index);
  }
  return null;
}

function labelForAction(action: CanvasAiInlineAction): string {
  switch (action.name) {
    case "insert_canvas_block":
      return "AI proposed insert";
    case "update_canvas_block":
      return "AI proposed update";
    case "delete_canvas_block":
      return "AI proposed delete";
    case "reorder_canvas_blocks":
      return "AI proposed move";
    default:
      return "AI proposed change";
  }
}

function bodyForAction(action: CanvasAiInlineAction): string {
  const args = action.arguments || {};
  if (action.name === "delete_canvas_block") {
    return "AI suggests deleting this block.";
  }
  if (action.name === "reorder_canvas_blocks") {
    const toIndex = numberArg(args.to_index);
    return toIndex === null
      ? "AI suggests moving this block."
      : `AI suggests moving this block to position ${toIndex + 1}.`;
  }
  return String(args.content || "");
}

function createButton(
  inlineId: string,
  intent: "accept" | "reject",
  disabled: boolean,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `ai-canvas-action-btn ai-canvas-action-btn--${intent}`;
  button.textContent = intent === "accept" ? "Accept" : "Reject";
  button.dataset.aiCanvasAction = intent;
  button.dataset.aiCanvasActionId = inlineId;
  button.disabled = disabled;
  button.addEventListener("mousedown", (event) => event.preventDefault());
  return button;
}

function createActionCard(action: CanvasAiInlineAction): HTMLElement {
  const status = action.status || "pending";
  const card = document.createElement("div");
  card.className = `ai-canvas-action-card is-${status}`;
  card.dataset.aiCanvasActionCard = action.inlineId;

  const header = document.createElement("div");
  header.className = "ai-canvas-action-card__header";

  const title = document.createElement("span");
  title.className = "ai-canvas-action-card__title";
  title.textContent = labelForAction(action);

  const badge = document.createElement("span");
  badge.className = "ai-canvas-action-card__status";
  badge.textContent = status;

  header.append(title, badge);

  const body = document.createElement("div");
  body.className = "ai-canvas-action-card__body";
  body.textContent = bodyForAction(action);

  card.append(header, body);

  if (action.error) {
    const error = document.createElement("div");
    error.className = "ai-canvas-action-card__error";
    error.textContent = action.error;
    card.appendChild(error);
  }

  if (status === "pending" || status === "failed" || status === "applying") {
    const actions = document.createElement("div");
    actions.className = "ai-canvas-action-card__actions";
    const disabled = status === "applying";
    actions.append(
      createButton(action.inlineId, "accept", disabled),
      createButton(action.inlineId, "reject", disabled),
    );
    card.appendChild(actions);
  }

  return card;
}

function createActionStack(actions: CanvasAiInlineAction[]): HTMLElement {
  const stack = document.createElement("div");
  stack.className = "ai-canvas-action-stack";
  stack.setAttribute("contenteditable", "false");
  stack.draggable = false;
  for (const action of actions) {
    stack.appendChild(createActionCard(action));
  }
  return stack;
}

export const AiCanvasActionsExtension = Extension.create({
  name: "canvasAiActions",

  addCommands() {
    return {
      setCanvasAiActions:
        (actions: CanvasAiInlineAction[]) =>
        ({ dispatch, tr }) => {
          if (dispatch) {
            dispatch(tr.setMeta(canvasAiActionsPluginKey, { type: "set", actions }));
          }
          return true;
        },

      clearCanvasAiActions:
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
          init: (): CanvasAiActionsState => ({ actions: [] }),
          apply(tr, value: CanvasAiActionsState): CanvasAiActionsState {
            const meta = tr.getMeta(canvasAiActionsPluginKey);
            if (!meta) return value;
            if (meta.type === "clear") return { actions: [] };
            if (meta.type === "set") {
              return {
                actions: Array.isArray(meta.actions) ? meta.actions : [],
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
            const actions = pluginState?.actions || [];
            if (!actions.length) return DecorationSet.empty;

            const grouped = new Map<number, CanvasAiInlineAction[]>();
            for (const action of actions) {
              const anchorIndex = anchorIndexForAction(action);
              if (anchorIndex === null) continue;
              const current = grouped.get(anchorIndex) || [];
              current.push(action);
              grouped.set(anchorIndex, current);
            }

            const decorations: Decoration[] = [];

            if (grouped.has(-1)) {
              decorations.push(
                Decoration.widget(0, () => createActionStack(grouped.get(-1) || []), {
                  side: -1,
                }),
              );
            }

            state.doc.forEach((node, offset, index) => {
              const actionsForBlock = grouped.get(index);
              if (!actionsForBlock?.length) return;
              decorations.push(
                Decoration.widget(
                  offset + node.nodeSize,
                  () => createActionStack(actionsForBlock),
                  { side: 1 },
                ),
              );
            });

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
