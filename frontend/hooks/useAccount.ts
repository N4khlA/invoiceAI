import { useState, useEffect, useCallback } from "react";
import { api, extractError } from "@/lib/api";
import { AuthUser, AiTone, Currency } from "@/types";
import { useAuthStore } from "@/store/authStore";

// ─── Payload types (mirror backend PATCH /account schema) ─────────────────────

export interface UpdateBusinessDetailsPayload {
  bizName: string;
  bizAddress: string;
  currency: Currency;
  /** Optional public URL of the business logo */
  logoUrl?: string;
}

export interface UpdatePreferencesPayload {
  aiTone: AiTone;
  readReceipts: boolean;
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
  // PATCH /account — strict backend schema: bizName/bizAddress/logoUrl/
  // currency/aiTone/readReceipts only. The logo is a URL (no upload endpoint).
  updateBusiness: async (
    payload: UpdateBusinessDetailsPayload
  ): Promise<AuthUser> => {
    const { data } = await api.patch<AuthUser>("/account", {
      bizName: payload.bizName,
      bizAddress: payload.bizAddress,
      currency: payload.currency,
      ...(payload.logoUrl ? { logoUrl: payload.logoUrl } : {}),
    });
    return data;
  },

  updatePreferences: async (
    payload: UpdatePreferencesPayload
  ): Promise<AuthUser> => {
    const { data } = await api.patch<AuthUser>("/account", payload);
    return data;
  },

  changePassword: async (payload: ChangePasswordPayload): Promise<void> => {
    await api.patch("/account/password", payload);
  },
};
