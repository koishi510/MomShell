const API_BASE = "http://localhost:8000";
const AUTH_API = `${API_BASE}/api/v1/auth`;

export interface User {
  id: string;
  username: string;
  email: string;
  nickname: string;
  avatar_url: string | null;
  role: string;
  is_certified: boolean;
  certification_title: string | null;
  baby_birth_date: string | null;
  postpartum_weeks: number | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface RegisterParams {
  username: string;
  email: string;
  password: string;
  nickname: string;
  role?: "mom" | "dad" | "family";
}

export interface LoginParams {
  login: string;
  password: string;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const mergedHeaders = {
    ...defaultHeaders,
    ...(init?.headers as Record<string, string>),
  };
  const response = await fetch(url, {
    ...init,
    headers: mergedHeaders,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: "请求失败" }));
    const detail = err.detail;
    if (typeof detail === "string") {
      throw new Error(detail);
    }
    if (Array.isArray(detail) && detail.length > 0) {
      // FastAPI 422 validation errors: [{loc, msg, type}, ...]
      throw new Error(
        detail.map((e: { msg?: string }) => e.msg || "").join("; "),
      );
    }
    throw new Error("请求失败");
  }
  return response.json();
}

export function apiRegister(params: RegisterParams): Promise<User> {
  return fetchJson<User>(`${AUTH_API}/register`, {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function apiLogin(params: LoginParams): Promise<TokenResponse> {
  return fetchJson<TokenResponse>(`${AUTH_API}/login`, {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function apiRefresh(refresh_token: string): Promise<TokenResponse> {
  return fetchJson<TokenResponse>(`${AUTH_API}/refresh`, {
    method: "POST",
    body: JSON.stringify({ refresh_token }),
  });
}

export function apiGetMe(accessToken: string): Promise<User> {
  return fetchJson<User>(`${AUTH_API}/me`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "X-Access-Token": accessToken,
    },
  });
}

export function apiSetRole(
  accessToken: string,
  role: "mom" | "dad" | "family",
): Promise<User> {
  return fetchJson<User>(`${AUTH_API}/me/role`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "X-Access-Token": accessToken,
    },
    body: JSON.stringify({ role }),
  });
}

// Token storage
const ACCESS_TOKEN_KEY = "momshell_access_token";
const REFRESH_TOKEN_KEY = "momshell_refresh_token";
const REMEMBER_ME_KEY = "momshell_remember_me";

export function saveTokens(tokens: TokenResponse, rememberMe: boolean): void {
  localStorage.setItem(REMEMBER_ME_KEY, rememberMe.toString());
  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  storage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
}

export function getAccessToken(): string | null {
  return (
    localStorage.getItem(ACCESS_TOKEN_KEY) ||
    sessionStorage.getItem(ACCESS_TOKEN_KEY)
  );
}

export function getRefreshToken(): string | null {
  return (
    localStorage.getItem(REFRESH_TOKEN_KEY) ||
    sessionStorage.getItem(REFRESH_TOKEN_KEY)
  );
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(REMEMBER_ME_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}
