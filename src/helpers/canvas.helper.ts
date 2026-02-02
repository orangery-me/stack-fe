// canvasAdapter.ts
import type { CanvasContent, CanvasBlock } from "@/modules/channels/types";

export function canvasToTiptap(content: CanvasContent) {
  return {
    type: "doc",
    content: content.blocks.map((b) => ({
      type: mapType(b.type),
      attrs: { blockId: b.id },
      content: b.content ? [{ type: "text", text: b.content }] : [],
    })),
  };
}

export function tiptapToCanvas(doc: any): CanvasContent {
  return {
    version: 1,
    blocks:
      doc.content?.map((node: any) => ({
        id: node.attrs?.blockId ?? crypto.randomUUID(),
        type: reverseMapType(node.type),
        content: node.content?.[0]?.text ?? "",
      })) ?? [],
  };
}

function mapType(type: string) {
  if (type === "heading1") return "heading";
  if (type === "heading2") return "heading";
  return "paragraph";
}

function reverseMapType(type: string) {
  if (type === "heading") return "heading1";
  return "paragraph";
}
