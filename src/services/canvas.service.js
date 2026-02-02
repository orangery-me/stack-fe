import apiHelper from "@/helpers/api.helper.js";
import { API_ENDPOINTS } from "@/config/api.js";

/**
 * Canvas API Service
 */
class CanvasService {
  /**
   * Get all canvases in a channel for current user
   * @param {string} workspaceId
   * @param {string} channelId
   * @returns {Promise<Array>}
   */
  async getCanvases(workspaceId, channelId) {
    const response = await apiHelper.get(
      API_ENDPOINTS.CANVAS.GET_ALL(workspaceId, channelId),
    );
    return response.data.data;
  }

  /**
   * Create a new canvas in a channel
   * @param {string} workspaceId
   * @param {string} channelId
   * @param {Object} data
   * @param {string} data.title
   * @param {string} [data.description]
   * @param {Object} [data.initialContent]
   * @returns {Promise<Object>}
   */
  async createCanvas(workspaceId, channelId, data) {
    const response = await apiHelper.post(
      API_ENDPOINTS.CANVAS.CREATE(workspaceId, channelId),
      data,
    );
    return response.data.data;
  }

  /**
   * Get canvas detail (with current content)
   * @param {string} workspaceId
   * @param {string} channelId
   * @param {string} canvasId
   * @returns {Promise<Object>}
   */
  async getCanvas(workspaceId, channelId, canvasId) {
    const response = await apiHelper.get(
      API_ENDPOINTS.CANVAS.GET_BY_ID(workspaceId, channelId, canvasId),
    );
    return response.data.data;
  }

  /**
   * Update canvas (title only; không lưu chung với content)
   * @param {string} workspaceId
   * @param {string} channelId
   * @param {string} canvasId
   * @param {{ title?: string }} data
   * @returns {Promise<Object>}
   */
  async updateCanvas(workspaceId, channelId, canvasId, data) {
    const response = await apiHelper.patch(
      API_ENDPOINTS.CANVAS.UPDATE(workspaceId, channelId, canvasId),
      data,
    );
    return response.data.data;
  }

  /**
   * Save canvas content (auto-save)
   * @param {string} workspaceId
   * @param {string} channelId
   * @param {string} canvasId
   * @param {Object} content
   * @returns {Promise<Object>}
   */
  async saveCanvasContent(workspaceId, channelId, canvasId, content) {
    const response = await apiHelper.put(
      API_ENDPOINTS.CANVAS.SAVE_CONTENT(workspaceId, channelId, canvasId),
      { content },
    );
    return response.data.data;
  }
}

export default new CanvasService();

