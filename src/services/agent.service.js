import apiHelper from '@/helpers/api.helper.js';
import { API_BASE_URL, API_ENDPOINTS } from '@/config/api.js';

// ---- Shared SSE stream helper ----

async function _fetchSSEStream(url, body, { signal, onChunk, onDone, onError } = {}) {
  const accessToken = localStorage.getItem('accessToken');

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
      body: JSON.stringify(body),
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

// ---- Legacy single-shot (no session) ----

/**
 * @param {{ message: string, provider?: string, model?: string }} params
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
 * @param {{ message: string, provider?: string, model?: string, signal?: AbortSignal, onChunk: Function, onDone?: Function, onError?: Function }} params
 */
export async function askAgentStream({ message, provider, model, signal, onChunk, onDone, onError }) {
  await _fetchSSEStream(
    API_ENDPOINTS.AGENT.ASK_STREAM,
    { message, ...(provider && { provider }), ...(model && { model }) },
    { signal, onChunk, onDone, onError },
  );
}

// ---- Session management ----

/**
 * Get or create the active AI chat session for the current user.
 * @returns {Promise<Session>}
 */
export async function getActiveSession() {
  const response = await apiHelper.get(API_ENDPOINTS.AGENT.SESSIONS_ACTIVE);
  return response.data?.data ?? response.data;
}

/**
 * List all sessions for the current user.
 * @returns {Promise<Session[]>}
 */
export async function listSessions() {
  const response = await apiHelper.get(API_ENDPOINTS.AGENT.SESSIONS);
  return response.data?.data ?? response.data;
}

/**
 * Create a new chat session (archives current active session).
 * @param {string} [title]
 * @returns {Promise<Session>}
 */
export async function createSession(title) {
  const response = await apiHelper.post(API_ENDPOINTS.AGENT.SESSIONS, { title });
  return response.data?.data ?? response.data;
}

/**
 * Get messages for a session.
 * @param {string} sessionId
 * @param {{ page?: number, size?: number }} [pagination]
 * @returns {Promise<{ messages: ChatMessage[], total: number, hasMore: boolean }>}
 */
export async function getSessionMessages(sessionId, { page = 1, size = 50 } = {}) {
  const response = await apiHelper.get(
    `${API_ENDPOINTS.AGENT.SESSION_MESSAGES(sessionId)}?page=${page}&size=${size}`,
  );
  return response.data?.data ?? response.data;
}

/**
 * Update session metadata (e.g. rename title).
 * @param {string} sessionId
 * @param {string} title
 * @returns {Promise<Session>}
 */
export async function updateSession(sessionId, title) {
  const response = await apiHelper.patch(API_ENDPOINTS.AGENT.SESSION_UPDATE(sessionId), { title });
  return response.data?.data ?? response.data;
}

/**
 * Send a message in a session with SSE streaming.
 * @param {string} sessionId
 * @param {{ message: string, provider?: string, model?: string, signal?: AbortSignal, onChunk: Function, onDone?: Function, onError?: Function }} params
 */
export async function sendMessageStream(sessionId, { message, provider, model, signal, onChunk, onDone, onError }) {
  await _fetchSSEStream(
    API_ENDPOINTS.AGENT.SESSION_SEND_STREAM(sessionId),
    { message, ...(provider && { provider }), ...(model && { model }) },
    { signal, onChunk, onDone, onError },
  );
}

/**
 * Canvas AI Writer — stream AI-generated content to insert into the canvas.
 * @param {{ canvasContent: string, userRequest: string, provider?: string, model?: string, signal?: AbortSignal, onChunk: Function, onDone?: Function, onError?: Function }} params
 */
export async function sendCanvasAiWriteStream({ canvasContent, userRequest, provider, model, signal, onChunk, onDone, onError }) {
  await _fetchSSEStream(
    API_ENDPOINTS.AGENT.CANVAS_WRITE_STREAM,
    {
      canvasContent: canvasContent ?? '',
      userRequest,
      ...(provider && { provider }),
      ...(model && { model }),
    },
    { signal, onChunk, onDone, onError },
  );
}
