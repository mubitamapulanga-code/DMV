"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, User } from '@/store/authStore';

// ─── Types ───────────────────────────────────────────────────────────────────
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, accessToken, refreshToken, isAuthenticated, setAuth, setAccessToken, clearAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  // On mount: hydration is handled by Zustand persist, just mark loading done
  useEffect(() => {
    setIsLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data?.detail || data?.non_field_errors?.[0] || 'Invalid credentials. Please try again.';
        return { success: false, error: msg };
      }

      const { access, refresh, user: userData } = data;
      setAuth(userData, access, refresh);
      return { success: true };
    } catch {
      return { success: false, error: 'Network error. Please check the server is running.' };
    }
  }, [setAuth]);

  const logout = useCallback(async () => {
    if (refreshToken && accessToken) {
      try {
        await fetch(`${API_BASE}/auth/logout/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ refresh: refreshToken }),
        });
      } catch {}
    }

    clearAuth();
    router.push('/login');
  }, [refreshToken, accessToken, clearAuth, router]);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${API_BASE}/auth/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (!res.ok) {
        clearAuth();
        return false;
      }

      const { access } = await res.json();
      setAccessToken(access);
      return true;
    } catch {
      return false;
    }
  }, [refreshToken, clearAuth, setAccessToken]);

  return (
    <AuthContext.Provider value={{
      user,
      accessToken,
      refreshToken,
      isAuthenticated,
      isLoading,
      login,
      logout,
      refreshSession,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export type { User };
