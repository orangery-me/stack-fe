import apiHelper from '@/helpers/api.helper.js';
import { API_ENDPOINTS } from '@/config/api.js';
class ChatService {
  constructor() { 
    
  }
  async getMessages (workspaceId, channelId, page = 1, size = 20) {
    const response = await apiHelper.get(
      API_ENDPOINTS.CHAT.GET_MESSAGES(workspaceId, channelId),
      { params: { page, size } }
    );
    return response.data;
  }

  async sendMessage (workspaceId, channelId, content, messageType = 'text', metadata) {
    const response = await apiHelper.post(
      API_ENDPOINTS.CHAT.SEND_MESSAGE(workspaceId, channelId),
      { content, messageType, metadata }
    );
    return response.data;
  }

  async uploadAttachment (workspaceId, channelId, file, kind = 'file') {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiHelper.post(
      API_ENDPOINTS.CHAT.UPLOAD_ATTACHMENT(workspaceId, channelId),
      formData,
      {
        params: { kind },
        headers: { 'Content-Type': false },
      }
    );
    return response.data.data;
  }

  async pinMessage (workspaceId, channelId, messageId) {
    const response = await apiHelper.post(
      API_ENDPOINTS.CHAT.PIN_MESSAGE(workspaceId, channelId, messageId)
    );
    return response.data;
  }

  async unpinMessage (workspaceId, channelId, messageId) {
    const response = await apiHelper.delete(
      API_ENDPOINTS.CHAT.PIN_MESSAGE(workspaceId, channelId, messageId)
    );
    return response.data;
  }

  async deleteMessage (workspaceId, channelId, messageId) {
    const response = await apiHelper.delete(
      API_ENDPOINTS.CHAT.DELETE_MESSAGE(workspaceId, channelId, messageId)
    );
    return response.data;
  }
}

const chatService = new ChatService();

export default chatService;
