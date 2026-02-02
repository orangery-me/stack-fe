import apiHelper from '@/helpers/api.helper.js';
import { API_ENDPOINTS } from '@/config/api.js';

/**
 * User API Service
 */
class UserService {
  /**
   * Search users by email or name
   * @param {string} query - Search query (email or name)
   * @param {number} [limit=10] - Maximum number of results
   * @returns {Promise<Array<{id: string, email: string, name: string, avatar?: string}>>}
   */
  async searchUsers(query, limit = 10) {
    const response = await apiHelper.get(API_ENDPOINTS.USERS.SEARCH, {
      params: { query, limit },
    });
    return response.data.data;
  }
}

export default new UserService();

