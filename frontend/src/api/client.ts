import { tokenPairSchema, type TokenPair } from "./schemas";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(
  /\/$/,
  "",
);
const SESSION_KEY = "sova.auth.tokens";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function readTokens(): TokenPair | null {
  const stored = sessionStorage.getItem(SESSION_KEY);
  if (!stored) return null;
  try {
    const result = tokenPairSchema.safeParse(JSON.parse(stored));
    if (result.success) return result.data;
  } catch {
    // Invalid or stale browser state must never prevent the app from loading.
  }
  {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function hasStoredSession(): boolean {
  return readTokens() !== null;
}

export function storedRefreshToken(): string | null {
  return readTokens()?.refreshToken ?? null;
}

export function storeTokens(tokens: TokenPair): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(tokens));
}

export function clearTokens(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

async function responseMessage(response: Response): Promise<string> {
  try {
    const payload: unknown = await response.json();
    if (payload && typeof payload === "object" && "detail" in payload) {
      const detail = (payload as { detail: unknown }).detail;
      if (typeof detail === "string") return detail;
    }
  } catch {
    // The API may intentionally return an empty body.
  }
  return `Request failed with status ${response.status}.`;
}

let refreshRequest: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  const current = readTokens();
  if (!current) return false;
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: current.refreshToken }),
  });
  if (!response.ok) {
    clearTokens();
    return false;
  }
  storeTokens(tokenPairSchema.parse(await response.json()));
  return true;
}

export async function apiRequest(
  path: string,
  init: RequestInit = {},
  canRefresh = true,
): Promise<unknown> {
  const tokens = readTokens();
  const headers = new Headers(init.headers);
  if (tokens) headers.set("Authorization", `Bearer ${tokens.accessToken}`);
  if (init.body && !(init.body instanceof FormData))
    headers.set("Content-Type", "application/json");

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (response.status === 401 && tokens && canRefresh) {
    refreshRequest ??= refreshSession().finally(() => {
      refreshRequest = null;
    });
    if (await refreshRequest) return apiRequest(path, init, false);
  }
  if (!response.ok)
    throw new ApiError(await responseMessage(response), response.status);
  if (response.status === 204) return null;
  return response.json();
}

export async function apiDownload(path: string): Promise<Blob> {
  const tokens = readTokens();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: tokens ? { Authorization: `Bearer ${tokens.accessToken}` } : {},
  });
  if (!response.ok)
    throw new ApiError(await responseMessage(response), response.status);
  return response.blob();
}
