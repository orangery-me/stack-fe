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

  async sendMessage (workspaceId, channelId, content, messageType = 'text') {
    const response = await apiHelper.post(
      API_ENDPOINTS.CHAT.SEND_MESSAGE(workspaceId, channelId),
      { content, messageType }
    );
    return response.data;
  }
}

const chatService = new ChatService();

export default chatService;