import apiHelper from '@/helpers/api.helper.js';
import { API_BASE_URL, API_ENDPOINTS } from '@/config/api.js';

/**
 * Agent API – gửi message tới AI agent, tùy chọn provider (openai/gemini) và model (vd: gpt-4o).
 * @param {Object} params
 * @param {string} params.message - Nội dung câu hỏi
 * @param {string} [params.provider] - "openai" | "gemini"
 * @param {string} [params.model] - e.g. "gpt-4o", "gpt-4", "gemini-1.5-pro"
 * @returns {Promise<{ response: string }>}
 */
export async function askAgent({ message, provider, model }) {
  const response = await apiHelper.post(API_ENDPOINTS.AGENT.ASK, {
    message,
    ...(provider && { provider }),
    ...(model && { model }),
  });
  return response.data?.data ?? response.data;
}

/**
 * Streaming agent API – nhận token streaming qua SSE.
 * @param {Object} params
 * @param {string} params.message - Nội dung câu hỏi
 * @param {string} [params.provider] - "openai" | "gemini"
 * @param {string} [params.model] - model identifier
 * @param {AbortSignal} [params.signal] - AbortSignal để huỷ stream giữa chừng
 * @param {(chunk: string) => void} params.onChunk - callback nhận từng token
 * @param {() => void} [params.onDone] - callback khi stream kết thúc
 * @param {(err: Error) => void} [params.onError] - callback khi có lỗi
 * @returns {Promise<void>}
 */
export async function askAgentStream({ message, provider, model, signal, onChunk, onDone, onError }) {
  const accessToken = localStorage.getItem('accessToken');

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AGENT.ASK_STREAM}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
      body: JSON.stringify({
        message,
        ...(provider && { provider }),
        ...(model && { model }),
      }),
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') return;
    onError?.(err);
    return;
  }

  if (!response.ok) {
    onError?.(new Error(`HTTP ${response.status}: ${response.statusText}`));
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        const dataStr = trimmed.slice(6).trim();

        if (dataStr === '[DONE]') {
          onDone?.();
          return;
        }

        try {
          const data = JSON.parse(dataStr);
          if (data.error) {
            onError?.(new Error(data.error));
            return;
          }
          if (typeof data.chunk === 'string' && data.chunk) {
            onChunk?.(data.chunk);
          }
        } catch {
          // skip malformed SSE lines
        }
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') return;
    onError?.(err);
    return;
  }

  onDone?.();
}
