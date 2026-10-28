import { useState, useEffect, useCallback } from "react";
import { api, extractError } from "@/lib/api";
import { AuthUser, AiTone, Currency } from "@/types";
import { useAuthStore } from "@/store/authStore";

// ─── Payload types (mirror backend PATCH /account schema) ─────────────────────

export interface UpdateAccountPayload {
  name?: string;
  bizName?: string;
  bizAddress?: string;
  bizPhone?: string;
  bizWebsite?: string;
  /** Public image URL; "" removes the logo */
  logoUrl?: string;
  currency?: Currency;
  aiTone?: AiTone;
  readReceipts?: boolean;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

// ─── useAccount hook ───────────────────────────────────────────────────────────

interface UseAccountReturn {
  account: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAccount(): UseAccountReturn {
  const [account, setAccount] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const updateUser = useAuthStore((s) => s.updateUser);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Backend returns the user object directly (no data wrapper)
      const { data } = await api.get<AuthUser>("/account");
      setAccount(data);
      // Keep store in sync
      updateUser(data);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setIsLoading(false);
    }
  }, [updateUser]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { account, isLoading, error, refetch: fetch };
}

// ─── Mutation API helpers ──────────────────────────────────────────────────────

export const accountApi = {
  update: async (payload: UpdateAccountPayload): Promise<AuthUser> => {
    const { data } = await api.patch<AuthUser>("/account", payload);
    return data;
  },

  changePassword: async (payload: ChangePasswordPayload): Promise<void> => {
    await api.patch("/account/password", payload);
  },
};
