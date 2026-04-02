import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { AuthUser } from "@/types";

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;

  // Actions
  setAuth: (user: AuthUser, token: string) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<AuthUser>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken) =>
        set({ user, accessToken, isAuthenticated: true }),

      setAccessToken: (accessToken) =>
        set({ accessToken }),

      logout: () =>
        set({ user: null, accessToken: null, isAuthenticated: false }),

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name: "invoiceai-auth",
      storage: createJSONStorage(() => sessionStorage),
      // Only persist user data — token is kept in memory for security
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
