/**
 * Authentication API functions
 */

function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    const pathname = window.location.pathname;
    const modelScopeMatch = pathname.match(/^(\/studios\/[^/]+\/[^/]+)/);
    if (modelScopeMatch) return modelScopeMatch[1];
    const hfMatch = pathname.match(/^(\/spaces\/[^/]+\/[^/]+)/);
    if (hfMatch) return hfMatch[1];
  }
  return '';
}

const API_BASE = getApiBaseUrl();
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

export async function register(params: RegisterParams): Promise<User> {
  const response = await fetch(`${AUTH_API}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "注册失败" }));
    throw new Error(error.detail || "注册失败");
  }
  return response.json();
}

export async function login(params: LoginParams): Promise<TokenResponse> {
  const response = await fetch(`${AUTH_API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "登录失败" }));
    throw new Error(error.detail || "登录失败");
  }
  return response.json();
}

export async function refreshToken(refresh_token: string): Promise<TokenResponse> {
  const response = await fetch(`${AUTH_API}/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token }),
  });
  if (!response.ok) throw new Error('Token refresh failed');
  return response.json();
}

export async function getCurrentUser(accessToken: string): Promise<User> {
  const response = await fetch(`${AUTH_API}/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-Access-Token': accessToken,
    },
  });
  if (!response.ok) throw new Error('Failed to get user info');
  return response.json();
}

const ACCESS_TOKEN_KEY = 'momshell_access_token';
const REFRESH_TOKEN_KEY = 'momshell_refresh_token';
const REMEMBER_ME_KEY = 'momshell_remember_me';

export function saveTokens(tokens: TokenResponse, rememberMe: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(REMEMBER_ME_KEY, rememberMe.toString());
  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  storage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY) || sessionStorage.getItem(REFRESH_TOKEN_KEY);
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(REMEMBER_ME_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}
