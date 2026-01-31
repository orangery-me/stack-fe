import { defineStore } from "pinia";
import canvasService from "@/services/canvas.service.js";
import type {
  Canvas,
  CanvasContent,
  CreateCanvasPayload,
} from "@/modules/channels/types";

export type { Canvas, CreateCanvasPayload } from "@/modules/channels/types";

export interface CanvasState {
  canvases: Canvas[];
  canvasesLoading: boolean;
  canvasesError: Error | null;

  selectedCanvas: Canvas | null;
  selectedCanvasLoading: boolean;
  selectedCanvasError: Error | null;

  createCanvasLoading: boolean;
  createCanvasError: Error | null;

  saveContentLoading: boolean;
  saveContentError: Error | null;

  autoSaveTimeoutId: ReturnType<typeof setTimeout> | null;
}

export const useCanvasStore = defineStore("canvas", {
  state: (): CanvasState => ({
    canvases: [],
    canvasesLoading: false,
    canvasesError: null,

    selectedCanvas: null,
    selectedCanvasLoading: false,
    selectedCanvasError: null,

    createCanvasLoading: false,
    createCanvasError: null,

    saveContentLoading: false,
    saveContentError: null,

    autoSaveTimeoutId: null,
  }),

  actions: {
    async fetchCanvases(
      workspaceId: string,
      channelId: string
    ): Promise<Canvas[] | undefined> {
      if (!workspaceId || !channelId) return;

      this.canvasesLoading = true;
      this.canvasesError = null;
      try {
        const list = (await canvasService.getCanvases(
          workspaceId,
          channelId
        )) as Canvas[];
        this.canvases = list;
        return list;
      } catch (error) {
        this.canvasesError = error as Error;
        throw error;
      } finally {
        this.canvasesLoading = false;
      }
    },

    async createCanvas(
      workspaceId: string,
      channelId: string,
      data?: CreateCanvasPayload
    ): Promise<Canvas | null> {
      if (!workspaceId || !channelId) return null;

      this.createCanvasLoading = true;
      this.createCanvasError = null;
      try {
        const payload: CreateCanvasPayload = {
          title: data?.title ?? "New page",
          description: data?.description,
          initialContent: data?.initialContent,
        };

        const created = (await canvasService.createCanvas(
          workspaceId,
          channelId,
          payload
        )) as Canvas;
        this.canvases.push(created);
        this.selectedCanvas = created;
        return created;
      } catch (error) {
        this.createCanvasError = error as Error;
        throw error;
      } finally {
        this.createCanvasLoading = false;
      }
    },

    async selectCanvas(
      workspaceId: string,
      channelId: string,
      canvasId: string
    ): Promise<Canvas | null> {
      if (!workspaceId || !channelId || !canvasId) {
        this.selectedCanvas = null;
        return null;
      }

      this.selectedCanvasLoading = true;
      this.selectedCanvasError = null;
      try {
        const detail = (await canvasService.getCanvas(
          workspaceId,
          channelId,
          canvasId
        )) as Canvas;
        this.selectedCanvas = detail;
        return detail;
      } catch (error) {
        this.selectedCanvasError = error as Error;
        throw error;
      } finally {
        this.selectedCanvasLoading = false;
      }
    },

    async saveCanvasContent(
      workspaceId: string,
      channelId: string,
      canvasId: string,
      content: string | CanvasContent
    ): Promise<Canvas | null> {
      if (!workspaceId || !channelId || !canvasId) return null;

      this.saveContentLoading = true;
      this.saveContentError = null;
      try {
        const payload =
          typeof content === "string" ? content : JSON.stringify(content);
        const updated = (await canvasService.saveCanvasContent(
          workspaceId,
          channelId,
          canvasId,
          payload
        )) as Canvas;

        const index = this.canvases.findIndex((c) => c.id === updated.id);
        if (index !== -1) {
          this.canvases.splice(index, 1, updated);
        }

        // chỉ update selectedCanvas nếu nó vẫn đang là canvas đó
        if (this.selectedCanvas?.id === updated.id) {
          this.selectedCanvas = updated;
        }

        return updated;
      } catch (error) {
        this.saveContentError = error as Error;
        throw error;
      } finally {
        this.saveContentLoading = false;
      }
    },

    scheduleAutoSave(
      workspaceId: string,
      channelId: string,
      canvasId: string,
      content: string | CanvasContent,
      delay = 3000
    ): void {
      if (this.autoSaveTimeoutId) {
        clearTimeout(this.autoSaveTimeoutId);
      }

      this.autoSaveTimeoutId = setTimeout(() => {
        this.saveCanvasContent(workspaceId, channelId, canvasId, content)
          .catch(() => {
            // errors stored in saveContentError, UI can react
          })
          .finally(() => {
            this.autoSaveTimeoutId = null;
          });
      }, delay);
    },

    clearCanvases(): void {
      this.canvases = [];
      this.selectedCanvas = null;
      this.canvasesError = null;
      this.selectedCanvasError = null;
    },
  },
});
