import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import {
  type User,
  type LoginParams,
  type RegisterParams,
  apiLogin,
  apiRegister,
  apiGetMe,
  apiRefresh,
  apiSetRole,
  apiLogout,
  apiCompleteTutorial,
} from "@/lib/auth";
import { setAccessToken, setOnTokenRefreshed } from "@/lib/apiClient";

export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(null);
  const accessToken = ref<string | null>(null);
  const isLoading = ref(true);
  const isGuest = ref(false);

  const isAuthenticated = computed(() => !!user.value && !!accessToken.value);

  // Keep apiClient's in-memory token in sync with the store
  watch(accessToken, (token) => {
    setAccessToken(token);
  });

  // Keep store in sync when apiClient refreshes the token via interceptor
  setOnTokenRefreshed((token) => {
    accessToken.value = token;
    if (!token) {
      user.value = null;
    }
  });

  async function init() {
    // Try to restore session via httpOnly refresh cookie
    const refreshed = await refreshAuth();
    if (!refreshed) {
      user.value = null;
      accessToken.value = null;
    }
    isLoading.value = false;
  }

  async function login(params: LoginParams) {
    const resp = await apiLogin(params);
    accessToken.value = resp.access_token;
    const userInfo = await apiGetMe(resp.access_token);
    user.value = userInfo;
    isGuest.value = false;
  }

  async function register(params: RegisterParams): Promise<User> {
    const newUser = await apiRegister(params);
    // Auto-login after successful registration
    await login({ login: params.username, password: params.password });
    return newUser;
  }

  async function setRole(role: "mom" | "dad") {
    if (!accessToken.value) throw new Error("Not authenticated");
    const updatedUser = await apiSetRole(accessToken.value, role);
    user.value = updatedUser;
  }

  function logout() {
    // The /logout endpoint requires authentication, so only call the server
    // when we have a token. The server clears the httpOnly refresh cookie.
    if (accessToken.value) {
      apiLogout(accessToken.value).catch(() => {});
    }
    user.value = null;
    accessToken.value = null;
    isGuest.value = false;
  }

  function enterGuestMode() {
    isGuest.value = true;
  }

  async function refreshAuth(): Promise<boolean> {
    try {
      // Refresh token is sent automatically via httpOnly cookie
      const resp = await apiRefresh();
      accessToken.value = resp.access_token;
      const userInfo = await apiGetMe(resp.access_token);
      user.value = userInfo;
      return true;
    } catch {
      user.value = null;
      accessToken.value = null;
      return false;
    }
  }

  async function completeTutorial() {
    if (!accessToken.value || !user.value) return;
    try {
      await apiCompleteTutorial(accessToken.value);
      user.value = { ...user.value, tutorial_completed: true };
    } catch {
      // Silently fail — tutorial state is not critical
    }
  }

  return {
    user,
    accessToken,
    isLoading,
    isGuest,
    isAuthenticated,
    init,
    login,
    register,
    setRole,
    logout,
    enterGuestMode,
    refreshAuth,
    completeTutorial,
  };
});
