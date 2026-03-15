import axios, {
  type AxiosInstance,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";
import { apiRefresh } from "./auth";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

// In-memory access token — not stored in localStorage
let currentAccessToken: string | null = null;

// Callback for notifying external consumers (e.g. Pinia store) of token changes.
// Only one callback is supported — subsequent calls to setOnTokenRefreshed
// overwrite the previous one. This is intentional for a single-page app with
// one auth store instance.
let onTokenRefreshed: ((token: string | null) => void) | null = null;

export function setAccessToken(token: string | null) {
  currentAccessToken = token;
}

export function getAccessToken(): string | null {
  return currentAccessToken;
}

export function setOnTokenRefreshed(cb: (token: string | null) => void) {
  onTokenRefreshed = cb;
}

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // Send cookies for refresh token
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

function processQueue(error: Error | null, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
}

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (currentAccessToken && config.headers) {
      config.headers.Authorization = `Bearer ${currentAccessToken}`;
      config.headers["X-Access-Token"] = currentAccessToken;
    }
    // Let browser set Content-Type with boundary for FormData
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }
    return config;
  },
  (error) => {
    throw error;
  },
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => {
            throw err;
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Refresh token is sent automatically via httpOnly cookie
        const resp = await apiRefresh();
        currentAccessToken = resp.access_token;

        // Notify store so isAuthenticated stays in sync
        if (onTokenRefreshed) {
          onTokenRefreshed(resp.access_token);
        }

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${resp.access_token}`;
        }

        processQueue(null, resp.access_token);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        currentAccessToken = null;
        if (onTokenRefreshed) {
          onTokenRefreshed(null);
        }
        throw refreshError;
      } finally {
        isRefreshing = false;
      }
    }

    throw error;
  },
);

export default apiClient;

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as Record<string, unknown> | undefined;
    // Gin backend: {"error": "..."}
    if (data && typeof data.error === "string") return data.error;
    // FastAPI-style: {"detail": "..."}
    const detail = data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      return detail.map((e: { msg?: string }) => e.msg || "").join("; ");
    }
    if (detail && typeof detail === "object" && "message" in detail) {
      return (detail as { message?: string }).message || "请求失败";
    }
    return error.message || "请求失败";
  }
  if (error instanceof Error) return error.message;
  return "未知错误";
}
