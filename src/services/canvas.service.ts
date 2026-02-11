import apiHelper from "@/helpers/api.helper.js";
import { API_ENDPOINTS } from "@/config/api.js";
import type {
  Canvas,
  CanvasVersion,
  CreateCanvasPayload,
} from "@/modules/channels/types/canvas.types";

/**
 * Canvas API Service – khớp với backend @Controller('/canvases')
 */
class CanvasService {
  /** GET /canvases?channelId= – lấy danh sách canvas trong channel */
  async getCanvases(channelId: string): Promise<Canvas[]> {
    const response = await apiHelper.get(
      API_ENDPOINTS.CANVAS.GET_ALL(channelId)
    );
    return response.data.data as Canvas[];
  }

  /** POST /canvases?channelId= – tạo canvas mới trong channel */
  async createCanvas(
    channelId: string,
    data: CreateCanvasPayload
  ): Promise<Canvas> {
    const response = await apiHelper.post(
      API_ENDPOINTS.CANVAS.CREATE(channelId),
      data
    );
    return response.data.data as Canvas;
  }

  /** GET /canvases/:canvasId – lấy chi tiết 1 canvas (kèm nội dung hiện tại) */
  async getCanvas(canvasId: string): Promise<Canvas> {
    const response = await apiHelper.get(
      API_ENDPOINTS.CANVAS.GET_BY_ID(canvasId)
    );
    return response.data.data as Canvas;
  }

  /** PATCH /canvases/:canvasId – cập nhật canvas (title, không gắn content) */
  async updateCanvas(
    canvasId: string,
    data: { title?: string }
  ): Promise<Canvas> {
    const response = await apiHelper.patch(
      API_ENDPOINTS.CANVAS.UPDATE(canvasId),
      data
    );
    return response.data.data as Canvas;
  }

  /** PUT /canvases/:canvasId/content – auto-save nội dung canvas */
  async saveCanvasContent(canvasId: string, content: unknown): Promise<Canvas> {
    const response = await apiHelper.put(
      API_ENDPOINTS.CANVAS.SAVE_CONTENT(canvasId),
      { content }
    );
    return response.data.data as Canvas;
  }

  /** GET /canvases/:canvasId/versions – danh sách version */
  async getCanvasVersions(canvasId: string): Promise<CanvasVersion[]> {
    const response = await apiHelper.get(
      API_ENDPOINTS.CANVAS.GET_VERSIONS(canvasId)
    );
    return response.data.data as CanvasVersion[];
  }

  /** GET /canvases/:canvasId/versions/:version – chi tiết 1 version */
  async getCanvasVersion(
    canvasId: string,
    version: number
  ): Promise<CanvasVersion> {
    const response = await apiHelper.get(
      API_ENDPOINTS.CANVAS.GET_VERSION(canvasId, version)
    );
    return response.data.data as CanvasVersion;
  }

  /** POST /canvases/:canvasId/versions – lưu version từ nội dung hiện tại */
  async createCanvasVersion(canvasId: string): Promise<CanvasVersion> {
    const response = await apiHelper.post(
      API_ENDPOINTS.CANVAS.CREATE_VERSION(canvasId)
    );
    return response.data.data as CanvasVersion;
  }

  /** POST /canvases/:canvasId/versions/:version/revert – revert về version cũ */
  async revertCanvasVersion(
    canvasId: string,
    version: number
  ): Promise<Canvas> {
    const response = await apiHelper.post(
      API_ENDPOINTS.CANVAS.REVERT_VERSION(canvasId, version)
    );
    return response.data.data as Canvas;
  }
}

const canvasService = new CanvasService();
export default canvasService;
