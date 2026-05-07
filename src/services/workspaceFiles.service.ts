import apiHelper from "@/helpers/api.helper.js";
import { API_ENDPOINTS } from "@/config/api.js";

export interface CanvasListItem {
  id: string;
  title: string;
  ownerId: string;
  owner?: {
    id: string;
    name: string;
    avatar?: string | null;
  };
  workspaceId: string;
  visibility: "private" | "shared" | "public-workspace";
  status: string;
  createdAt: string;
  updatedAt: string;
  canEdit?: boolean;
  isShared?: boolean;
}

class WorkspaceFilesService {
  async createCanvas(workspaceId: string, payload: { title: string; description?: string }) {
    const response = await apiHelper.post(
      API_ENDPOINTS.CANVAS_WORKSPACE.CREATE(workspaceId),
      payload,
    );
    return response.data.data as CanvasListItem;
  }

  async getMyCanvases(workspaceId: string): Promise<CanvasListItem[]> {
    const response = await apiHelper.get(
      API_ENDPOINTS.CANVAS_WORKSPACE.MY(workspaceId),
    );
    return response.data.data as CanvasListItem[];
  }

  async getRecentCanvases(workspaceId: string): Promise<CanvasListItem[]> {
    const response = await apiHelper.get(
      API_ENDPOINTS.CANVAS_WORKSPACE.RECENT(workspaceId),
    );
    return response.data.data as CanvasListItem[];
  }

  async getSharedWithMeCanvases(workspaceId: string): Promise<CanvasListItem[]> {
    const response = await apiHelper.get(
      API_ENDPOINTS.CANVAS_WORKSPACE.SHARED_WITH_ME(workspaceId),
    );
    return response.data.data as CanvasListItem[];
  }
}

const workspaceFilesService = new WorkspaceFilesService();

export default workspaceFilesService;

