/**
 * Supported block kinds (paragraph, headings)
 */
export type CanvasBlockType =
  | "paragraph"
  | "heading1"
  | "heading2"
  | "heading3";

/**
 * Single block in a Notion-like canvas
 */
export interface CanvasBlock {
  id: string;
  type: CanvasBlockType;
  content: string;
}

/**
 * Persisted canvas content (version + list of blocks)
 */
export interface CanvasContent {
  version: number;
  blocks: CanvasBlock[];
}

/**
 * Raw block shape when parsing from API (partial / unknown)
 */
export interface RawCanvasBlock {
  id?: string;
  type?: string;
  content?: string;
}

/**
 * Raw content shape when parsing from API
 */
export interface RawCanvasContent {
  version?: number;
  blocks?: RawCanvasBlock[] | unknown[];
}

/**
 * Ref type for CanvasBlock component (exposes focusEl)
 */
export interface CanvasBlockComponentRef {
  focusEl: () => void;
}

/**
 * Canvas entity (from API)
 */
export interface Canvas {
  id: string;
  title: string;
  description?: string;
  content?: string | CanvasContent;  // thường API trả về string
  initialContent?: CanvasContent | Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Payload to create a new canvas
 */
export interface CreateCanvasPayload {
  title?: string;
  description?: string;
  initialContent?: CanvasContent | Record<string, unknown>;
}
