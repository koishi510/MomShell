import { defineStore } from "pinia";
import { ref, computed } from "vue";
import {
  type User,
  type LoginParams,
  type RegisterParams,
  apiLogin,
  apiRegister,
  apiGetMe,
  apiRefresh,
  apiSetRole,
  saveTokens,
  getAccessToken,
  getRefreshToken,
  clearTokens,
} from "@/lib/auth";

export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(null);
  const accessToken = ref<string | null>(null);
  const isLoading = ref(true);
  const isGuest = ref(false);

  const isAuthenticated = computed(() => !!user.value && !!accessToken.value);

  async function init() {
    const storedToken = getAccessToken();
    if (storedToken) {
      try {
        const userInfo = await apiGetMe(storedToken);
        user.value = userInfo;
        accessToken.value = storedToken;
      } catch {
        const refreshed = await refreshAuth();
        if (!refreshed) clearTokens();
      }
    }
    isLoading.value = false;
  }

  async function login(params: LoginParams, rememberMe = true) {
    const tokens = await apiLogin(params);
    saveTokens(tokens, rememberMe);
    accessToken.value = tokens.access_token;
    const userInfo = await apiGetMe(tokens.access_token);
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
    clearTokens();
    user.value = null;
    accessToken.value = null;
    isGuest.value = false;
  }

  function enterGuestMode() {
    isGuest.value = true;
  }

  async function refreshAuth(): Promise<boolean> {
    const currentRefreshToken = getRefreshToken();
    if (!currentRefreshToken) return false;

    try {
      const tokens = await apiRefresh(currentRefreshToken);
      const rememberMe =
        localStorage.getItem("momshell_remember_me") === "true";
      saveTokens(tokens, rememberMe);
      accessToken.value = tokens.access_token;
      const userInfo = await apiGetMe(tokens.access_token);
      user.value = userInfo;
      return true;
    } catch {
      clearTokens();
      user.value = null;
      accessToken.value = null;
      return false;
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
  };
});
