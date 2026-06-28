import { Extension } from "@tiptap/core";

const CANVAS_BLOCK_TYPES = [
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "codeBlock",
  "horizontalRule",
];

export const CanvasBlockIdExtension = Extension.create({
  name: "canvasBlockId",

  addGlobalAttributes() {
    return [
      {
        types: CANVAS_BLOCK_TYPES,
        attributes: {
          id: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-block-id") || element.getAttribute("id"),
            renderHTML: (attributes) => {
              if (!attributes.id) return {};
              return {
                "data-block-id": attributes.id,
              };
            },
          },
        },
      },
    ];
  },
});
