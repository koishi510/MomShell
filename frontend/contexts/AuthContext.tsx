'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import {
  User,
  TokenResponse,
  login as apiLogin,
  register as apiRegister,
  getCurrentUser,
  refreshToken,
  saveTokens,
  getAccessToken,
  getRefreshToken,
  clearTokens,
  LoginParams,
  RegisterParams,
} from '../lib/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  accessToken: string | null;
  isGuestMode: boolean;
  selectedIdentity: 'mom' | 'partner' | null;
  login: (params: LoginParams, rememberMe: boolean) => Promise<void>;
  register: (params: RegisterParams) => Promise<User>;
  logout: () => void;
  refreshAuth: () => Promise<boolean>;
  setGuestMode: (identity: 'mom' | 'partner') => void;
  clearGuestMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Helper to initialize guest mode from sessionStorage
function getInitialGuestState() {
  if (typeof window === 'undefined') return { isGuest: false, identity: null };
  const guestMode = sessionStorage.getItem('momshell_guest_mode') === 'true';
  const identity = sessionStorage.getItem('momshell_selected_identity') as 'mom' | 'partner' | null;
  return guestMode && identity ? { isGuest: true, identity } : { isGuest: false, identity: null };
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuestMode, setIsGuestMode] = useState(() => getInitialGuestState().isGuest);
  const [selectedIdentity, setSelectedIdentity] = useState<'mom' | 'partner' | null>(
    () => getInitialGuestState().identity
  );

  const isAuthenticated = !!user && !!accessToken;

  // Refresh auth tokens
  const refreshAuth = useCallback(async (): Promise<boolean> => {
    const currentRefreshToken = getRefreshToken();
    if (!currentRefreshToken) {
      return false;
    }

    try {
      const tokens = await refreshToken(currentRefreshToken);
      const rememberMe = localStorage.getItem('momshell_remember_me') === 'true';
      saveTokens(tokens, rememberMe);
      setAccessToken(tokens.access_token);

      // Fetch updated user info
      const userInfo = await getCurrentUser(tokens.access_token);
      setUser(userInfo);
      return true;
    } catch {
      clearTokens();
      setUser(null);
      setAccessToken(null);
      return false;
    }
  }, []);

  // Initialize auth state from storage
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = getAccessToken();
      if (storedToken) {
        try {
          const userInfo = await getCurrentUser(storedToken);
          setUser(userInfo);
          setAccessToken(storedToken);
        } catch {
          // Token might be expired, try refresh
          const refreshed = await refreshAuth();
          if (!refreshed) {
            clearTokens();
          }
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, [refreshAuth]);

  // Login function
  const login = useCallback(async (params: LoginParams, rememberMe: boolean) => {
    const tokens = await apiLogin(params);
    saveTokens(tokens, rememberMe);
    setAccessToken(tokens.access_token);

    const userInfo = await getCurrentUser(tokens.access_token);
    setUser(userInfo);
  }, []);

  // Register function
  const register = useCallback(async (params: RegisterParams): Promise<User> => {
    return await apiRegister(params);
  }, []);

  // Logout function
  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    setAccessToken(null);
    setIsGuestMode(false);
    setSelectedIdentity(null);
  }, []);

  // Guest mode functions
  const setGuestMode = useCallback((identity: 'mom' | 'partner') => {
    setIsGuestMode(true);
    setSelectedIdentity(identity);
    // Store in session for page refresh persistence
    sessionStorage.setItem('momshell_guest_mode', 'true');
    sessionStorage.setItem('momshell_selected_identity', identity);
  }, []);

  const clearGuestMode = useCallback(() => {
    setIsGuestMode(false);
    setSelectedIdentity(null);
    sessionStorage.removeItem('momshell_guest_mode');
    sessionStorage.removeItem('momshell_selected_identity');
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    accessToken,
    isGuestMode,
    selectedIdentity,
    login,
    register,
    logout,
    refreshAuth,
    setGuestMode,
    clearGuestMode,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
