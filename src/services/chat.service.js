import { CHAT_BASE_URL, API_ENDPOINTS } from '../config/api.js';
import axios from 'axios';

const chatApiService = axios.create({
  baseURL: CHAT_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add Bearer token to requests
chatApiService.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Channel API Service
 */
class ChatService {
  async getMessagesByChannelId (channelId, page = 1, size = 20) {
    const response = await chatApiService.post(API_ENDPOINTS.CHAT.GET_MESSAGES_BY_CHANNEL_ID(), {
      channelId,
      page,
      size
    });
    return response.data;
  }
}

const chatService = new ChatService();

export default chatService;