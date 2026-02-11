// frontend/lib/apiClient.ts
/**
 * Axios-based API client with automatic Bearer token injection and refresh
 */

import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";
import {
  getAccessToken,
  getRefreshToken,
  saveTokens,
  clearTokens,
  refreshToken,
} from "./auth";
import { getUserId } from "./user";

/**
 * Detect API base URL at runtime.
 * Handles ModelScope/HuggingFace Spaces where app is hosted under a subpath.
 */
function getApiBaseUrl(): string {
  // If explicitly set via env var, use it
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // In browser, detect base path from URL
  if (typeof window !== "undefined") {
    const pathname = window.location.pathname;

    // ModelScope pattern: /studios/{user}/{app}/...
    const modelScopeMatch = pathname.match(/^(\/studios\/[^/]+\/[^/]+)/);
    if (modelScopeMatch) {
      return modelScopeMatch[1];
    }

    // HuggingFace Spaces pattern: /spaces/{user}/{app}/...
    const hfMatch = pathname.match(/^(\/spaces\/[^/]+\/[^/]+)/);
    if (hfMatch) {
      return hfMatch[1];
    }
  }

  // Default: relative to root (local development / direct Docker access)
  return "";
}

const API_BASE = getApiBaseUrl();

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor to add Bearer token or X-User-ID fallback
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      // Send token via both Authorization header and X-Access-Token
      // Some proxies (like ModelScope) strip Authorization header
      config.headers.Authorization = `Bearer ${token}`;
      config.headers["X-Access-Token"] = token;
    } else if (config.headers) {
      // Fallback to X-User-ID for backward compatibility (development mode)
      config.headers["X-User-ID"] = getUserId();
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor to handle 401 and refresh token
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Only try to refresh if we have a token (not in dev mode with X-User-ID)
      const currentRefreshToken = getRefreshToken();
      if (!currentRefreshToken) {
        // No refresh token - either dev mode or not logged in
        // Don't redirect automatically, let the calling code handle it
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // If already refreshing, queue this request
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
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const tokens = await refreshToken(currentRefreshToken);
        const rememberMe =
          typeof localStorage !== "undefined"
            ? localStorage.getItem("momshell_remember_me") === "true"
            : false;
        saveTokens(tokens, rememberMe);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${tokens.access_token}`;
        }

        processQueue(null, tokens.access_token);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        clearTokens();
        // Redirect to login if in browser and token refresh failed
        if (typeof window !== "undefined") {
          window.location.href = "/auth/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;

// Helper function to extract error message
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{
      detail?: string | { message?: string };
    }>;
    const detail = axiosError.response?.data?.detail;
    if (typeof detail === "string") {
      return detail;
    }
    if (detail && typeof detail === "object" && "message" in detail) {
      return detail.message || "请求失败";
    }
    return axiosError.message || "请求失败";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "未知错误";
}
