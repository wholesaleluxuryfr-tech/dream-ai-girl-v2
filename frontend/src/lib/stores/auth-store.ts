/**
 * Authentication Store (Zustand)
 *
 * Manages authentication state and user session
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, LoginRequest, RegisterRequest } from '@/types';
import apiClient from '../api-client';

interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  clearError: () => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Login action
      login: async (credentials) => {
        set({ isLoading: true, error: null });

        try {
          const response = await apiClient.login(credentials);
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: error.message || 'Login failed',
          });
          throw error;
        }
      },

      // Register action
      register: async (data) => {
        set({ isLoading: true, error: null });

        try {
          const response = await apiClient.register(data);
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: error.message || 'Registration failed',
          });
          throw error;
        }
      },

      // Logout action
      logout: async () => {
        try {
          await apiClient.logout();
        } finally {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      // Load current user (on app start)
      loadUser: async () => {
        set({ isLoading: true });

        try {
          const user = await apiClient.getCurrentUser();
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          // Token invalid or expired
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null, // Don't show error on app load
          });
        }
      },

      // Clear error
      clearError: () => set({ error: null }),

      // Update user (optimistic update)
      updateUser: (updates) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...updates } });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
