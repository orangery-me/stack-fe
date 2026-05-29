import apiHelper from '@/helpers/api.helper.js';
import type {
  HuddleJoinResponse,
  HuddleStatusResponse,
  HuddleStateUpdate,
} from '../types/huddle.types';

class HuddleService {
  private buildUrl(channelId: string, path = '') {
    return `/v1/channels/${channelId}/huddle${path}`;
  }

  async getStatus(channelId: string): Promise<HuddleStatusResponse> {
    const response = await apiHelper.get(this.buildUrl(channelId));
    return response.data;
  }

  async createHuddle(channelId: string): Promise<HuddleJoinResponse> {
    const response = await apiHelper.post(this.buildUrl(channelId));
    return response.data;
  }

  async joinHuddle(channelId: string, sessionId: string): Promise<HuddleJoinResponse> {
    const response = await apiHelper.post(this.buildUrl(channelId, '/join'), { sessionId });
    return response.data;
  }

  async leaveHuddle(channelId: string): Promise<{ left: boolean; callEnded: boolean }> {
    const response = await apiHelper.post(this.buildUrl(channelId, '/leave'));
    return response.data;
  }

  async updateState(channelId: string, state: HuddleStateUpdate): Promise<{ updated: boolean; micEnabled: boolean; cameraEnabled: boolean }> {
    const response = await apiHelper.patch(this.buildUrl(channelId, '/state'), state);
    return response.data;
  }

  async transferDevice(channelId: string, pendingSessionId: string, confirm: boolean): Promise<any> {
    const response = await apiHelper.post(this.buildUrl(channelId, '/transfer'), { pendingSessionId, confirm });
    return response.data;
  }

  async refreshToken(channelId: string): Promise<{ livekitToken: string; expiresIn: number }> {
    const response = await apiHelper.post(this.buildUrl(channelId, '/token'));
    return response.data;
  }
}

export const huddleService = new HuddleService();
