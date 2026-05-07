// canvasAdapter.ts
import type { CanvasContent, CanvasBlock } from "@/modules/channels/types";

export function canvasToTiptap(content: CanvasContent) {
  // return {
  //   type: "doc",
  //   content: content.blocks.map((b) => ({
  //     type: mapType(b.type),
  //     attrs: { blockId: b.id },
  //     content: b.content ? [{ type: "text", text: b.content }] : [],
  //   })),
  // };
  return content;
}

export function tiptapToCanvas(doc: any): CanvasContent {
  // return {
  //   version: 1,
  //   blocks:
  //     doc.content?.map((node: any) => ({
  //       id: node.attrs?.blockId ?? crypto.randomUUID(),
  //       type: reverseMapType(node.type),
  //       content: node.content?.[0]?.text ?? "",
  //     })) ?? [],
  // };
  console.log(doc);
  return doc;
}