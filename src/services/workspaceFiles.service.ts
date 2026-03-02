export interface WorkspaceDocument {
  id: string;
  title: string;
  ownerName: string;
  workspaceId: string | number;
  visibility: "private" | "shared" | "public-workspace";
  updatedAt: string;
  location: string;
}

class WorkspaceFilesService {
  /**
   * Tạm thời trả về mock data cho trang Files/Canvas của workspace.
   * Sau này chỉ cần thay thế bằng gọi API thật.
   */
  async fetchWorkspaceDocuments(
    workspaceId: string | number
  ): Promise<WorkspaceDocument[]> {
    const now = new Date();

    const formatDate = (d: Date) =>
      d.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });

    return [
      {
        id: "canvas-1",
        title: "Getting Started with Canvas",
        ownerName: "Docs Assistant",
        workspaceId,
        visibility: "shared",
        updatedAt: formatDate(new Date(now.getTime() - 1000 * 60 * 60 * 24)),
        location: "Shared With Me",
      },
      {
        id: "canvas-2",
        title: "Weekly Planning",
        ownerName: "You",
        workspaceId,
        visibility: "private",
        updatedAt: formatDate(new Date(now.getTime() - 1000 * 60 * 45)),
        location: "My Canvas",
      },
      {
        id: "canvas-3",
        title: "Product Discovery Notes",
        ownerName: "Workspace Team",
        workspaceId,
        visibility: "public-workspace",
        updatedAt: formatDate(new Date(now.getTime() - 1000 * 60 * 5)),
        location: "Workspace",
      },
    ];
  }
}

const workspaceFilesService = new WorkspaceFilesService();

export default workspaceFilesService;

