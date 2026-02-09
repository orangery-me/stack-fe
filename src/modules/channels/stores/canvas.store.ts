import { defineStore } from "pinia";
import canvasService from "@/services/canvas.service.js";
import type {
  Canvas,
  CanvasContent,
  CreateCanvasPayload,
} from "@/modules/channels/types";

export type { Canvas, CreateCanvasPayload } from "@/modules/channels/types";

export interface CanvasState {
  canvases: Canvas[] | null;
  canvasesLoading: boolean;
  canvasesError: Error | null;
  selectedCanvasId: string | null;

  createCanvasLoading: boolean;
  createCanvasError: Error | null;

  saveContentLoading: boolean;
  saveContentError: Error | null;

  autoSaveTimeoutId: ReturnType<typeof setTimeout> | null;
}

export const useCanvasStore = defineStore("canvas", {
  state: (): CanvasState => ({
    canvases: null,
    canvasesLoading: false,
    canvasesError: null,
    selectedCanvasId: null,

    createCanvasLoading: false,
    createCanvasError: null,

    saveContentLoading: false,
    saveContentError: null,

    autoSaveTimeoutId: null,
  }),

  actions: {
    async fetchCanvases(channelId: string): Promise<Canvas[] | undefined> {
      if (!channelId) return;

      this.canvasesLoading = true;
      this.canvasesError = null;
      try {
        const list = (await canvasService.getCanvases(channelId)) as Canvas[];
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
      channelId: string,
      data?: CreateCanvasPayload
    ): Promise<Canvas | null> {
      if (!channelId) return null;

      this.createCanvasLoading = true;
      this.createCanvasError = null;
      try {
        const payload: CreateCanvasPayload = {
          title: data?.title ?? "New page",
          description: data?.description,
          initialContent: data?.initialContent,
        };

        const created = (await canvasService.createCanvas(
          channelId,
          payload
        )) as Canvas;
        this.canvases.push(created);
        this.selectedCanvasId = created.id;
        return created;
      } catch (error) {
        this.createCanvasError = error as Error;
        throw error;
      } finally {
        this.createCanvasLoading = false;
      }
    },

    async selectCanvas(canvasId: string): Promise<string | null> {
      if (!canvasId) {
        this.selectedCanvasId = null;
        return null;
      }

      // Không còn fetch nội dung canvas ở store.
      // Chỉ lưu lại id, phần nội dung để TanStack Query xử lý.
      this.selectedCanvasId = canvasId;
      return canvasId;
    },

    async updateCanvasTitle(
      canvasId: string,
      title: string
    ): Promise<Canvas | null> {
      if (!canvasId) return null;

      try {
        const updated = (await canvasService.updateCanvas(canvasId, {
          title: title.trim() || "New page",
        })) as Canvas;

        const index = this.canvases.findIndex((c) => c.id === updated.id);
        if (index !== -1) {
          this.canvases.splice(index, 1, updated);
        }
        return updated;
      } catch (error) {
        throw error;
      }
    },

    async saveCanvasContent(
      canvasId: string,
      content: string | CanvasContent
    ): Promise<Canvas | null> {
      if (!canvasId) return null;

      this.saveContentLoading = true;
      this.saveContentError = null;
      try {
        const payload =
          typeof content === "string" ? content : JSON.stringify(content);
        const updated = (await canvasService.saveCanvasContent(
          canvasId,
          payload
        )) as Canvas;

        const index = this.canvases.findIndex((c) => c.id === updated.id);
        if (index !== -1) {
          this.canvases.splice(index, 1, updated);
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
      canvasId: string,
      content: string | CanvasContent,
      delay = 3000
    ): void {
      if (this.autoSaveTimeoutId) {
        clearTimeout(this.autoSaveTimeoutId);
      }

      this.autoSaveTimeoutId = setTimeout(() => {
        this.saveCanvasContent(canvasId, content)
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
      this.selectedCanvasId = null;
      this.canvasesError = null;
    },
  },
});
