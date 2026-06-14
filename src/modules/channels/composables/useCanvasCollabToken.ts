import type { HocuspocusProvider } from "@hocuspocus/provider";
import canvasService from "@/services/canvas.service";

const TOKEN_REFRESH_SKEW_MS = 60_000;

type CanvasCollabTokenProvider = {
  getToken: () => Promise<string>;
  clear: () => void;
};

type CanvasCollabAuthHandlersOptions = {
  onAuthenticationFailed?: (reason: string) => void;
  onTokenRefreshed?: () => void;
};

type JwtPayload = {
  exp?: number;
};

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  const binary = window.atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function getTokenExpiresAt(token: string): number | null {
  try {
    const [, encodedPayload] = token.split(".");
    if (!encodedPayload) return null;
    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as JwtPayload;
    return payload.exp ? payload.exp * 1000 : null;
  } catch (error) {
    console.warn("[CanvasCollabToken] Failed to decode token expiry:", error);
    return null;
  }
}

function isRetryableAuthFailure(reason: string): boolean {
  const normalized = reason.toLowerCase();
  return (
    normalized.includes("token-expired") ||
    normalized.includes("invalid-token")
  );
}

export function createCanvasCollabTokenProvider(
  canvasId: string,
): CanvasCollabTokenProvider {
  let cachedToken: string | null = null;
  let cachedExpiresAt = 0;
  let inFlight: Promise<string> | null = null;

  async function fetchToken(): Promise<string> {
    const session = await canvasService.getCanvasCollabToken(canvasId);
    cachedToken = session.token;
    cachedExpiresAt =
      getTokenExpiresAt(session.token) ?? Date.now() + TOKEN_REFRESH_SKEW_MS;
    return session.token;
  }

  return {
    async getToken() {
      const shouldRefresh =
        !cachedToken || cachedExpiresAt - TOKEN_REFRESH_SKEW_MS <= Date.now();

      if (!shouldRefresh) {
        return cachedToken;
      }

      if (!inFlight) {
        inFlight = fetchToken().finally(() => {
          inFlight = null;
        });
      }

      return inFlight;
    },
    clear() {
      cachedToken = null;
      cachedExpiresAt = 0;
      inFlight = null;
    },
  };
}

export function attachCanvasCollabAuthHandlers(
  provider: HocuspocusProvider,
  tokenProvider: CanvasCollabTokenProvider,
  options: CanvasCollabAuthHandlersOptions = {},
) {
  let retryingAuth = false;

  provider.on("authenticated", () => {
    retryingAuth = false;
  });

  provider.on("authenticationFailed", ({ reason }: { reason: string }) => {
    tokenProvider.clear();

    if (!isRetryableAuthFailure(reason) || retryingAuth) {
      options.onAuthenticationFailed?.(reason);
      return;
    }

    retryingAuth = true;
    options.onTokenRefreshed?.();

    window.setTimeout(() => {
      provider.configuration.websocketProvider.disconnect();
      void provider.configuration.websocketProvider.connect();
    }, 0);
  });
}
