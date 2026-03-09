const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const AUTH_API = `${API_BASE}/api/v1/auth`;

export interface User {
  id: string;
  username: string;
  email: string;
  nickname: string;
  avatar_url: string | null;
  role: string;
  is_admin: boolean;
  is_certified: boolean;
  certification_title: string | null;
  baby_birth_date: string | null;
  postpartum_weeks: number | null;
  created_at: string;
}

export interface AccessTokenResponse {
  access_token: string;
  expires_in: number;
}

export interface RegisterParams {
  username: string;
  email: string;
  password: string;
  nickname: string;
  role?: "mom" | "dad";
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
    credentials: "include", // Send cookies (for refresh token)
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    // Gin backend returns { "error": "..." }
    if (typeof err.error === "string") {
      throw new Error(err.error);
    }
    // FastAPI-style { "detail": "..." }
    const detail = err.detail;
    if (typeof detail === "string") {
      throw new Error(detail);
    }
    if (Array.isArray(detail) && detail.length > 0) {
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

export function apiLogin(params: LoginParams): Promise<AccessTokenResponse> {
  return fetchJson<AccessTokenResponse>(`${AUTH_API}/login`, {
    method: "POST",
    body: JSON.stringify(params),
  });
}

// Refresh token is sent automatically via httpOnly cookie
export function apiRefresh(): Promise<AccessTokenResponse> {
  return fetchJson<AccessTokenResponse>(`${AUTH_API}/refresh`, {
    method: "POST",
  });
}

export function apiGetMe(accessToken: string): Promise<User> {
  return fetchJson<User>(`${AUTH_API}/me`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export function apiSetRole(
  accessToken: string,
  role: "mom" | "dad",
): Promise<User> {
  return fetchJson<User>(`${AUTH_API}/me/role`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ role }),
  });
}

export function apiLogout(accessToken: string): Promise<void> {
  return fetch(`${AUTH_API}/logout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: "include",
  }).then(() => undefined);
}
